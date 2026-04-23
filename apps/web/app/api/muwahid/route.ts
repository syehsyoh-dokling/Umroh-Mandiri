import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const systemInstruction = [
  "Kamu adalah MUWAHID, asisten umroh digital untuk jamaah Indonesia.",
  "Jawab dengan bahasa Indonesia yang ramah, ringkas, dan praktis.",
  "Bantu pengguna memahami persiapan umroh, estimasi kebutuhan, visa, hotel, transportasi, manasik, dan tips ibadah.",
  "Jika pertanyaan menyangkut aturan resmi, biaya, jadwal, atau regulasi terbaru, beri saran untuk verifikasi ke sumber resmi atau penyelenggara terkait.",
].join(" ");

const vertexSearchProjectId = process.env.VERTEX_SEARCH_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "umrohmandiri-677a1";
const vertexSearchLocation = process.env.VERTEX_SEARCH_LOCATION || "global";
const vertexSearchEngineId = process.env.VERTEX_SEARCH_ENGINE_ID || "krb-search";
const vertexSearchServingConfig = process.env.VERTEX_SEARCH_SERVING_CONFIG || "default_search";

async function getVertexAccessToken() {
  const metadataUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

  try {
    const response = await fetch(metadataUrl, {
      headers: {
        "Metadata-Flavor": "Google",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { access_token?: string };
    return payload.access_token ?? null;
  } catch {
    return null;
  }
}

async function searchKrbContext(query: string) {
  const accessToken = await getVertexAccessToken();
  if (!accessToken) {
    return [];
  }

  const searchUrl = `https://discoveryengine.googleapis.com/v1/projects/${vertexSearchProjectId}/locations/${vertexSearchLocation}/collections/default_collection/engines/${vertexSearchEngineId}/servingConfigs/${vertexSearchServingConfig}:search`;
  const response = await fetch(searchUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Goog-User-Project": vertexSearchProjectId,
    },
    body: JSON.stringify({
      query,
      pageSize: 3,
      contentSearchSpec: {
        snippetSpec: {
          returnSnippet: true,
        },
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as {
    results?: Array<{
      document?: {
        derivedStructData?: {
          title?: string;
          link?: string;
          snippets?: Array<{
            snippet?: string;
            snippet_status?: string;
          }>;
        };
      };
    }>;
  };

  return payload.results ?? [];
}

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

    const searchResults = await searchKrbContext(message);
    const contextLines = searchResults
      .map((result, index) => {
        const data = result.document?.derivedStructData;
        const snippet = data?.snippets?.find((item) => item.snippet && item.snippet_status !== "NO_SNIPPET_AVAILABLE")?.snippet;
        const title = data?.title || `Dokumen ${index + 1}`;
        const link = data?.link || "";
        return [`[${index + 1}] ${title}`, link ? `Sumber: ${link}` : null, snippet ? `Cuplikan: ${snippet}` : null]
          .filter(Boolean)
          .join("\n");
      })
      .filter(Boolean)
      .join("\n\n");

    const prompt = contextLines
      ? [
          "Gunakan konteks berikut dari folder KRB sebagai referensi utama. Kalau konteks tidak cukup, jawab dengan jujur dan singkat.",
          contextLines,
          "",
          `Pertanyaan: ${message}`,
        ].join("\n")
      : message;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt,
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
