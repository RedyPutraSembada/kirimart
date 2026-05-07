"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
	DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Copy, Tag, CalendarDays } from "lucide-react"

const vouchers = [
	{ id: 1, code: "DISKON10K", discount: 10000, type: "fixed", minPurchase: 100000, usage: 45, maxUsage: 100, status: "active", validUntil: "31 Mei 2026" },
	{ id: 2, code: "WELCOME20", discount: 20000, type: "fixed", minPurchase: 150000, usage: 12, maxUsage: 50, status: "active", validUntil: "30 Jun 2026" },
	{ id: 3, code: "FLASH50K", discount: 50000, type: "fixed", minPurchase: 500000, usage: 30, maxUsage: 30, status: "expired", validUntil: "1 Mei 2026" },
	{ id: 4, code: "HEMAT15", discount: 15000, type: "fixed", minPurchase: 200000, usage: 8, maxUsage: 25, status: "active", validUntil: "15 Jun 2026" },
]

const statusCfg = {
	active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
	expired: { label: "Kedaluwarsa", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function VoucherList() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Voucher & Diskon</h1>
					<p className="text-muted-foreground">Buat kode promo untuk menarik pembeli ke toko Anda.</p>
				</div>
				<Button><Plus className="mr-2 h-4 w-4" />Buat Voucher</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				{[
					{ label: "Total Voucher", val: vouchers.length, color: "text-violet-600", bg: "bg-violet-500/10" },
					{ label: "Voucher Aktif", val: vouchers.filter(v => v.status === 'active').length, color: "text-emerald-600", bg: "bg-emerald-500/10" },
					{ label: "Total Digunakan", val: vouchers.reduce((a, v) => a + v.usage, 0), color: "text-blue-600", bg: "bg-blue-500/10" },
				].map(s => (
					<Card key={s.label}>
						<CardContent className="flex items-center gap-3 pt-6">
							<div className={`rounded-lg p-2.5 ${s.bg}`}><Tag className={`h-5 w-5 ${s.color}`} /></div>
							<div>
								<p className="text-sm text-muted-foreground">{s.label}</p>
								<p className="text-2xl font-bold">{s.val}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<Card>
				<CardHeader className="pb-4">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input placeholder="Cari kode voucher..." className="pl-9" />
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Kode Voucher</TableHead>
									<TableHead className="text-right">Potongan</TableHead>
									<TableHead className="text-right hidden md:table-cell">Min. Belanja</TableHead>
									<TableHead className="text-center">Digunakan</TableHead>
									<TableHead className="text-center hidden md:table-cell">Berlaku Sampai</TableHead>
									<TableHead className="text-center">Status</TableHead>
									<TableHead className="text-center w-[70px]">Aksi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{vouchers.map(v => {
									const st = statusCfg[v.status]
									return (
										<TableRow key={v.id} className="hover:bg-muted/50 transition-colors">
											<TableCell>
												<div className="flex items-center gap-2">
													<code className="rounded bg-muted px-2 py-0.5 text-sm font-semibold">{v.code}</code>
													<button className="text-muted-foreground hover:text-foreground transition-colors"><Copy className="h-3.5 w-3.5" /></button>
												</div>
											</TableCell>
											<TableCell className="text-right font-medium">{fmt(v.discount)}</TableCell>
											<TableCell className="text-right text-muted-foreground hidden md:table-cell">{fmt(v.minPurchase)}</TableCell>
											<TableCell className="text-center">
												<span className={v.usage >= v.maxUsage ? "text-red-600 font-semibold" : ""}>{v.usage}/{v.maxUsage}</span>
											</TableCell>
											<TableCell className="text-center text-muted-foreground text-sm hidden md:table-cell">
												<div className="flex items-center justify-center gap-1">
													<CalendarDays className="h-3.5 w-3.5" />{v.validUntil}
												</div>
											</TableCell>
											<TableCell className="text-center"><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
											<TableCell className="text-center">
												<DropdownMenu>
													<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
														<DropdownMenuItem className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" />Hapus</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
