import { db } from "@/config/db"
import { orders, shipments, addresses } from "@/config/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const metadata = {
	title: "Cetak Label Pengiriman | Kawan Belanja",
}

async function getOrderForPrint(orderId) {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null

	const order = await db.query.orders.findFirst({
		where: eq(orders.id, parseInt(orderId)),
		with: {
			payment: true,
			shipment: true,
			items: true,
			store: true,
		},
	})

	if (!order) return null

	// Validasi: hanya seller toko ini yang boleh cetak
	if (order.store?.userId !== session.user.id) return null
	if (!order.shipment?.awbNumber) return null

	// Ambil data alamat dari metadataLocal
	const metadata = order.payment?.metadataLocal
	const storeEntry = metadata?.stores?.find(s => s.storeId === order.storeId)
	const buyerAddress = metadata?.address || {}

	// Ambil alamat toko
	const storeAddress = await db.query.addresses.findFirst({
		where: eq(addresses.id, order.store.addressId),
	})

	return {
		order,
		shipment: order.shipment,
		storeAddress,
		buyerAddress,
		storeEntry,
		storeName: order.store.name,
	}
}

export default async function PrintLabelPage({ params }) {
	const { orderId } = await params
	const data = await getOrderForPrint(orderId)

	if (!data) {
		redirect("/seller/orders")
	}

	const { order, shipment, storeAddress, buyerAddress, storeEntry, storeName } = data

	return (
		<html>
			<head>
				<style dangerouslySetInnerHTML={{ __html: `
					@page { size: 100mm 150mm; margin: 0; }
					* { box-sizing: border-box; margin: 0; padding: 0; }
					body { font-family: 'Arial', sans-serif; background: white; color: black; width: 100mm; padding: 4mm; font-size: 9pt; }
					.label { border: 2px solid black; padding: 3mm; height: auto; }
					.header { text-align: center; border-bottom: 2px solid black; padding-bottom: 3mm; margin-bottom: 3mm; }
					.header h1 { font-size: 14pt; font-weight: bold; margin-bottom: 1mm; }
					.header .awb { font-size: 12pt; font-family: monospace; font-weight: bold; letter-spacing: 2px; margin-top: 2mm; }
					.section { margin-bottom: 3mm; padding-bottom: 3mm; border-bottom: 1px dashed #666; }
					.section:last-child { border-bottom: none; }
					.section-title { font-size: 7pt; text-transform: uppercase; font-weight: bold; color: #555; letter-spacing: 1px; margin-bottom: 1mm; }
					.name { font-size: 10pt; font-weight: bold; }
					.phone { font-size: 8pt; color: #333; }
					.address { font-size: 8pt; line-height: 1.4; }
					.items { font-size: 7.5pt; }
					.items table { width: 100%; border-collapse: collapse; }
					.items td { padding: 1mm 0; vertical-align: top; }
					.items td:last-child { text-align: right; white-space: nowrap; }
					.courier-badge { display: inline-block; padding: 1mm 3mm; border: 1px solid black; font-size: 8pt; font-weight: bold; text-transform: uppercase; }
					.footer { text-align: center; font-size: 7pt; color: #999; margin-top: 2mm; }
					@media print { body { -webkit-print-color-adjust: exact; } }
					@media screen { body { margin: 20px auto; border: 1px solid #ccc; box-shadow: 0 2px 10px rgba(0,0,0,0.1); } }
				`}} />
			</head>
			<body>
				<div className="label">
					{/* Header */}
					<div className="header">
						<h1>Kawan Belanja</h1>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2mm" }}>
							<span className="courier-badge">
								{shipment.courier?.toUpperCase()} {shipment.courierType?.toUpperCase()}
							</span>
							<span style={{ fontSize: "8pt" }}>Order #{order.id}</span>
						</div>
						<div className="awb">{shipment.awbNumber}</div>
					</div>

					{/* Pengirim */}
					<div className="section">
						<div className="section-title">Pengirim</div>
						<div className="name">{storeAddress?.recipientName || storeName}</div>
						<div className="phone">{storeAddress?.recipientPhone || "-"}</div>
						<div className="address">
							{storeAddress?.detailAddress || "-"}
							<br />
							{storeAddress?.cityName && `${storeAddress.cityName}, `}{storeAddress?.provinceName || ""}
							{storeAddress?.zipcode && ` ${storeAddress.zipcode}`}
						</div>
					</div>

					{/* Penerima */}
					<div className="section">
						<div className="section-title">Penerima</div>
						<div className="name">{buyerAddress.recipientName || "-"}</div>
						<div className="phone">{buyerAddress.recipientPhone || "-"}</div>
						<div className="address">
							{buyerAddress.detailAddress || buyerAddress.detail || "-"}
							<br />
							{buyerAddress.cityName && `${buyerAddress.cityName}, `}{buyerAddress.provinceName || ""}
							{buyerAddress.zipcode && ` ${buyerAddress.zipcode}`}
						</div>
					</div>

					{/* Daftar Barang */}
					<div className="section items">
						<div className="section-title">Isi Paket ({order.items.length} produk)</div>
						<table>
							<tbody>
								{order.items.map((item) => (
									<tr key={item.id}>
										<td>{item.productNameSnapshot} {item.variantNameSnapshot ? `(${item.variantNameSnapshot})` : ""}</td>
										<td>x{item.quantity}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Catatan */}
					{(storeEntry?.notes || order.notes) && (
						<div className="section">
							<div className="section-title">Catatan</div>
							<div className="address">{storeEntry?.notes || order.notes}</div>
						</div>
					)}

					<div className="footer">
						Dicetak pada {new Date().toLocaleString("id-ID")} — Kawan Belanja
					</div>
				</div>

				{/* Auto-print saat halaman dibuka */}
				<script dangerouslySetInnerHTML={{ __html: `
					window.onload = function() { window.print(); }
				`}} />
			</body>
		</html>
	)
}
