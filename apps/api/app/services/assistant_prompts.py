from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_SYSTEM_PROMPT = (
    "Kamu adalah MUWAHID, asisten umroh digital untuk jamaah Indonesia. "
    "Jawab dengan bahasa Indonesia yang ramah, ringkas, praktis, dan hati-hati. "
    "Jika menyangkut regulasi resmi, biaya, jadwal, atau approval, ingatkan jamaah "
    "untuk verifikasi ke sumber resmi, NUSUK, provider visa, hotel, atau penyedia terkait."
)

PROMPT_TEMPLATES: dict[str, str] = {
    "general": (
        "Bantu jamaah memahami pertanyaan berikut dengan langkah yang mudah dilakukan. "
        "Berikan jawaban dalam poin pendek bila perlu."
    ),
    "hotel_evaluation": (
        "Konteks: jamaah sedang memilih hotel umroh mandiri. Evaluasi pertanyaan hotel berikut "
        "dengan memperhatikan NUSUK, kemungkinan BRN fee, jarak ke Masjidil Haram/Nabawi, akses bus, "
        "sarapan, kebijakan kamar, dan risiko approval visa. Jangan mengarang data hotel yang tidak diberikan."
    ),
    "hotel_nusuk": (
        "Jelaskan perbedaan hotel yang terdaftar di NUSUK dan yang belum terdaftar. "
        "Fokus pada dampaknya ke approval visa, koordinasi hotel, dan risiko biaya tambahan."
    ),
}


def build_prompt(message: str, module: str = "general", prompt_key: str = "general", context: dict | None = None) -> str:
    template = PROMPT_TEMPLATES.get(prompt_key) or PROMPT_TEMPLATES.get(module) or PROMPT_TEMPLATES["general"]
    context_text = ""
    if context:
        context_text = "\n\nKonteks data:\n" + json.dumps(context, ensure_ascii=False, indent=2)

    return f"{BASE_SYSTEM_PROMPT}\n\nInstruksi khusus:\n{template}{context_text}\n\nPertanyaan jamaah:\n{message}"


def ask_gemini(message: str, module: str = "general", prompt_key: str = "general", context: dict | None = None) -> dict:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    prompt = build_prompt(message=message, module=module, prompt_key=prompt_key, context=context)

    if not api_key:
        return {
            "success": False,
            "source": "fallback",
            "answer": "API key Gemini belum diatur di backend. Isi GEMINI_API_KEY atau GOOGLE_API_KEY agar asisten dapat menjawab dinamis.",
        }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.35,
            "topP": 0.9,
            "maxOutputTokens": 900,
        },
    }
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=35) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        return {
            "success": False,
            "source": "fallback",
            "answer": f"Maaf, MUWAHID belum bisa menghubungi model AI saat ini. Detail: {exc}",
        }

    candidates = data.get("candidates") or []
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    text = "\n".join(str(part.get("text", "")).strip() for part in parts if part.get("text")).strip()

    return {
        "success": True,
        "source": "gemini",
        "model": model,
        "answer": text or "Maaf, MUWAHID belum mendapatkan jawaban yang jelas.",
    }
