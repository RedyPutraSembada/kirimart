"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation } from "@tanstack/react-query"
import { Copy, Clock, CheckCircle2, RefreshCw, ArrowLeft, Loader2, QrCode, AlertCircle, ExternalLink, Repeat } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getPaymentStatus, cancelAndChangePaymentMethod } from "@/actions/public/payment/payment.actions"
import Image from "next/image"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function PaymentInstructionView() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const orderId = searchParams.get("order_id")

	const [isCancelling, setIsCancelling] = useState(false)

	// Polling status setiap 5 detik
	const { data: statusQuery, isLoading, refetch } = useQuery({
		queryKey: ["payment-status", orderId],
		queryFn: () => getPaymentStatus(orderId),
		enabled: !!orderId,
		refetchInterval: 5000, // Polling setiap 5 detik
		refetchIntervalInBackground: false,
	})

	const payment = statusQuery?.data || null

	// Auto-redirect jika status sudah paid
	useEffect(() => {
		if (payment?.status === "paid") {
			router.push(`/checkout/status?status=finish&order_id=${orderId}`)
		} else if (payment?.status === "cancelled" || payment?.status === "failed") {
			router.push(`/checkout/status?status=error&order_id=${orderId}`)
		}
	}, [payment?.status, orderId, router])

	// Cancel & ganti metode
	const cancelMutation = useMutation({
		mutationFn: () => cancelAndChangePaymentMethod(orderId),
		onSuccess: (result) => {
			if (result.success) {
				toast.success("Transaksi dibatalkan. Silakan pilih metode pembayaran baru.")
				router.push("/checkout")
			} else {
				toast.error(result.error)
			}
			setIsCancelling(false)
		},
		onError: () => {
			toast.error("Gagal membatalkan transaksi.")
			setIsCancelling(false)
		},
	})

	const handleChangeMethod = () => {
		setIsCancelling(true)
		cancelMutation.mutate()
	}

	const handleCopy = (text) => {
		navigator.clipboard.writeText(text)
		toast.success("Disalin!")
	}

	// Loading
	if (isLoading || !payment) {
		return (
			<div className="container mx-auto px-4 md:px-6 py-16 flex flex-col items-center justify-center space-y-4">
				<Loader2 className="h-10 w-10 animate-spin text-primary" />
				<p className="text-sm font-medium text-muted-foreground">Memuat instruksi pembayaran...</p>
			</div>
		)
	}

	// Expired
	if (payment.isExpired) {
		return (
			<div className="container mx-auto px-4 md:px-6 py-16 max-w-lg text-center space-y-4">
				<div className="mx-auto h-20 w-20 rounded-full bg-red-500/10 ring-4 ring-red-500/20 flex items-center justify-center">
					<AlertCircle className="h-10 w-10 text-red-500" />
				</div>
				<h1 className="text-xl font-bold">Waktu Pembayaran Habis</h1>
				<p className="text-sm text-muted-foreground">Batas waktu pembayaran telah berakhir. Silakan buat pesanan baru.</p>
				<Button onClick={() => router.push("/cart")}>Kembali ke Keranjang</Button>
			</div>
		)
	}

	const instruction = payment.paymentInstruction

	return (
		<div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-2xl">
			{/* Header */}
			<div className="flex items-center gap-3 mb-6">
				<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/")}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-xl md:text-2xl font-bold">Instruksi Pembayaran</h1>
					<p className="text-xs text-muted-foreground">Order: {orderId}</p>
				</div>
			</div>

			<div className="space-y-4">
				{/* Status & Timer */}
				<Card className="border-border/60">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
									<Clock className="h-5 w-5 text-amber-500" />
								</div>
								<div>
									<p className="text-sm font-semibold">Menunggu Pembayaran</p>
									<p className="text-xs text-muted-foreground">
										{instruction?.methodLabel || payment.paymentType}
									</p>
								</div>
							</div>
							<Badge variant="secondary" className="text-xs">Pending</Badge>
						</div>
						{payment.expiresAt && (
							<div className="mt-3 pt-3 border-t">
								<CountdownTimer expiresAt={payment.expiresAt} />
							</div>
						)}
					</CardContent>
				</Card>

				{/* Total */}
				<Card className="border-border/60">
					<CardContent className="p-4 flex items-center justify-between">
						<span className="text-sm text-muted-foreground">Total Pembayaran</span>
						<span className="text-lg font-bold text-primary">{fmt(payment.totalAmount)}</span>
					</CardContent>
				</Card>

				{/* Payment Instruction Details */}
				{instruction?.type === "bank_transfer" && instruction.vaNumber && (
					<VaInstruction instruction={instruction} onCopy={handleCopy} />
				)}

				{instruction?.type === "echannel" && instruction.billKey && (
					<MandiriInstruction instruction={instruction} onCopy={handleCopy} />
				)}

				{(instruction?.type === "gopay" || instruction?.type === "shopeepay") && (
					<EwalletInstruction instruction={instruction} />
				)}

				{instruction?.type === "qris" && instruction.qrUrl && (
					<QrisInstruction instruction={instruction} />
				)}

				{/* Action Buttons */}
				<div className="space-y-3 pt-2">
					{/* Cek Status Manual */}
					<Button
						variant="outline"
						className="w-full"
						onClick={() => refetch()}
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Cek Status Pembayaran
					</Button>

					{/* Ganti Metode */}
					<Button
						variant="ghost"
						className="w-full text-muted-foreground"
						onClick={handleChangeMethod}
						disabled={isCancelling}
					>
						{isCancelling ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Membatalkan...
							</>
						) : (
							<>
								<Repeat className="mr-2 h-4 w-4" />
								Ganti Metode Pembayaran
							</>
						)}
					</Button>
				</div>

				<p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">
					Halaman ini akan otomatis memperbarui status pembayaran. Jangan tutup halaman ini sebelum pembayaran selesai.
				</p>
			</div>
		</div>
	)
}

// ============================================
// Sub Components
// ============================================

function VaInstruction({ instruction, onCopy }) {
	const bankName = instruction.bank?.toUpperCase() || "Bank"
	return (
		<Card className="border-border/60">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">Transfer ke {bankName} Virtual Account</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="bg-muted/50 rounded-xl p-4 space-y-2">
					<p className="text-xs text-muted-foreground">Nomor Virtual Account</p>
					<div className="flex items-center justify-between">
						<code className="text-lg font-mono font-bold tracking-wider">{instruction.vaNumber}</code>
						<Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onCopy(instruction.vaNumber)}>
							<Copy className="h-3 w-3 mr-1" /> Salin
						</Button>
					</div>
				</div>
				<Separator />
				<div className="space-y-2">
					<p className="text-xs font-semibold">Cara Pembayaran:</p>
					<ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
						<li>Buka aplikasi m-Banking atau ATM {bankName}</li>
						<li>Pilih menu Transfer → Virtual Account</li>
						<li>Masukkan nomor VA di atas</li>
						<li>Konfirmasi nominal dan selesaikan pembayaran</li>
					</ol>
				</div>
			</CardContent>
		</Card>
	)
}

function MandiriInstruction({ instruction, onCopy }) {
	return (
		<Card className="border-border/60">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">Mandiri Bill Payment</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="bg-muted/50 rounded-xl p-4 space-y-3">
					<div>
						<p className="text-xs text-muted-foreground">Biller Code</p>
						<div className="flex items-center justify-between">
							<code className="text-lg font-mono font-bold">{instruction.billerCode}</code>
							<Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onCopy(instruction.billerCode)}>
								<Copy className="h-3 w-3 mr-1" /> Salin
							</Button>
						</div>
					</div>
					<div>
						<p className="text-xs text-muted-foreground">Bill Key</p>
						<div className="flex items-center justify-between">
							<code className="text-lg font-mono font-bold tracking-wider">{instruction.billKey}</code>
							<Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onCopy(instruction.billKey)}>
								<Copy className="h-3 w-3 mr-1" /> Salin
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function EwalletInstruction({ instruction }) {
	const deeplinkUrl = instruction.deeplink || instruction.actions?.find(a => a.name === "deeplink-redirect")?.url
	const qrUrl = instruction.qrUrl || instruction.actions?.find(a => a.name === "generate-qr-code")?.url

	return (
		<Card className="border-border/60">
			<CardHeader className="pb-3">
				<CardTitle className="text-base">{instruction.methodLabel}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{qrUrl && (
					<div className="flex flex-col items-center space-y-3">
						<div className="bg-white p-4 rounded-xl border">
							<div className="relative h-48 w-48">
								<Image src={qrUrl} alt="QR Code" fill className="object-contain" />
							</div>
						</div>
						<p className="text-xs text-muted-foreground">Scan QR code di atas dengan aplikasi {instruction.methodLabel}</p>
					</div>
				)}
				{deeplinkUrl && (
					<Button asChild className="w-full">
						<a href={deeplinkUrl} target="_blank" rel="noopener noreferrer">
							<ExternalLink className="mr-2 h-4 w-4" />
							Buka {instruction.methodLabel}
						</a>
					</Button>
				)}
			</CardContent>
		</Card>
	)
}

function QrisInstruction({ instruction }) {
	return (
		<Card className="border-border/60">
			<CardHeader className="pb-3">
				<div className="flex items-center gap-2">
					<QrCode className="h-5 w-5 text-primary" />
					<CardTitle className="text-base">QRIS</CardTitle>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-col items-center space-y-3">
					<div className="bg-white p-4 rounded-xl border">
						<div className="relative h-56 w-56">
							<Image src={instruction.qrUrl} alt="QRIS QR Code" fill className="object-contain" />
						</div>
					</div>
					<p className="text-xs text-muted-foreground text-center">
						Scan QR di atas menggunakan aplikasi e-wallet manapun<br />
						(GoPay, OVO, DANA, LinkAja, ShopeePay, dll)
					</p>
				</div>
			</CardContent>
		</Card>
	)
}

// ============================================
// Countdown Timer
// ============================================

function CountdownTimer({ expiresAt }) {
	const [timeLeft, setTimeLeft] = useState("")

	useEffect(() => {
		const update = () => {
			const now = new Date()
			const exp = new Date(expiresAt)
			const diff = exp - now

			if (diff <= 0) {
				setTimeLeft("Waktu habis")
				return
			}

			const hours = Math.floor(diff / (1000 * 60 * 60))
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
			const seconds = Math.floor((diff % (1000 * 60)) / 1000)

			setTimeLeft(`${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`)
		}

		update()
		const interval = setInterval(update, 1000)
		return () => clearInterval(interval)
	}, [expiresAt])

	return (
		<div className="flex items-center justify-between">
			<span className="text-xs text-muted-foreground">Bayar sebelum:</span>
			<span className={cn(
				"text-sm font-mono font-bold",
				timeLeft === "Waktu habis" ? "text-red-500" : "text-amber-600"
			)}>
				{timeLeft}
			</span>
		</div>
	)
}
