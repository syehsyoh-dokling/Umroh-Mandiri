"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckSquare2, MessageCircle, Send, X } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiUrl } from "@/lib/config";
import { useCalculatorDraft } from "@/lib/umroh-calculator-state";
import { formatRupiah } from "@/lib/travel-pricing";

type NarrativeItem = {
  id: number;
  judul: string;
  penjelasan: string;
};

type FaqItem = {
  id: number;
  pertanyaan: string;
  jawaban?: string;
};

const requirements = [
  "Paspor berlaku lebih dari 6 bulan, foto latar putih, tiket PP, dan bukti hotel.",
  "Sertifikat vaksin internasional sesuai aturan terbaru.",
  "Usia minimal 18 tahun jika berangkat sendiri.",
  "Nama di paspor minimal dua suku kata.",
];

const kebutuhanOptions = ["Visa Saja", "Visa + Siskopatuh", "Siskopatuh Saja", "Visa Plus+"] as const;

const priceMap: Record<(typeof kebutuhanOptions)[number], number> = {
  "Visa Saja": 3200000,
  "Visa + Siskopatuh": 3500000,
  "Siskopatuh Saja": 300000,
  "Visa Plus+": 6000000,
};

const embarkationAirports = [
  "CGK — Soekarno-Hatta (Jakarta)",
  "SUB — Juanda (Surabaya)",
  "KNO — Kualanamu (Medan)",
  "UPG — Sultan Hasanuddin (Makassar)",
  "PDG — Minangkabau (Padang)",
  "PKU — Sultan Syarif Kasim II (Pekanbaru)",
  "BTJ — Sultan Iskandar Muda (Banda Aceh)",
  "PLM — Sultan Mahmud Badaruddin II (Palembang)",
  "SOC — Adi Soemarmo (Solo)",
  "BTH — Hang Nadim (Batam)",
  "KJT — Kertajati (Majalengka)",
];

function getMinDepartDate() {
  const now = new Date();
  now.setDate(now.getDate() + 7);
  return now.toISOString().slice(0, 10);
}

function readAuthMeta() {
  if (typeof window === "undefined") return { sid: "", ip: "", lokasi: "" };
  try {
    const authMeta = JSON.parse(window.localStorage.getItem("auth_meta") || "{}");
    return {
      sid: authMeta.sid || window.localStorage.getItem("sid") || "",
      ip: authMeta.ip || "",
      lokasi: authMeta.location || authMeta.lokasi || "",
    };
  } catch {
    return { sid: "", ip: "", lokasi: "" };
  }
}

export default function VisaPage() {
  const { draft, setDraft } = useCalculatorDraft();

  const [visaTypes, setVisaTypes] = useState<NarrativeItem[]>([]);
  const [siskopatuhItems, setSiskopatuhItems] = useState<NarrativeItem[]>([]);
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [selectedVisaId, setSelectedVisaId] = useState("");
  const [selectedSiskopatuhId, setSelectedSiskopatuhId] = useState("");
  const [selectedFaqId, setSelectedFaqId] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [applyForm, setApplyForm] = useState({
    tanggal_berangkat: getMinDepartDate(),
    bandara_asal: embarkationAirports[0],
    kebutuhan: "Visa Saja" as (typeof kebutuhanOptions)[number],
    jenis_visa: "Visa Umroh",
    tgl_jemput: "",
    bandara_jemput: "",
    tgl_antar: "",
    bandara_antar: "",
    email: "",
    wa: "",
    nama: "",
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(apiUrl("/legacy-pricing/visa-types")).then((res) => res.json()),
      fetch(apiUrl("/legacy-pricing/siskopatuh")).then((res) => res.json()),
      fetch(apiUrl("/legacy-pricing/faq?menu=visa")).then((res) => res.json()).catch(() => []),
    ])
      .then(([visaData, siskoData, faqData]) => {
        if (cancelled) return;

        const visaRows = Array.isArray(visaData.data) ? visaData.data : [];
        const siskoRows = Array.isArray(siskoData.data) ? siskoData.data : [];
        const faqRows = Array.isArray(faqData) ? faqData : Array.isArray(faqData.data) ? faqData.data : [];

        setVisaTypes(visaRows);
        setSiskopatuhItems(siskoRows);
        setFaqItems(faqRows);

        const activeVisa = draft.visa?.visaType
          ? visaRows.find((item: NarrativeItem) => item.judul === draft.visa?.visaType)
          : null;
        if (activeVisa) {
          setSelectedVisaId(String(activeVisa.id));
          setKeterangan(activeVisa.penjelasan);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data legacy visa.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft.visa?.visaType]);

  const selectedVisa = useMemo(
    () => visaTypes.find((item) => String(item.id) === selectedVisaId) || null,
    [selectedVisaId, visaTypes]
  );
  const selectedSiskopatuh = useMemo(
    () => siskopatuhItems.find((item) => String(item.id) === selectedSiskopatuhId) || null,
    [selectedSiskopatuhId, siskopatuhItems]
  );
  const selectedPrice = priceMap[applyForm.kebutuhan] || 0;

  useEffect(() => {
    if (draft.visa) return;
    setApplyForm((current) => ({
      ...current,
      email: current.email || "",
      wa: current.wa || "",
      nama: current.nama || "",
    }));
  }, [draft.visa]);

  const handleNarrativeChange = (type: "visa" | "siskopatuh", nextId: string) => {
    if (type === "visa") {
      setSelectedVisaId(nextId);
      setSelectedSiskopatuhId("");
      const next = visaTypes.find((item) => String(item.id) === nextId);
      setKeterangan(next?.penjelasan || "");
      if (next) {
        setDraft((current) => ({
          ...current,
          visa: {
            visaType: next.judul,
            description: next.penjelasan,
            totalPrice: current.visa?.totalPrice || priceMap["Visa Saja"],
            source: "legacy-visa-types",
          },
        }));
      }
    } else {
      setSelectedSiskopatuhId(nextId);
      setSelectedVisaId("");
      const next = siskopatuhItems.find((item) => String(item.id) === nextId);
      setKeterangan(next?.penjelasan || "");
    }
  };

  const handleFaqChange = async (nextId: string) => {
    setSelectedFaqId(nextId);
    const next = faqItems.find((item) => String(item.id) === nextId);
    if (!next) return;
    setKeterangan(`${next.pertanyaan}\n\n${next.jawaban || "Jawaban tidak tersedia."}`);

    try {
      const { sid } = readAuthMeta();
      await fetch(apiUrl("/legacy-pricing/faq-usage"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faq_id: next.id, menu: "visa", sid }),
      });
    } catch {}
  };

  const openModal = () => {
    setSubmitMessage("");
    setSubmitError("");
    setShowApplyModal(true);
  };

  const submitVisaApplication = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage("");
    setSubmitError("");

    try {
      const { sid, ip, lokasi } = readAuthMeta();

      const payload = {
        ...applyForm,
        harga: selectedPrice,
        sid,
        ip,
        lokasi,
        notify_email: "banisamaju@gmail.com",
      };

      const res = await fetch(apiUrl("/legacy-pricing/visa-application"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || data.detail || "Gagal mengirim pengajuan visa.");
      }

      setDraft((current) => ({
        ...current,
        visa: {
          visaType:
            applyForm.kebutuhan === "Visa Saja"
              ? applyForm.jenis_visa
              : applyForm.kebutuhan,
          description: keterangan || selectedVisa?.penjelasan || selectedSiskopatuh?.penjelasan || "",
          totalPrice: selectedPrice,
          source: "legacy-ajukan-visa",
        },
      }));

      setSubmitMessage(data.message || "Pengajuan visa berhasil dikirim.");
      setTimeout(() => setShowApplyModal(false), 1200);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Gagal mengirim pengajuan visa.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModuleShell
      eyebrow="Komponen Kalkulator"
      title="Visa & Siskopatuh"
      description="Semua field utama legacy dipertahankan: jenis visa, siskopatuh, keterangan, pertanyaan favorite, area tanya, lalu popup pengajuan visa dengan harga sesuai kebutuhan."
      backHref="/kalkulator"
      backLabel="Kembali ke Kalkulator"
      showCalculatorCart
    >
      <section className="-mt-14 grid gap-4 sm:-mt-16 lg:grid-cols-[minmax(0,1.45fr)_360px]">
        <div className="space-y-4">
          <Card className="rounded-[24px] p-5 sm:p-6">
            <div className="text-center">
              <CardTitle className="font-[family-name:var(--font-display)] text-[2.1rem]">VISA &amp; SISKOPATUH</CardTitle>
              <CardDescription className="mt-2 text-sm leading-7 text-[var(--muted-strong)]">
                Bapak/Ibu <span className="font-semibold text-[var(--foreground)]">Jamaah</span>, jika Anda sudah memiliki salah satu visa berikut, Anda bisa berangkat umroh mandiri.
              </CardDescription>
            </div>

            <div className="mt-6 rounded-[20px] border border-[rgba(196,170,126,0.16)] bg-white/82 p-5">
              <div className="flex items-center gap-2 text-[var(--foreground)]">
                <CheckSquare2 className="h-5 w-5 text-[var(--primary)]" />
                <p className="font-semibold">Persyaratan Umum Visa ke Arab Saudi</p>
              </div>
              <ul className="mt-4 space-y-2 pl-5 text-sm leading-7 text-[var(--muted-strong)]">
                {requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Jenis-jenis Visa Arab Saudi</label>
                <Select value={selectedVisaId} onChange={(event) => handleNarrativeChange("visa", event.target.value)}>
                  <option value="">{loading ? "Memuat data..." : "Pilih jenis visa"}</option>
                  {visaTypes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.judul}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Siskopatuh</label>
                <Select value={selectedSiskopatuhId} onChange={(event) => handleNarrativeChange("siskopatuh", event.target.value)}>
                  <option value="">{loading ? "Memuat data..." : "Pilih pertanyaan siskopatuh"}</option>
                  {siskopatuhItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.judul}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Keterangan</label>
                <textarea
                  value={keterangan}
                  readOnly
                  placeholder="Keterangan pilihan Anda akan muncul di sini..."
                  className="min-h-[140px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Pertanyaan Favorite</label>
                <Select value={selectedFaqId} onChange={(event) => void handleFaqChange(event.target.value)}>
                  <option value="">{loading ? "Memuat pertanyaan..." : "Pilih pertanyaan favorite"}</option>
                  {faqItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.pertanyaan}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Silakan tanya apa pun di sini</label>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Tulis pertanyaan Anda..."
                  className="min-h-[120px] w-full rounded-[22px] border border-[color:var(--line)] bg-white/82 px-4 py-4 text-sm text-[var(--foreground)] outline-none"
                />
                <p className="text-xs text-[var(--muted-strong)]">
                  Area ini saya pertahankan sebagai field legacy. Jawaban GPT-nya akan kita sambungkan setelah modul konsultasi dipoles khusus.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="secondary" onClick={openModal}>
                  <Send className="h-4 w-4" />
                  Ajukan Visa
                </Button>
                <Link href="https://wa.me/628126989485?text=Assalamu%27alaikum%2C%20saya%20ingin%20konsultasi%20visa%20umrah." target="_blank">
                  <Button variant="primary" className="w-full">
                    <MessageCircle className="h-4 w-4" />
                    Kontak Komunitas
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-[24px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Visa aktif</p>
            <CardTitle className="mt-3 font-[family-name:var(--font-display)] text-[1.8rem]">
              {draft.visa?.visaType || "Belum ada visa"}
            </CardTitle>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
              {draft.visa?.description || "Pilih jenis visa, siskopatuh, atau langsung ajukan visa melalui popup form."}
            </p>
            <p className="mt-4 text-xl font-black text-[var(--foreground)]">{formatRupiah(draft.visa?.totalPrice || 0)}</p>
          </Card>

          <Card className="rounded-[24px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Navigasi cepat</p>
            <div className="mt-4 grid gap-3">
              <Link href="/menu">
                <Button variant="ghost" className="w-full justify-start">
                  Beranda
                </Button>
              </Link>
              <Link href="/kalkulator">
                <Button variant="secondary" className="w-full justify-start">
                  Kalkulator Umroh
                </Button>
              </Link>
              <Link href="/hotel">
                <Button variant="ghost" className="w-full justify-start">
                  Cari Hotel
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {showApplyModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(15,18,22,0.56)] px-3 py-6">
          <Card className="max-h-[90vh] w-full max-w-[760px] overflow-auto rounded-[28px] p-0">
            <div className="sticky top-0 flex items-center justify-between border-b border-[rgba(196,170,126,0.16)] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Popup legacy</p>
                <h3 className="mt-2 font-[family-name:var(--font-display)] text-[1.8rem] text-[var(--foreground)]">Ajukan Visa</h3>
              </div>
              <button type="button" className="rounded-full bg-[rgba(27,89,81,0.08)] p-2" onClick={() => setShowApplyModal(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitVisaApplication} className="space-y-4 px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Rencana tanggal berangkat</label>
                  <Input
                    type="date"
                    min={getMinDepartDate()}
                    value={applyForm.tanggal_berangkat}
                    onChange={(event) => setApplyForm((current) => ({ ...current, tanggal_berangkat: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Bandara asal</label>
                  <Select
                    value={applyForm.bandara_asal}
                    onChange={(event) => setApplyForm((current) => ({ ...current, bandara_asal: event.target.value }))}
                  >
                    {embarkationAirports.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Kebutuhan</label>
                <Select
                  value={applyForm.kebutuhan}
                  onChange={(event) =>
                    setApplyForm((current) => ({
                      ...current,
                      kebutuhan: event.target.value as (typeof kebutuhanOptions)[number],
                    }))
                  }
                >
                  {kebutuhanOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </div>

              {applyForm.kebutuhan === "Visa Saja" ? (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Jenis visa</label>
                  <Select
                    value={applyForm.jenis_visa}
                    onChange={(event) => setApplyForm((current) => ({ ...current, jenis_visa: event.target.value }))}
                  >
                    <option value="Visa Umroh">Visa Umroh</option>
                    <option value="Visa Turis">Visa Turis</option>
                    <option value="Visa Kunjungan Keluarga/Personal">Visa Kunjungan Keluarga/Personal</option>
                    <option value="Visa Bisnis">Visa Bisnis</option>
                  </Select>
                </div>
              ) : null}

              {applyForm.kebutuhan === "Visa Plus+" ? (
                <div className="grid gap-4 rounded-[22px] border border-[rgba(196,170,126,0.16)] bg-[rgba(255,248,236,0.72)] p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal jemput</label>
                    <Input type="date" value={applyForm.tgl_jemput} onChange={(event) => setApplyForm((current) => ({ ...current, tgl_jemput: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--muted-strong)]">Bandara jemput</label>
                    <Select value={applyForm.bandara_jemput} onChange={(event) => setApplyForm((current) => ({ ...current, bandara_jemput: event.target.value }))}>
                      <option value="">Pilih bandara</option>
                      <option value="JED">JED — Jeddah</option>
                      <option value="MED">MED — Madinah</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--muted-strong)]">Tanggal antar kembali</label>
                    <Input type="date" value={applyForm.tgl_antar} onChange={(event) => setApplyForm((current) => ({ ...current, tgl_antar: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[var(--muted-strong)]">Bandara antar kembali</label>
                    <Select value={applyForm.bandara_antar} onChange={(event) => setApplyForm((current) => ({ ...current, bandara_antar: event.target.value }))}>
                      <option value="">Pilih bandara</option>
                      <option value="JED">JED — Jeddah</option>
                      <option value="MED">MED — Madinah</option>
                    </Select>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Email</label>
                  <Input
                    type="email"
                    value={applyForm.email}
                    onChange={(event) => setApplyForm((current) => ({ ...current, email: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--muted-strong)]">Nomor WA</label>
                  <Input
                    value={applyForm.wa}
                    onChange={(event) => setApplyForm((current) => ({ ...current, wa: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Nama panggilan</label>
                <Input
                  value={applyForm.nama}
                  onChange={(event) => setApplyForm((current) => ({ ...current, nama: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--muted-strong)]">Harga</label>
                <Input readOnly value={formatRupiah(selectedPrice)} className="bg-[rgba(255,255,255,0.65)]" />
              </div>

              {submitMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{submitMessage}</div> : null}
              {submitError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div> : null}

              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowApplyModal(false)}>
                  Batal
                </Button>
                <Button type="submit" variant="secondary" disabled={submitting}>
                  {submitting ? "Mengirim..." : "Submit"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </ModuleShell>
  );
}
