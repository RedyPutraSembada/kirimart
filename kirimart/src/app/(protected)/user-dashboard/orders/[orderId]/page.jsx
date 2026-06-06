import { OrderDetail } from "@/features/user-dashboard/orders/order-detail"

export const metadata = {
	title: "Detail Pesanan | Kawan Belanja",
}

export default async function OrderDetailPage({ params }) {
	const { orderId } = await params
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold tracking-tight">Detail Pesanan</h2>
				<p className="text-muted-foreground">Lacak resi dan lihat rincian pesanan Anda.</p>
			</div>
			
			<OrderDetail orderId={orderId} />
		</div>
	)
}
