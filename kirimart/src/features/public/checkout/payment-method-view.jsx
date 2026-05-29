"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Loader2, ShieldCheck, CreditCard, Building2, Smartphone, QrCode, ChevronDown, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getCheckoutData, getPaymentMethodsConfig } from "@/actions/public/checkout.actions"
import { createCoreApiTransaction } from "@/actions/public/payment/payment.actions"
import { calculatePgFee, calculateTotalServiceFee, groupPaymentMethods } from "@/lib/pg-fee"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const GROUP_ICONS = {
	"Bank Transfer": Building2,
	"E-Wallet": Smartphone,
	"QRIS": QrCode,
}

export function PaymentMethodView() {
	const router = useRouter()

	// Fetch data checkout
	const { data: checkoutQuery, isLoading: isLoadingCheckout } = useQuery({
		queryKey: ["checkout-data"],
		queryFn: getCheckoutData,
	})

	// Fetch daftar metode pembayaran
	const { data: methodsQuery, isLoading: isLoadingMethods } = useQuery({
		queryKey: ["payment-methods-config"],
		queryFn: getPaymentMethodsConfig,
	})

	const checkoutStores = checkoutQuery?.data?.stores || []
	const enabledMethods = methodsQuery?.data?.methods || []
	const commissionTiers = methodsQuery?.data?.commissionTiers || []

	const [selectedMethodId, setSelectedMethodId] = useState(null)
	const [expandedGroups, setExpandedGroups] = useState({})
	const [isProcessing, setIsProcessing] = useState(false)
	const [checkoutState, setCheckoutState] = useState(null)

	// Ambil state checkout (shipping, voucher, notes) dari localStorage
	useEffect(() => {
		try {
			const saved = localStorage.getItem("kirimart_checkout_state")
			if (saved) {
				setCheckoutState(JSON.parse(saved))
			}
		} catch (e) {
			console.error("Failed to parse checkout state", e)
		}
	}, [])

	// Auto-expand semua groups saat data dimuat
	useEffect(() => {
		if (enabledMethods.length > 0) {
			const groups = {}
			enabledMethods.forEach(m => { groups[m.group] = true })
			setExpandedGroups(groups)
		}
	}, [enabledMethods])

	// Hitung totals
	const subtotal = checkoutStores.reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.price * i.qty, 0), 0)
	const totalShipping = checkoutStores.reduce((sum, s) => {
		const savedShippingId = checkoutState?.selectedShipping?.[s.id]
		const ship = s.shipping?.find(sh => sh.id === (savedShippingId || s.shipping?.[0]?.id))
		return sum + (ship?.price || s.shipping?.[0]?.price || 0)
	}, 0)

	// Cari method config yang dipilih
	const selectedMethod = enabledMethods.find(m => m.id === selectedMethodId) || null

	// Hitung biaya layanan & penanganan
	const grossBeforePgFee = Math.max(0, subtotal + totalShipping)
	const serviceFeeResult = calculateTotalServiceFee(subtotal, commissionTiers, selectedMethod, grossBeforePgFee)
	const serviceFee = serviceFeeResult.total

	const totalDiscount = checkoutState?.appliedVouchers?.reduce((sum, v) => sum + v.discountAmount, 0) || 0
	const grandTotal = Math.max(0, grossBeforePgFee + serviceFee - totalDiscount)

	// Group metode
	const groupedMethods = groupPaymentMethods(enabledMethods)

	const toggleGroup = (group) => {
		setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }))
	}

	// Konfirmasi & bayar
	const handleConfirmPayment = async () => {
		if (!selectedMethodId) {
			toast.error("Pilih metode pembayaran terlebih dahulu.")
			return
		}

		setIsProcessing(true)
		try {
			// Susun data checkout
			const checkoutData = {
				address: checkoutQuery?.data?.addresses?.[0] || null,
				addressId: checkoutQuery?.data?.selectedAddressId,
				stores: checkoutStores.map(store => {
					const savedShippingId = checkoutState?.selectedShipping?.[store.id]
					return {
						...store,
						selectedShipping: store.shipping?.find(s => s.id === (savedShippingId || store.shipping?.[0]?.id)) || store.shipping?.[0] || null,
						notes: checkoutState?.notes?.[store.id] || "",
					}
				}),
				cartItemIds: checkoutStores.flatMap(store => store.items.map(i => i.cartItemId)),
				appliedVouchers: checkoutState?.appliedVouchers || [],
				subtotal,
				totalShipping,
				totalDiscount,
			}

			const result = await createCoreApiTransaction(checkoutData, selectedMethodId)

			if (!result.success) {
				toast.error(result.error || "Gagal membuat transaksi")
				setIsProcessing(false)
				return
			}

			// Redirect ke halaman instruksi pembayaran
			router.push(`/checkout/payment/instruction?order_id=${result.orderId}`)
		} catch (error) {
			console.error("[PAYMENT] Error:", error)
			toast.error("Terjadi kesalahan. Silakan coba lagi.")
			setIsProcessing(false)
		}
	}

	// Loading
	if (isLoadingCheckout || isLoadingMethods) {
		return (
			<div className="container mx-auto px-4 md:px-6 py-16 flex flex-col items-center justify-center space-y-4">
				<Loader2 className="h-10 w-10 animate-spin text-primary" />
				<p className="text-sm font-medium text-muted-foreground">Memuat metode pembayaran...</p>
			</div>
		)
	}

	// Empty
	if (checkoutStores.length === 0) {
		return (
			<div className="container mx-auto px-4 md:px-6 py-16 max-w-4xl text-center space-y-4">
				<AlertCircle className="h-16 w-16 mx-auto text-muted-foreground/40" />
				<h2 className="text-xl font-bold">Tidak Ada Data Checkout</h2>
				<p className="text-sm text-muted-foreground">Silakan checkout ulang dari keranjang.</p>
				<Button onClick={() => router.push("/cart")}>Kembali ke Keranjang</Button>
			</div>
		)
	}

	return (
		<div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-4xl">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<h1 className="text-xl md:text-2xl font-bold">Pilih Metode Pembayaran</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
				{/* Left: Payment Methods */}
				<div className="lg:col-span-7 space-y-3">
					{groupedMethods.map(({ group, methods }) => {
						const GroupIcon = GROUP_ICONS[group] || CreditCard
						const isExpanded = expandedGroups[group] !== false

						return (
							<Card key={group} className="border-border/60 overflow-hidden">
								<button
									onClick={() => toggleGroup(group)}
									className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
								>
									<div className="flex items-center gap-2.5">
										<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
											<GroupIcon className="h-4 w-4 text-primary" />
										</div>
										<span className="text-sm font-bold">{group}</span>
										<Badge variant="outline" className="text-[10px] h-5">{methods.length}</Badge>
									</div>
									<ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
								</button>

								{isExpanded && (
									<CardContent className="px-4 pb-4 pt-0 space-y-2">
										{methods.map(method => {
											const isSelected = selectedMethodId === method.id
											const methodFee = calculatePgFee(grossBeforePgFee, method)

											return (
												<button
													key={method.id}
													onClick={() => setSelectedMethodId(method.id)}
													className={cn(
														"w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
														isSelected
															? "border-primary bg-primary/5 ring-1 ring-primary/20"
															: "border-border hover:border-primary/30"
													)}
												>
													<div className="flex items-center gap-3">
														<div className={cn(
															"h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
															isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
														)}>
															{isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
														</div>
														<div>
															<p className="text-sm font-medium">{method.label}</p>
															{methodFee > 0 && (
																<p className="text-[11px] text-muted-foreground">
																	Biaya: +{fmt(methodFee)}
																</p>
															)}
														</div>
													</div>
													<span className="text-xs text-muted-foreground">{method.icon}</span>
												</button>
											)
										})}
									</CardContent>
								)}
							</Card>
						)
					})}
				</div>

				{/* Right: Summary */}
				<div className="lg:col-span-5">
					<div className="lg:sticky lg:top-24 space-y-4">
						<Card className="border-border/60">
							<CardHeader className="pb-3">
								<CardTitle className="text-base">Ringkasan Pembayaran</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Subtotal Produk</span>
									<span className="font-medium">{fmt(subtotal)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Total Ongkir</span>
									<span className="font-medium">{fmt(totalShipping)}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Biaya Layanan & Penanganan</span>
									<span className="font-medium">
										{selectedMethod ? fmt(serviceFee) : (
											<span className="text-xs text-muted-foreground italic">Pilih metode</span>
										)}
									</span>
								</div>
								{totalDiscount > 0 && (
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Diskon Voucher</span>
										<span className="font-bold text-green-600">-{fmt(totalDiscount)}</span>
									</div>
								)}
								<Separator />
								<div className="flex justify-between">
									<span className="font-bold">Total Pembayaran</span>
									<span className="text-lg font-bold text-primary">
										{selectedMethod ? fmt(grandTotal) : fmt(subtotal + totalShipping - totalDiscount)}
									</span>
								</div>

								<Button
									type="button"
									className="w-full h-11 font-bold text-sm"
									onClick={handleConfirmPayment}
									disabled={isProcessing || !selectedMethodId}
								>
									{isProcessing ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Memproses Pembayaran...
										</>
									) : (
										<>
											Konfirmasi & Bayar {selectedMethod ? fmt(grandTotal) : ""}
										</>
									)}
								</Button>

								<p className="text-[10px] text-muted-foreground text-center leading-relaxed">
									Dengan menekan tombol di atas, kamu menyetujui <span className="text-primary font-medium">Syarat & Ketentuan</span> KiriMart
								</p>
							</CardContent>
						</Card>

						<div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
							<ShieldCheck className="h-4 w-4 text-primary shrink-0" />
							<span>Pembayaran aman & terenkripsi</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
