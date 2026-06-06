import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="w-full pt-20 pb-10 px-6 bg-primary dark:bg-[#1A120B] text-white border-t border-white/10 dark:border-white/5 transition-colors duration-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
        <div className="md:col-span-5 space-y-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-white/20 dark:bg-white/5 p-1 border border-white/20 dark:border-white/10 backdrop-blur-md relative">
              <Image src="/images/kawanbelanja.png" alt="Logo" fill sizes="32px" className="object-contain" />
            </div>
            <div className="flex items-center gap-0">
              <span className="text-2xl font-black tracking-tighter text-white">kawan</span>
              <span className="text-2xl font-black tracking-tighter text-white/80 dark:text-white/40">belanja</span>
            </div>
          </Link>
          <p className="text-sm text-white/70 dark:text-white/40 max-w-sm leading-relaxed font-medium">
            Solusi belanja cerdas untuk semua kebutuhan Anda dengan kualitas terbaik. Kami hadir untuk memberikan pengalaman belanja yang aman dan terpercaya.
          </p>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 dark:text-white/20">Bantuan & Layanan</h4>
          <ul className="space-y-3 text-sm font-bold">
            <li><Link href="#" className="text-white/80 dark:text-white/60 hover:text-white transition-colors">Bantuan</Link></li>
            <li><Link href="#" className="text-white/80 dark:text-white/60 hover:text-white transition-colors">Metode Pembayaran</Link></li>
            <li><Link href="#" className="text-white/80 dark:text-white/60 hover:text-white transition-colors">Lacak Pesanan</Link></li>
          </ul>
        </div>

        <div className="md:col-span-3 space-y-6">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 dark:text-white/20">Tentang KawanBelanja</h4>
          <ul className="space-y-3 text-sm font-bold">
            <li><Link href="#" className="text-white/80 dark:text-white/60 hover:text-white transition-colors">Tentang Kami</Link></li>
            <li><Link href="#" className="text-white/80 dark:text-white/60 hover:text-white transition-colors">Karir</Link></li>
            <li><Link href="#" className="text-white/80 dark:text-white/60 hover:text-white transition-colors">Kebijakan Privasi</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white/50 dark:text-white/20">Ikuti Kami</h4>
          <div className="flex gap-3">
            {[
              { icon: "I", label: "Instagram" },
              { icon: "F", label: "Facebook" },
              { icon: "T", label: "Twitter" }
            ].map((social) => (
              <div key={social.label} className="h-10 w-10 rounded-full bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-center text-xs font-black hover:bg-white hover:text-primary dark:hover:bg-primary dark:hover:text-white transition-all cursor-pointer">
                {social.icon}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/10 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-bold text-white/40 dark:text-white/20 uppercase tracking-widest">
          © {new Date().getFullYear()} KawanBelanja. All rights reserved.
        </p>
        <div className="flex gap-6">
          <Link href="#" className="text-[10px] font-bold text-white/40 dark:text-white/20 hover:text-white transition-colors uppercase tracking-widest">Syarat & Ketentuan</Link>
          <Link href="#" className="text-[10px] font-bold text-white/40 dark:text-white/20 hover:text-white transition-colors uppercase tracking-widest">Kebijakan Cookie</Link>
        </div>
      </div>
    </footer>
  )
}
