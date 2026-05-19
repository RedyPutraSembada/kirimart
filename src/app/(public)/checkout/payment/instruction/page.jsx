import { PaymentInstructionView } from "@/features/public/checkout/payment-instruction-view"
import { Suspense } from "react"

export const metadata = {
  title: "Instruksi Pembayaran - KiriMart",
  description: "Selesaikan pembayaran sesuai instruksi berikut",
}

export default function PaymentInstructionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Memuat instruksi pembayaran...</p>
      </div>
    }>
      <PaymentInstructionView />
    </Suspense>
  )
}
