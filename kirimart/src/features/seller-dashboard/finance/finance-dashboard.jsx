"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updateBankInfo, requestWithdrawal } from "@/actions/seller-dashboard/finance.actions"
import { useGetFinanceSummary } from "@/app/data/seller-dashboard/finance/finance-data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Wallet, Banknote, TrendingUp, ArrowUpRight, Loader2, Building2, Save, AlertCircle, Receipt, Truck, BarChart3 } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const statusCfg = {
	pending: { label: "Menunggu", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
	completed: { label: "Berhasil", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
	rejected: { label: "Ditolak", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
}

export function FinanceDashboard() {
	const queryClient = useQueryClient()
	const [daysFilter, setDaysFilter] = useState("7")
	const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
	const [withdrawAmount, setWithdrawAmount] = useState("")
	const [bankForm, setBankForm] = useState({ bankName: "", accountNumber: "", accountHolder: "" })
	const [isBankEditing, setIsBankEditing] = useState(false)

	const { data: queryData, isLoading } = useGetFinanceSummary(parseInt(daysFilter))

	const finance = queryData?.data

	const bankMutation = useMutation({
		mutationFn: () => updateBankInfo(bankForm.bankName, bankForm.accountNumber, bankForm.accountHolder),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["seller-finance"] })
				setIsBankEditing(false)
			} else {
				toast.error(result.error)
			}
		},
	})

	const withdrawMutation = useMutation({
		mutationFn: () => requestWithdrawal(parseInt(withdrawAmount)),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["seller-finance"] })
				setShowWithdrawDialog(false)
				setWithdrawAmount("")
			} else {
				toast.error(result.error)
			}
		},
	})

	const handleEditBank = () => {
		setBankForm({
			bankName: finance?.bank?.bankName || "",
			accountNumber: finance?.bank?.accountNumber || "",
			accountHolder: finance?.bank?.accountHolder || "",
		})
		setIsBankEditing(true)
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat data keuangan...</p>
			</div>
		)
	}

	const hasBankInfo = finance?.bank?.bankName && finance?.bank?.accountNumber && finance?.bank?.accountHolder

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Keuangan Toko</h1>
					<p className="text-muted-foreground">Kelola saldo dan penarikan dana toko Anda.</p>
				</div>
				
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Periode Grafik:</span>
					<Select value={daysFilter} onValueChange={setDaysFilter}>
						<SelectTrigger className="w-[140px]">
							<SelectValue placeholder="Pilih Periode" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="7">7 Hari Terakhir</SelectItem>
							<SelectItem value="14">14 Hari Terakhir</SelectItem>
							<SelectItem value="30">30 Hari Terakhir</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{/* Summary Cards */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-emerald-500/10"><Wallet className="h-5 w-5 text-emerald-600" /></div>
						<div>
							<p className="text-sm text-muted-foreground">Saldo Aktif</p>
							<p className="text-2xl font-bold text-emerald-600">{fmt(finance?.balance || 0)}</p>
							<p className="text-[10px] text-muted-foreground">Bisa ditarik ke rekening</p>
						</div>
					</CardContent>
				</Card>
				<Card className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-blue-500/10"><ArrowUpRight className="h-5 w-5 text-blue-600" /></div>
						<div>
							<p className="text-sm text-muted-foreground">Sudah Ditarik</p>
							<p className="text-2xl font-bold">{fmt(finance?.withdrawnAmount || 0)}</p>
						</div>
					</CardContent>
				</Card>
				<Card className="hover:shadow-md hover:-translate-y-1 transition-all duration-300">
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-violet-500/10"><TrendingUp className="h-5 w-5 text-violet-600" /></div>
						<div>
							<p className="text-sm text-muted-foreground">Total Pendapatan Bersih</p>
							<p className="text-2xl font-bold">{fmt(finance?.netIncome || 0)}</p>
							<p className="text-[10px] text-muted-foreground">Total Keseluruhan</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Chart & Income Breakdown */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Chart Area */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-base flex items-center gap-2">
							<BarChart3 className="h-5 w-5" /> Tren Pendapatan Bersih ({daysFilter} Hari)
						</CardTitle>
						<CardDescription>Pergerakan pendapatan bersih Anda setiap harinya.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="h-[250px] w-full">
							{finance?.chartData && finance.chartData.length > 0 ? (
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={finance.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
										<defs>
											<linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
												<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
												<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
											</linearGradient>
										</defs>
										<CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
										<XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
										<YAxis 
											axisLine={false} 
											tickLine={false} 
											tick={{ fontSize: 12 }}
											tickFormatter={(value) => value === 0 ? "0" : `Rp ${value / 1000}k`}
											dx={-10}
										/>
										<RechartsTooltip 
											formatter={(value) => [fmt(value), "Pendapatan"]}
											labelStyle={{ color: '#000', fontWeight: 'bold' }}
											contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
										/>
										<Area type="monotone" dataKey="netIncome" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" />
									</AreaChart>
								</ResponsiveContainer>
							) : (
								<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
									Tidak ada data pendapatan di periode ini.
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Breakdown Area */}
				<div className="space-y-6">
					{finance?.completedOrders > 0 ? (
						<Card className="h-full">
							<CardHeader className="pb-3">
								<div className="flex items-center gap-2">
									<BarChart3 className="h-5 w-5" />
									<CardTitle className="text-base">Rincian Pendapatan (Total)</CardTitle>
								</div>
								<CardDescription>Dari {finance.completedOrders} Pesanan Selesai</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4 mt-2">
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Transaksi (Kotor)</span>
										<span className="font-medium">{fmt(finance.totalGross || 0)}</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Ongkos Kirim</span>
										<span className="font-medium text-amber-600">-{fmt(finance.totalShipping || 0)}</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Komisi Platform</span>
										<span className="font-medium text-red-500">-{fmt(finance.totalPlatformFee || 0)}</span>
									</div>
									<Separator />
									<div className="flex justify-between">
										<span className="font-bold">Pendapatan Bersih</span>
										<span className="font-bold text-emerald-600 text-lg">{fmt(finance.netIncome || 0)}</span>
									</div>
								</div>
							</CardContent>
						</Card>
					) : (
						<Card className="h-full flex flex-col items-center justify-center p-6 text-center">
							<AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
							<p className="text-sm font-medium">Belum ada pendapatan</p>
							<p className="text-xs text-muted-foreground mt-1">Selesaikan pesanan untuk melihat rincian.</p>
						</Card>
					)}
				</div>
			</div>

			{/* Bank Info + Withdraw Action */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Bank Info */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								<CardTitle className="text-base">Rekening Bank</CardTitle>
							</div>
							{!isBankEditing && (
								<Button variant="outline" size="sm" onClick={handleEditBank}>Ubah</Button>
							)}
						</div>
						<CardDescription>Informasi rekening untuk pencairan dana.</CardDescription>
					</CardHeader>
					<CardContent>
						{isBankEditing ? (
							<div className="space-y-4">
								<div className="space-y-2">
									<Label>Nama Bank</Label>
									<Input value={bankForm.bankName} onChange={(e) => setBankForm(p => ({ ...p, bankName: e.target.value }))} placeholder="BCA" />
								</div>
								<div className="space-y-2">
									<Label>Nomor Rekening</Label>
									<Input value={bankForm.accountNumber} onChange={(e) => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} placeholder="1234567890" />
								</div>
								<div className="space-y-2">
									<Label>Nama Pemilik Rekening</Label>
									<Input value={bankForm.accountHolder} onChange={(e) => setBankForm(p => ({ ...p, accountHolder: e.target.value }))} placeholder="Nama sesuai buku tabungan" />
								</div>
								<div className="flex gap-2">
									<Button onClick={() => bankMutation.mutate()} disabled={bankMutation.isPending}>
										{bankMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
										<Save className="h-4 w-4 mr-2" />Simpan
									</Button>
									<Button variant="outline" onClick={() => setIsBankEditing(false)}>Batal</Button>
								</div>
							</div>
						) : hasBankInfo ? (
							<div className="space-y-3">
								<div><p className="text-xs text-muted-foreground">Bank</p><p className="text-sm font-medium">{finance.bank.bankName}</p></div>
								<div><p className="text-xs text-muted-foreground">Nomor Rekening</p><p className="text-sm font-mono font-bold">{finance.bank.accountNumber}</p></div>
								<div><p className="text-xs text-muted-foreground">Atas Nama</p><p className="text-sm font-medium">{finance.bank.accountHolder}</p></div>
							</div>
						) : (
							<div className="text-center py-6 space-y-2">
								<AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
								<p className="text-sm font-medium">Rekening bank belum diisi</p>
								<p className="text-xs text-muted-foreground">Anda harus mengisi informasi rekening sebelum bisa menarik dana.</p>
								<Button size="sm" onClick={handleEditBank}>Isi Rekening Sekarang</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Withdraw Card */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-2">
							<Banknote className="h-5 w-5" />
							<CardTitle className="text-base">Tarik Dana</CardTitle>
						</div>
						<CardDescription>Cairkan saldo ke rekening bank Anda.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="bg-muted/50 rounded-lg p-4 mb-4 text-center">
							<p className="text-xs text-muted-foreground">Saldo Tersedia</p>
							<p className="text-3xl font-bold text-primary mt-1">{fmt(finance?.balance || 0)}</p>
						</div>
						<Button
							className="w-full"
							disabled={!finance?.balance || finance.balance < 10000 || !hasBankInfo}
							onClick={() => setShowWithdrawDialog(true)}
						>
							<Banknote className="h-4 w-4 mr-2" />
							{!hasBankInfo ? "Isi Rekening Dulu" : finance?.balance < 10000 ? "Saldo Belum Cukup (Min. Rp 10.000)" : "Tarik Saldo"}
						</Button>
						{!hasBankInfo && (
							<p className="text-xs text-amber-600 text-center mt-2">⚠️ Lengkapi rekening bank Anda untuk menarik dana.</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Withdrawal History */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Riwayat Penarikan</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>ID</TableHead>
									<TableHead>Tanggal</TableHead>
									<TableHead>Bank</TableHead>
									<TableHead className="text-right">Jumlah</TableHead>
									<TableHead className="text-center">Status</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(!finance?.withdrawals || finance.withdrawals.length === 0) ? (
									<TableRow>
										<TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Belum ada riwayat penarikan.</TableCell>
									</TableRow>
								) : finance.withdrawals.map(w => {
									const st = statusCfg[w.status] || statusCfg.pending
									return (
										<TableRow key={w.id}>
											<TableCell className="font-mono text-xs">#{w.id}</TableCell>
											<TableCell className="text-sm">{new Date(w.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
											<TableCell className="text-sm">{w.bankName} - {w.bankAccountNumber}</TableCell>
											<TableCell className="text-right font-medium">{fmt(w.amount)}</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline" className={st.cls}>{st.label}</Badge>
												{w.status === "rejected" && w.rejectedReason && (
													<p className="text-[10px] text-red-500 mt-0.5">{w.rejectedReason}</p>
												)}
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* Withdraw Dialog */}
			<Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Tarik Dana</DialogTitle>
						<DialogDescription>Saldo akan ditransfer ke rekening {finance?.bank?.bankName} - {finance?.bank?.accountNumber} a/n {finance?.bank?.accountHolder}</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Jumlah Penarikan</Label>
							<Input
								type="number"
								placeholder="Minimal Rp 10.000"
								value={withdrawAmount}
								onChange={(e) => setWithdrawAmount(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">Saldo tersedia: {fmt(finance?.balance || 0)}</p>
						</div>
						<Button variant="outline" size="sm" onClick={() => setWithdrawAmount(String(finance?.balance || 0))}>Tarik Semua</Button>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Batal</Button>
						<Button onClick={() => withdrawMutation.mutate()} disabled={withdrawMutation.isPending}>
							{withdrawMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Konfirmasi Penarikan
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
