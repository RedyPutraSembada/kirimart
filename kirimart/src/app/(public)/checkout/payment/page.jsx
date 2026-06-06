import { PaymentMethodView } from "@/features/public/checkout/payment-method-view"

export const metadata = {
  title: "Pilih Metode Pembayaran - Kawan Belanja",
  description: "Pilih metode pembayaran untuk menyelesaikan pesanan Anda",
}

export default function PaymentMethodPage() {
  return <PaymentMethodView />
}
