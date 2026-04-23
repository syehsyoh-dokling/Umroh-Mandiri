import { BrandMark } from "@/components/site/brand-mark";

export function PostAuthFooter() {
  return (
    <footer className="mt-8 rounded-[24px] border border-[rgba(196,170,126,0.18)] bg-[linear-gradient(180deg,rgba(146,110,57,0.92),rgba(126,92,44,0.96))] px-4 py-5 text-[#fff6e7] shadow-[0_18px_30px_rgba(93,67,28,0.14)] sm:px-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 rounded-[12px]" />
            <div>
              <p className="font-semibold tracking-[0.14em]">MUWAHID</p>
              <p className="text-xs text-[#f3e3c6]">Asisten Umroh Digital</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-6 text-[#f8e9cf]">
            Asisten Umroh Digital untuk Jamaah Indonesia.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">Navigasi</p>
          <div className="mt-3 space-y-2 text-xs text-[#f8e9cf]">
            <p>Tentang MUWAHID</p>
            <p>Fitur Umroh</p>
            <p>Kalkulator Umroh</p>
            <p>Visa & Administrasi</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Bantuan</p>
          <div className="mt-3 space-y-2 text-xs text-[#f8e9cf]">
            <p>Pusat Bantuan</p>
            <p>Kontak Kami</p>
            <p>Kebijakan Privasi</p>
            <p>Syarat & Ketentuan</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">Mulai Sekarang</p>
          <p className="mt-3 text-xs leading-6 text-[#f8e9cf]">
            Temukan solusi umroh yang lebih mudah dan terarah.
          </p>
          <p className="mt-4 rounded-full bg-[#e3aa3f] px-5 py-2 text-center text-sm font-semibold text-[#24180a]">
            Dashboard MUWAHID
          </p>
        </div>
      </div>
    </footer>
  );
}
