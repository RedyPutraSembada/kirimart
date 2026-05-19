"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { processWithdrawal } from "@/actions/admin-dashboard/withdrawal.actions"
import { useGetAllWithdrawals } from "@/app/data/admin-dashboard/withdrawal/withdrawal-data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Loader2, CheckCircle2, XCircle, Banknote } from "lucide-react"
import { toast } from "sonner"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

const statusCfg = {
	pending: { label: "Menunggu", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
	completed: { label: "Selesai", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
	rejected: { label: "Ditolak", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
}

export function WithdrawalManagement() {
	const queryClient = useQueryClient()
	const [rejectDialog, setRejectDialog] = useState(null)
	const [rejectReason, setRejectReason] = useState("")

	const { data: queryData, isLoading } = useGetAllWithdrawals()

	const withdrawals = queryData?.data || []

	const approveMutation = useMutation({
		mutationFn: (id) => processWithdrawal(id, "completed"),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] })
			} else {
				toast.error(result.error)
			}
		},
	})

	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }) => processWithdrawal(id, "rejected", reason),
		onSuccess: (result) => {
			if (result.success) {
				toast.success(result.message)
				queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] })
				setRejectDialog(null)
				setRejectReason("")
			} else {
				toast.error(result.error)
			}
		},
	})

	const counts = {
		all: withdrawals.length,
		pending: withdrawals.filter(w => w.status === "pending").length,
		completed: withdrawals.filter(w => w.status === "completed").length,
		rejected: withdrawals.filter(w => w.status === "rejected").length,
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-20 space-y-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-sm text-muted-foreground">Memuat data penarikan...</p>
			</div>
		)
	}

	function WithdrawalTable({ data }) {
		return (
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>ID</TableHead>
							<TableHead>Toko</TableHead>
							<TableHead>Tujuan Transfer</TableHead>
							<TableHead className="text-right">Jumlah</TableHead>
							<TableHead className="text-center">Status</TableHead>
							<TableHead>Tanggal</TableHead>
							<TableHead className="text-center">Aksi</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.length === 0 ? (
							<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Tidak ada data.</TableCell></TableRow>
						) : data.map(w => {
							const st = statusCfg[w.status] || statusCfg.pending
							return (
								<TableRow key={w.id}>
									<TableCell className="font-mono text-xs">#{w.id}</TableCell>
									<TableCell className="font-medium text-sm">{w.store?.name || "-"}</TableCell>
									<TableCell className="text-sm">
										<p className="font-medium">{w.bankName}</p>
										<p className="text-xs text-muted-foreground font-mono">{w.bankAccountNumber}</p>
										<p className="text-xs text-muted-foreground">a/n {w.bankAccountHolder}</p>
									</TableCell>
									<TableCell className="text-right font-bold text-primary">{fmt(w.amount)}</TableCell>
									<TableCell className="text-center">
										<Badge variant="outline" className={st.cls}>{st.label}</Badge>
										{w.rejectedReason && <p className="text-[10px] text-red-500 mt-0.5 max-w-[120px] mx-auto">{w.rejectedReason}</p>}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{new Date(w.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
									</TableCell>
									<TableCell className="text-center">
										{w.status === "pending" && (
											<div className="flex gap-1 justify-center">
												<Button
													size="sm"
													variant="outline"
													className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
													onClick={() => approveMutation.mutate(w.id)}
													disabled={approveMutation.isPending}
												>
													<CheckCircle2 className="h-3 w-3 mr-1" />Setuju
												</Button>
												<Button
													size="sm"
													variant="outline"
													className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
													onClick={() => { setRejectDialog(w); setRejectReason("") }}
												>
													<XCircle className="h-3 w-3 mr-1" />Tolak
												</Button>
											</div>
										)}
										{w.status === "completed" && <span className="text-xs text-emerald-600">✓ Sudah ditransfer</span>}
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
				<h1 className="text-2xl font-bold tracking-tight">Manajemen Penarikan Dana</h1>
				<p className="text-muted-foreground">Proses permintaan pencairan saldo dari penjual.</p>
			</div>

			{/* Summary */}
			<div className="grid gap-4 sm:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-amber-500/10"><Banknote className="h-5 w-5 text-amber-600" /></div>
						<div><p className="text-sm text-muted-foreground">Perlu Diproses</p><p className="text-2xl font-bold">{counts.pending}</p></div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
						<div><p className="text-sm text-muted-foreground">Selesai</p><p className="text-2xl font-bold">{counts.completed}</p></div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 pt-6">
						<div className="rounded-lg p-2.5 bg-red-500/10"><XCircle className="h-5 w-5 text-red-600" /></div>
						<div><p className="text-sm text-muted-foreground">Ditolak</p><p className="text-2xl font-bold">{counts.rejected}</p></div>
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
							<TabsTrigger value="completed">Selesai ({counts.completed})</TabsTrigger>
						</TabsList>
						<TabsContent value="pending"><WithdrawalTable data={withdrawals.filter(w => w.status === "pending")} /></TabsContent>
						<TabsContent value="all"><WithdrawalTable data={withdrawals} /></TabsContent>
						<TabsContent value="completed"><WithdrawalTable data={withdrawals.filter(w => w.status === "completed")} /></TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			{/* Reject Dialog */}
			<Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Tolak Penarikan #{rejectDialog?.id}</DialogTitle>
						<DialogDescription>Berikan alasan penolakan. Saldo akan dikembalikan ke toko.</DialogDescription>
					</DialogHeader>
					<div className="space-y-2 py-2">
						<Label>Alasan Penolakan</Label>
						<Textarea
							placeholder="Contoh: Data rekening tidak valid, silakan hubungi CS."
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							rows={3}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRejectDialog(null)}>Batal</Button>
						<Button variant="destructive" onClick={() => rejectMutation.mutate({ id: rejectDialog.id, reason: rejectReason })} disabled={rejectMutation.isPending}>
							{rejectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Konfirmasi Tolak
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
