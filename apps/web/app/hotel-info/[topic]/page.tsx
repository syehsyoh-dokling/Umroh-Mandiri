"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Building2, FileQuestion, ReceiptText } from "lucide-react";

import { ModuleShell } from "@/components/site/module-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const topics = {
  nusuk: {
    title: "Daftar Hotel NUSUK",
    icon: Building2,
    description:
      "Halaman ini disiapkan untuk menampilkan daftar dan panduan hotel yang sudah terdaftar atau bisa diproses melalui NUSUK.",
    body:
      "Konten detail akan diisi pada tahap berikutnya. Untuk sementara, gunakan halaman Pesan Hotel Mandiri untuk mencari hotel dan simpan pilihan hotel ke kalkulator.",
  },
  "non-nusuk": {
    title: "Daftar Hotel Non-NUSUK",
    icon: FileQuestion,
    description:
      "Halaman ini disiapkan untuk membantu jamaah memahami hotel yang belum masuk NUSUK, termasuk risiko administrasi dan approval.",
    body:
      "Tidak semua hotel di aplikasi pemesanan umum sudah terhubung dengan NUSUK. Data dan daftar hotel non-NUSUK akan kita lengkapi setelah modul hotel selesai dirapikan.",
  },
  "brn-fee": {
    title: "BRN Fee",
    icon: ReceiptText,
    description:
      "Halaman ini disiapkan untuk menjelaskan biaya BRN yang mungkin diminta provider visa atau muasasah bila hotel belum terdaftar di NUSUK.",
    body:
      "BRN Fee bersifat administratif dan bergantung pada provider atau muasasah. Detail nominal, skenario, dan panduan verifikasi akan kita isi pada tahap berikutnya.",
  },
};

export default function HotelInfoPage() {
  const params = useParams<{ topic?: string }>();
  const topic = useMemo(() => topics[params.topic as keyof typeof topics] || topics.nusuk, [params.topic]);
  const Icon = topic.icon;

  return (
    <ModuleShell
      eyebrow="Informasi Hotel"
      title={topic.title}
      description={topic.description}
      backHref="/hotel"
      backLabel="Kembali ke Hotel"
      showCalculatorCart
    >
      <section className="mt-4">
        <Card className="rounded-[26px] p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(214,177,110,0.16)] text-[var(--primary)]">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="font-[family-name:var(--font-display)] text-[2rem]">{topic.title}</CardTitle>
              <CardDescription className="mt-3 text-base leading-8 text-[var(--muted-strong)]">
                {topic.body}
              </CardDescription>
            </div>
          </div>
        </Card>
      </section>
    </ModuleShell>
  );
}
