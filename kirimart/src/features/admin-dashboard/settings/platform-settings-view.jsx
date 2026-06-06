"use client"

import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updatePlatformSetting } from "@/actions/admin-dashboard/settings.actions"
import { useGetPlatformSettings } from "@/app/data/admin-dashboard/settings/settings-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Loader2, Save, Settings, Plus, Trash2, CreditCard, Activity } from "lucide-react"
import { toast } from "sonner"
import { calculateCommission, calculateServiceFee } from "@/lib/platform-fee"
import { DEFAULT_PAYMENT_METHODS } from "@/lib/pg-fee"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function PlatformSettingsView() {
	const queryClient = useQueryClient()
	const { data: queryData, isLoading } = useGetPlatformSettings()

	const settings = queryData?.data || {}

	// Commission Tiers State
	const [tiers, setTiers] = useState([])
	// Service Fee State
	const [sfType, setSfType] = useState("flat")
	const [sfValue, setSfValue] = useState("1000")
	// Payment Methods State
	const [paymentMethods, setPaymentMethods] = useState([])
	// Master Meta Pixel State
	const [masterPixelId, setMasterPixelId] = useState("")

	// Sync state from server data
	useEffect(() => {
		if (settings.commission_tiers?.parsedValue) {
			setTiers(settings.commission_tiers.parsedValue)
		}
		if (settings.service_fee?.parsedValue) {
			setSfType(settings.service_fee.parsedValue.type || "flat")
			setSfValue(String(settings.service_fee.parsedValue.value || 1000))
		}
		if (settings.pg_fee_config?.parsedValue) {
			setPaymentMethods(settings.pg_fee_config.parsedValue)
		} else {
			setPaymentMethods(DEFAULT_PAYMENT_METHODS)
		}
		if (settings.master_meta_pixel_id) {
			setMasterPixelId(settings.master_meta_pixel_id.value)
		}
	}, [settings.commission_tiers?.parsedValue, settings.service_fee?.parsedValue, settings.pg_fee_config?.parsedValue, settings.master_meta_pixel_id?.value])

	const saveMutation = useMutation({
		mutationFn: async ({ key, value, description }) => updatePlatformSetting(key, value, description),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] })
			} else {
				toast.error(result.error)
			}
		},
	})

	const handleSaveTiers = () => {
		for (const t of tiers) {
			if (t.value <= 0) {
				toast.error("Nilai komisi harus lebih dari 0.")
				return
			}
		}
		saveMutation.mutate({
			key: "commission_tiers",
			value: tiers,
			description: "Aturan komisi berjenjang per pesanan.",
		})
	}

	const handleSaveServiceFee = () => {
		saveMutation.mutate({
			key: "service_fee",
			value: { type: sfType, value: parseFloat(sfValue) },
			description: "Biaya layanan per transaksi.",
		})
	}

	const handleSavePaymentMethods = () => {
		saveMutation.mutate({
			key: "pg_fee_config",
			value: paymentMethods,
			description: "Konfigurasi metode pembayaran & biaya PG (MDR).",
		})
	}

	const handleSaveMasterPixel = () => {
		saveMutation.mutate({
			key: "master_meta_pixel_id",
			value: masterPixelId, // we just save string, not JSON, so it's string in db
			description: "Master Meta Pixel ID untuk analitik platform Kawan Belanja.",
		})
	}

	const addTier = () => {
		const lastTier = tiers[tiers.length - 1]
		const newMin = lastTier ? (lastTier.maxAmount || 0) + 1 : 0
		setTiers([...tiers, { minAmount: newMin, maxAmount: null, type: "percent", value: 2.5, cap: null }])
	}

	const removeTier = (idx) => {
		setTiers(tiers.filter((_, i) => i !== idx))
	}

	const updateTier = (idx, field, val) => {
		setTiers(prev => {
			const next = [...prev]
			next[idx] = { ...next[idx], [field]: val }
			return next
		})
	}

	const updatePaymentMethod = (idx, field, val) => {
		setPaymentMethods(prev => {
			const next = [...prev]
			next[idx] = { ...next[idx], [field]: val }
			return next
		})
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat pengaturan...</p>
			</div>
		)
	}

	const testAmounts = [5000, 15000, 30000, 75000, 200000, 500000, 1000000]

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Pengaturan Platform</h1>
				<p className="text-muted-foreground">Konfigurasi biaya komisi, layanan, dan metode pembayaran platform.</p>
			</div>

			{/* Commission Tiers */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Settings className="h-5 w-5" />
						<CardTitle className="text-base">Komisi Platform (Per Pesanan)</CardTitle>
					</div>
					<CardDescription>
						Komisi dipotong dari total harga produk setiap pesanan yang selesai. Atur tier berdasarkan rentang harga.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Dari (Rp)</TableHead>
									<TableHead>Sampai (Rp)</TableHead>
									<TableHead>Tipe</TableHead>
									<TableHead>Nilai</TableHead>
									<TableHead>Maks (Rp)</TableHead>
									<TableHead className="w-[60px]"></TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tiers.length === 0 ? (
									<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-16">Belum ada aturan komisi.</TableCell></TableRow>
								) : tiers.map((tier, idx) => (
									<TableRow key={idx}>
										<TableCell>
											<Input type="number" value={tier.minAmount || 0} className="w-28 h-8 text-sm"
												onChange={(e) => updateTier(idx, "minAmount", parseInt(e.target.value) || 0)} />
										</TableCell>
										<TableCell>
											<Input type="number" value={tier.maxAmount ?? ""} placeholder="∞" className="w-28 h-8 text-sm"
												onChange={(e) => updateTier(idx, "maxAmount", e.target.value ? parseInt(e.target.value) : null)} />
										</TableCell>
										<TableCell>
											<Select value={tier.type} onValueChange={(v) => updateTier(idx, "type", v)}>
												<SelectTrigger className="w-24 h-8 text-sm"><SelectValue /></SelectTrigger>
												<SelectContent>
													<SelectItem value="flat">Flat (Rp)</SelectItem>
													<SelectItem value="percent">Persen (%)</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<Input type="number" step="0.1" value={tier.value} className="w-20 h-8 text-sm"
												onChange={(e) => updateTier(idx, "value", parseFloat(e.target.value) || 0)} />
										</TableCell>
										<TableCell>
											<Input type="number" value={tier.cap ?? ""} placeholder="—" className="w-24 h-8 text-sm"
												onChange={(e) => updateTier(idx, "cap", e.target.value ? parseInt(e.target.value) : null)} />
										</TableCell>
										<TableCell>
											<Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeTier(idx)}>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={addTier}><Plus className="h-3.5 w-3.5 mr-1" />Tambah Tier</Button>
						<Button size="sm" onClick={handleSaveTiers} disabled={saveMutation.isPending}>
							{saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
							<Save className="h-3.5 w-3.5 mr-1" />Simpan Komisi
						</Button>
					</div>

					{/* Preview */}
					<div className="border-t pt-4">
						<p className="text-xs font-semibold mb-2">Preview Komisi:</p>
						<div className="flex flex-wrap gap-2">
							{testAmounts.map(amt => (
								<Badge key={amt} variant="outline" className="text-xs font-mono">
									{fmt(amt)} → Komisi: {fmt(calculateCommission(amt, tiers))}
								</Badge>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Service Fee */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Biaya Layanan (Dibayar Pembeli)</CardTitle>
					<CardDescription>Biaya tambahan per transaksi yang dibayar oleh pembeli. Bisa berupa nominal tetap (flat) atau persentase dari subtotal.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Tipe</Label>
							<Select value={sfType} onValueChange={setSfType}>
								<SelectTrigger><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="flat">Flat (Nominal Tetap Rp)</SelectItem>
									<SelectItem value="percent">Persentase (%)</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>{sfType === "flat" ? "Nominal (Rp)" : "Persentase (%)"}</Label>
							<Input type="number" step="0.1" value={sfValue} onChange={(e) => setSfValue(e.target.value)} />
						</div>
					</div>
					<div className="border-t pt-3">
						<p className="text-xs font-semibold mb-2">Preview:</p>
						<div className="flex flex-wrap gap-2">
							{testAmounts.map(amt => (
								<Badge key={amt} variant="outline" className="text-xs font-mono">
									Subtotal {fmt(amt)} → Biaya: {fmt(calculateServiceFee(amt, { type: sfType, value: parseFloat(sfValue) }))}
								</Badge>
							))}
						</div>
					</div>
					<Button size="sm" onClick={handleSaveServiceFee} disabled={saveMutation.isPending}>
						{saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
						<Save className="h-3.5 w-3.5 mr-1" />Simpan Biaya Layanan
					</Button>
				</CardContent>
			</Card>

			{/* Payment Methods & PG Fee Config */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<CreditCard className="h-5 w-5" />
						<CardTitle className="text-base">Metode Pembayaran & Biaya PG</CardTitle>
					</div>
					<CardDescription>
						Aktifkan/nonaktifkan metode pembayaran dan atur biaya MDR per metode.
						Pastikan metode yang diaktifkan sudah aktif juga di Dashboard Midtrans.
						Biaya PPN 12% akan otomatis ditambahkan ke buyer.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[60px]">Aktif</TableHead>
									<TableHead>Metode</TableHead>
									<TableHead>Grup</TableHead>
									<TableHead>Tipe Biaya</TableHead>
									<TableHead>Flat (Rp)</TableHead>
									<TableHead>Persen (%)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{paymentMethods.map((method, idx) => (
									<TableRow key={method.id} className={!method.enabled ? "opacity-50" : ""}>
										<TableCell>
											<Switch
												checked={method.enabled}
												onCheckedChange={(checked) => updatePaymentMethod(idx, "enabled", checked)}
											/>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="text-sm">{method.icon}</span>
												<span className="text-sm font-medium">{method.label}</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant="outline" className="text-[10px]">{method.group}</Badge>
										</TableCell>
										<TableCell>
											<Select
												value={method.feeType}
												onValueChange={(v) => updatePaymentMethod(idx, "feeType", v)}
											>
												<SelectTrigger className="w-28 h-8 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="flat">Flat</SelectItem>
													<SelectItem value="percent">Persen</SelectItem>
													<SelectItem value="flat_percent">Keduanya</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												value={method.feeFlat}
												className="w-24 h-8 text-sm"
												onChange={(e) => updatePaymentMethod(idx, "feeFlat", parseInt(e.target.value) || 0)}
												disabled={method.feeType === "percent"}
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												step="0.1"
												value={method.feePercent}
												className="w-20 h-8 text-sm"
												onChange={(e) => updatePaymentMethod(idx, "feePercent", parseFloat(e.target.value) || 0)}
												disabled={method.feeType === "flat"}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="bg-muted/50 rounded-lg p-3">
						<p className="text-xs font-semibold mb-1">Catatan:</p>
						<ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
							<li>Biaya PPN 12% otomatis ditambahkan ke biaya MDR yang ditampilkan ke buyer.</li>
							<li>Contoh: VA flat Rp 4.000 → buyer bayar Rp 4.480 (sudah termasuk PPN).</li>
							<li>Biaya ini digabungkan dengan komisi platform menjadi &quot;Biaya Layanan & Penanganan&quot;.</li>
						</ul>
					</div>

					<Button size="sm" onClick={handleSavePaymentMethods} disabled={saveMutation.isPending}>
						{saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
						<Save className="h-3.5 w-3.5 mr-1" />Simpan Metode Pembayaran
					</Button>
				</CardContent>
			</Card>

			{/* Master Meta Pixel */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						<CardTitle className="text-base">Master Meta Pixel (Kawan Belanja)</CardTitle>
					</div>
					<CardDescription>
						Pixel utama milik platform untuk melacak semua transaksi, pengunjung, dan interaksi 
						secara global (lintas toko).
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Pixel ID</Label>
						<Input 
							placeholder="Contoh: 123456789012345" 
							value={masterPixelId} 
							onChange={(e) => setMasterPixelId(e.target.value)} 
							className="max-w-md"
						/>
					</div>
					<Button size="sm" onClick={handleSaveMasterPixel} disabled={saveMutation.isPending}>
						{saveMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
						<Save className="h-3.5 w-3.5 mr-1" />Simpan Master Pixel
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
