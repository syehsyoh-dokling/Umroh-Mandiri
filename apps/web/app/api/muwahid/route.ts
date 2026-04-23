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
const krbSearchStopwords = new Set([
  "apa",
  "adalah",
  "agar",
  "akan",
  "atau",
  "bagaimana",
  "bagi",
  "bila",
  "dalam",
  "dengan",
  "dan",
  "dari",
  "di",
  "dia",
  "itu",
  "jadi",
  "jika",
  "juga",
  "ke",
  "kamu",
  "karena",
  "kapan",
  "kalo",
  "kalau",
  "kami",
  "kapan",
  "kapan",
  "karena",
  "kita",
  "maka",
  "mana",
  "mari",
  "masih",
  "menurut",
  "mohon",
  "nah",
  "para",
  "pada",
  "pun",
  "saja",
  "sambil",
  "siapa",
  "sudah",
  "supaya",
  "tanpa",
  "tentang",
  "terhadap",
  "untuk",
  "yang",
  "jelaskan",
  "ringkas",
  "singkat",
  "sumber",
  "kb",
  "krb",
]);

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
  const cleanedQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !krbSearchStopwords.has(word))
    .slice(0, 10)
    .join(" ");

  const queries = Array.from(new Set([query, cleanedQuery].filter((item) => item.trim().length > 0)));
  const allResults: Array<{
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
  }> = [];
  const seenLinks = new Set<string>();

  for (const candidateQuery of queries) {
    const response = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Goog-User-Project": vertexSearchProjectId,
      },
      body: JSON.stringify({
        query: candidateQuery,
        pageSize: 5,
        contentSearchSpec: {
          snippetSpec: {
            returnSnippet: true,
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
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

    for (const result of payload.results ?? []) {
      const link = result.document?.derivedStructData?.link ?? "";
      const dedupeKey = link || result.document?.derivedStructData?.title || JSON.stringify(result);
      if (seenLinks.has(dedupeKey)) {
        continue;
      }
      seenLinks.add(dedupeKey);
      allResults.push(result);
    }

    if (allResults.length >= 5) {
      break;
    }
  }

  return allResults;
}

function buildKrbPrompt(message: string, contextLines: string) {
  return [
    "Kamu akan menjawab HANYA dari konteks KRB berikut.",
    "Jika konteks tidak cukup untuk menjawab dengan yakin, kembalikan JSON persis seperti ini:",
    '{"supported":false,"answer":"","sources":[]}',
    "Jika konteks cukup, kembalikan JSON persis seperti ini:",
    '{"supported":true,"answer":"jawaban ringkas","sources":["nama kitab atau dokumen"]}',
    "Jangan tambahkan markdown, kode block, atau penjelasan di luar JSON.",
    "",
    "KONTEKS KRB:",
    contextLines,
    "",
    `PERTANYAAN: ${message}`,
  ].join("\n");
}

function tryParseAssistantJson(rawText: string) {
  const trimmed = rawText.trim();
  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");
  if (jsonStart < 0 || jsonEnd < 0 || jsonEnd <= jsonStart) {
    return null;
  }

  try {
    return JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
      supported?: boolean;
      answer?: string;
      sources?: string[];
    };
  } catch {
    return null;
  }
}

function formatWebSources(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>) {
  const groundingMetadata = response.candidates?.[0]?.groundingMetadata as
    | {
        groundingChunks?: Array<{ web?: { title?: string; uri?: string } }>;
      }
    | undefined;

  const sources = groundingMetadata?.groundingChunks
    ?.map((chunk) => {
      const title = chunk.web?.title;
      const uri = chunk.web?.uri;
      if (!title && !uri) return null;
      return title ? `${title}${uri ? ` (${uri})` : ""}` : uri ?? null;
    })
    .filter((item): item is string => Boolean(item));

  return sources ?? [];
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

    const ai = new GoogleGenAI({ apiKey });

    if (contextLines) {
      const krbResponse = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
        contents: buildKrbPrompt(message, contextLines),
        config: {
          systemInstruction: `${systemInstruction} Kamu adalah parser jawaban untuk KRB. Patuh pada format JSON yang diminta dan jangan menambah teks lain.`,
        },
      });

      const krbParsed = tryParseAssistantJson(krbResponse.text || "");
      if (krbParsed?.supported && krbParsed.answer?.trim()) {
        return NextResponse.json({
          answer: krbParsed.answer.trim(),
          sources: krbParsed.sources ?? [],
          sourceType: "krb",
        });
      }
    }

    const webResponse = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      contents: `Jawab pertanyaan berikut dengan bantuan Google Search. Jika ada sumber, sebutkan nama buku/kitab atau situsnya dengan jelas di akhir jawaban dalam bentuk daftar singkat.\n\nPertanyaan: ${message}`,
      config: {
        systemInstruction: `${systemInstruction} Jawab ringkas, akurat, dan utamakan sumber yang bisa diverifikasi. Gunakan Google Search grounding bila diperlukan.`,
        tools: [{ googleSearch: {} }],
      },
    });

    const webSources = formatWebSources(webResponse);
    return NextResponse.json({
      answer: webResponse.text || "Maaf, MUWAHID belum mendapatkan jawaban yang jelas.",
      sources: webSources,
      sourceType: "web",
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
