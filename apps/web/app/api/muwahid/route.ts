import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const systemInstruction = [
  "Kamu adalah MUWAHID, asisten umroh digital untuk jamaah Indonesia.",
  "Jawab dengan bahasa Indonesia yang ramah, ringkas, dan praktis.",
  "Bantu pengguna memahami persiapan umroh, estimasi kebutuhan, visa, hotel, transportasi, manasik, dan tips ibadah.",
  "Jika pertanyaan menyangkut aturan resmi, biaya, jadwal, atau regulasi terbaru, beri saran untuk verifikasi ke sumber resmi atau penyelenggara terkait.",
].join(" ");

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        answer:
          "API key Gemini belum diatur. Isi GEMINI_API_KEY di file .env.local pada folder apps/web.",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ answer: "Silakan tulis pertanyaan terlebih dahulu." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: message,
      config: {
        systemInstruction,
      },
    });

    return NextResponse.json({
      answer: response.text || "Maaf, MUWAHID belum mendapatkan jawaban yang jelas.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungi Gemini.";

    return NextResponse.json(
      {
        answer: `Maaf, MUWAHID sedang belum bisa menjawab. Detail: ${message}`,
      },
      { status: 500 }
    );
  }
}
