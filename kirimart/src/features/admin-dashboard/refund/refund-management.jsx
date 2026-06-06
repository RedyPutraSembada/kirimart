"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { processRefund } from "@/actions/admin-dashboard/refund.actions"
import { useGetAllRefundRequests } from "@/app/data/admin-dashboard/refund/refund-data"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle2, RotateCcw, AlertTriangle, Clock, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const statusCfg = {
	pending: { label: "Menunggu", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
	processed: { label: "Sudah Transfer", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
}

export function RefundManagement() {
	const queryClient = useQueryClient()
	const [processDialog, setProcessDialog] = useState(null)
	const [formData, setFormData] = useState({ amount: "", notes: "", proofUrl: "" })

	const { data: queryData, isLoading } = useGetAllRefundRequests()
	const refunds = queryData?.data || []

	const processMutation = useMutation({
		mutationFn: ({ id, amount, proofUrl, notes }) => processRefund(id, amount, proofUrl, notes),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["admin-refunds"] })
				setProcessDialog(null)
				setFormData({ amount: "", notes: "", proofUrl: "" })
			} else {
				toast.error(result.error)
			}
		},
	})

	const counts = {
		all: refunds.length,
		pending: refunds.filter(r => r.status === "pending").length,
		processed: refunds.filter(r => r.status === "processed").length,
	}

	// Hitung berapa yang sudah isi bank info
	const pendingWithBank = refunds.filter(r => r.status === "pending" && r.bankName).length

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat data refund...</p>
			</div>
		)
	}

	function RefundTable({ data }) {
		return (
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ID</TableHead>
							<TableHead>Order</TableHead>
							<TableHead>Pembeli</TableHead>
							<TableHead>Alasan</TableHead>
							<TableHead>Rekening Tujuan</TableHead>
							<TableHead className="text-right">Nominal Asal</TableHead>
							<TableHead className="text-right">Ditransfer</TableHead>
							<TableHead className="text-center">Status</TableHead>
							<TableHead className="text-center">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.length === 0 ? (
							<TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
						) : data.map(r => {
							const st = statusCfg[r.status] || statusCfg.pending
							const hasBankInfo = r.bankName && r.bankAccountNumber
							return (
								<TableRow key={r.id}>
									<TableCell className="font-mono text-xs">#{r.id}</TableCell>
									<TableCell className="text-sm">
										<p className="font-medium">Order #{r.orderId}</p>
										<p className="text-xs text-muted-foreground">{r.order?.store?.name || "-"}</p>
										{r.complaint && (
											<p className="text-[10px] text-amber-600 mt-0.5">⚠️ Komplain: {r.complaint.reason?.substring(0, 40)}...</p>
										)}
									</TableCell>
									<TableCell className="text-sm">
										<p className="font-medium">{r.user?.name || "-"}</p>
										<p className="text-xs text-muted-foreground">{r.user?.email || "-"}</p>
									</TableCell>
									<TableCell className="text-sm max-w-[150px]">
										{r.complaint ? (
											<p className="text-xs truncate">{r.complaint.reason}</p>
										) : (
											<p className="text-xs text-muted-foreground italic">Batal oleh penjual</p>
										)}
									</TableCell>
									<TableCell className="text-sm">
										{hasBankInfo ? (
											<>
												<p className="font-medium">{r.bankName}</p>
												<p className="text-xs text-muted-foreground font-mono">{r.bankAccountNumber}</p>
												<p className="text-xs text-muted-foreground">a/n {r.bankAccountHolder}</p>
											</>
										) : (
											<span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Belum diisi</span>
										)}
									</TableCell>
									<TableCell className="text-right font-bold text-primary">{fmt(r.amountRequested)}</TableCell>
									<TableCell className="text-right">
										{r.amountRefunded ? fmt(r.amountRefunded) : <span className="text-xs text-muted-foreground">-</span>}
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="outline" className={st.cls}>{st.label}</Badge>
										{r.notes && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] mx-auto">{r.notes}</p>}
									</TableCell>
									<TableCell className="text-center">
										{r.status === "pending" && hasBankInfo && (
											<Button
												size="sm"
												variant="outline"
												className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
												onClick={() => {
													setProcessDialog(r)
													setFormData({
														amount: String(r.amountRequested),
														notes: "",
														proofUrl: "",
													})
												}}
											>
												<CheckCircle2 className="h-3 w-3 mr-1" />Proses
											</Button>
										)}
										{r.status === "pending" && !hasBankInfo && (
											<span className="text-[10px] text-amber-600">Menunggu data bank</span>
										)}
										{r.status === "processed" && (
											<span className="text-xs text-emerald-600">✓ Sudah ditransfer</span>
										)}
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Manajemen Refund</h1>
				<p className="text-muted-foreground">Proses pengembalian dana kepada pembeli secara manual.</p>
			</div>

			{/* Summary */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
						<div><p className="text-sm text-muted-foreground">Perlu Diproses</p><p className="text-2xl font-bold">{counts.pending}</p>
							{pendingWithBank > 0 && <p className="text-xs text-emerald-600">{pendingWithBank} siap transfer</p>}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
						<div><p className="text-sm text-muted-foreground">Selesai</p><p className="text-2xl font-bold">{counts.processed}</p></div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-primary/10"><RotateCcw className="h-5 w-5 text-primary" /></div>
						<div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{counts.all}</p></div>
					</CardContent>
				</Card>
			</div>

			{/* Table */}
			<Card>
				<CardContent className="pt-6">
					<Tabs defaultValue="pending">
						<TabsList className="mb-4">
							<TabsTrigger value="pending">Menunggu ({counts.pending})</TabsTrigger>
							<TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
							<TabsTrigger value="processed">Selesai ({counts.processed})</TabsTrigger>
						</TabsList>
						<TabsContent value="pending"><RefundTable data={refunds.filter(r => r.status === "pending")} /></TabsContent>
						<TabsContent value="all"><RefundTable data={refunds} /></TabsContent>
						<TabsContent value="processed"><RefundTable data={refunds.filter(r => r.status === "processed")} /></TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Process Refund Dialog */}
			<Dialog open={!!processDialog} onOpenChange={(open) => !open && setProcessDialog(null)}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Proses Refund #{processDialog?.id}</DialogTitle>
						<DialogDescription>
							Transfer ke: {processDialog?.bankName} — {processDialog?.bankAccountNumber} (a/n {processDialog?.bankAccountHolder})
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						<div className="space-y-2">
							<Label>Nominal Asal (Grand Total Pesanan)</Label>
							<p className="text-lg font-bold text-primary">{processDialog ? fmt(processDialog.amountRequested) : "-"}</p>
						</div>
						<div className="space-y-2">
							<Label>Nominal yang Ditransfer (Setelah Potongan)</Label>
							<Input
								type="number"
								placeholder="Masukkan nominal final..."
								value={formData.amount}
								onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
							/>
							<p className="text-xs text-muted-foreground">Bisa lebih kecil dari nominal asal jika ada biaya admin/transfer.</p>
						</div>
						<div className="space-y-2">
							<Label>Catatan (Opsional)</Label>
							<Textarea
								placeholder="Contoh: Dikurangi biaya admin transfer Rp 5.000"
								value={formData.notes}
								onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
								rows={2}
							/>
						</div>
						<div className="space-y-2">
							<Label>URL Bukti Transfer (Opsional)</Label>
							<Input
								placeholder="https://..."
								value={formData.proofUrl}
								onChange={(e) => setFormData(prev => ({ ...prev, proofUrl: e.target.value }))}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setProcessDialog(null)}>Batal</Button>
						<Button
							onClick={() => processMutation.mutate({
								id: processDialog.id,
								amount: parseInt(formData.amount),
								proofUrl: formData.proofUrl || null,
								notes: formData.notes || "",
							})}
							disabled={processMutation.isPending || !formData.amount}
						>
							{processMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Konfirmasi Transfer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
