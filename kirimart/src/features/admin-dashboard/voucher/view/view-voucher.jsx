"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { useGetAdminVoucherById } from "@/app/data/admin-dashboard/voucher/voucher-data"
import Image from "next/image"
import { Tag, CalendarDays } from "lucide-react"

const statusCfg = {
	active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50" },
	inactive: { label: "Nonaktif", cls: "border-gray-300 text-gray-600 bg-gray-50" },
	expired: { label: "Kedaluwarsa", cls: "border-red-300 text-red-700 bg-red-50" },
}
const DEFAULT_STATUS = { label: "Tidak Diketahui", cls: "border-gray-300 text-gray-500 bg-gray-50" }

const fmt = (n) =>
	new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

function formatDiscountDisplay(voucher) {
	if (voucher.discountType === "fixed") return fmt(voucher.discountValue)
	if (voucher.discountType === "percentage") return `${voucher.discountValue}%`
	if (voucher.discountType === "free_shipping") return "Gratis Ongkir"
	return "-"
}

function formatDate(date) {
	if (!date) return "-"
	return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

function VoucherViewSkeleton() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-40 w-full rounded-lg" />
			<Skeleton className="h-6 w-3/4" />
			<Skeleton className="h-4 w-1/2" />
			<div className="grid grid-cols-2 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		</div>
	)
}

export function ViewVoucherModal({ voucherId, open, onClose }) {
	const { data, isLoading, error } = useGetAdminVoucherById(voucherId)
	const voucher = data?.data

	const handleOpenChange = (val) => {
		if (!val) {
			onClose()
		}
	}

	const st = statusCfg[voucher?.status] ?? DEFAULT_STATUS
	const usagePercent = voucher?.quota > 0 ? Math.round((voucher.usedCount / voucher.quota) * 100) : 0

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Detail Voucher</DialogTitle>
				</DialogHeader>

				{isLoading && <VoucherViewSkeleton />}

				{error && (
					<p className="text-sm text-destructive">Gagal memuat data voucher.</p>
				)}

				{!isLoading && voucher && (
					<div className="space-y-5">
						{/* Banner */}
						{voucher.imageUrl ? (
							<div className="relative h-48 w-full rounded-lg border bg-muted/50 overflow-hidden">
								<Image
									src={voucher.imageUrl}
									alt={voucher.name}
									fill
									unoptimized
									className="object-cover"
								/>
							</div>
						) : (
							<div className="flex h-32 items-center justify-center rounded-lg border bg-muted/50">
								<Tag className="h-10 w-10 text-muted-foreground" />
							</div>
						)}

						{/* Nama & status */}
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 className="text-xl font-bold leading-tight">{voucher.name}</h2>
								<div className="mt-1 flex items-center gap-2">
									<code className="rounded bg-muted px-2 py-0.5 text-sm font-semibold">{voucher.code}</code>
								</div>
							</div>
							<Badge variant="outline" className={`shrink-0 ${st.cls}`}>{st.label}</Badge>
						</div>

						<Separator />

						{/* Info grid */}
						<div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
							<div>
								<p className="text-muted-foreground">Tipe Diskon</p>
								<p className="font-medium">
									{voucher.discountType === "fixed" ? "Nominal (Rp)" : voucher.discountType === "percentage" ? "Persentase (%)" : "Gratis Ongkir"}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Nilai Diskon</p>
								<div className="font-medium">
									{formatDiscountDisplay(voucher)}
									{voucher.discountType === "percentage" && voucher.maxDiscount && (
										<span className="text-muted-foreground text-xs ml-1">(Maks {fmt(voucher.maxDiscount)})</span>
									)}
								</div>
							</div>
							<div>
								<p className="text-muted-foreground">Minimal Belanja</p>
								<p className="font-medium">{fmt(voucher.minPurchase)}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Kuota Penggunaan</p>
								<div className="flex flex-col gap-1 mt-0.5">
									<span className={usagePercent >= 100 ? "text-red-600 font-semibold" : "font-medium"}>
										{voucher.usedCount} / {voucher.quota}
									</span>
									<div className="w-full h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
										<div
											className={`h-full rounded-full transition-all ${usagePercent >= 80 ? "bg-red-500" : usagePercent >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
											style={{ width: `${Math.min(usagePercent, 100)}%` }}
										/>
									</div>
								</div>
							</div>
						</div>

						<Separator />

						{/* Periode */}
						<div className="flex items-center gap-2 text-sm">
							<CalendarDays className="h-4 w-4 text-muted-foreground" />
							<div>
								<span className="text-muted-foreground">Berlaku dari</span>{" "}
								<span className="font-medium">{formatDate(voucher.startDate)}</span>{" "}
								<span className="text-muted-foreground">sampai</span>{" "}
								<span className="font-medium">{formatDate(voucher.endDate)}</span>
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
