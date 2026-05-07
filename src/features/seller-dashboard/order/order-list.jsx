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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	Search, MoreHorizontal, Eye, Truck, CheckCircle2, Clock, ShoppingCart, Package, CircleDollarSign,
} from "lucide-react"

const orders = [
	{ id: "ORD-001", customer: "Budi Santoso", product: "Sepatu Nike Air Max", qty: 1, total: 1270000, status: "paid", date: "7 Mei 2026", shipping: 20000 },
	{ id: "ORD-002", customer: "Siti Rahayu", product: "Kaos Polos Premium ×2", qty: 2, total: 165000, status: "shipped", date: "6 Mei 2026", shipping: 15000, resi: "JNE-12345678" },
	{ id: "ORD-003", customer: "Ahmad Fauzi", product: "Tas Ransel Outdoor", qty: 1, total: 470000, status: "completed", date: "5 Mei 2026", shipping: 20000 },
	{ id: "ORD-004", customer: "Dewi Lestari", product: "Jam Tangan Casio", qty: 1, total: 890000, status: "pending", date: "5 Mei 2026", shipping: 15000 },
	{ id: "ORD-005", customer: "Rudi Hartono", product: "Celana Jeans Slim ×2", qty: 2, total: 655000, status: "paid", date: "4 Mei 2026", shipping: 15000 },
	{ id: "ORD-006", customer: "Maya Putri", product: "Topi Baseball", qty: 1, total: 204000, status: "completed", date: "3 Mei 2026", shipping: 15000 },
	{ id: "ORD-007", customer: "Eko Prasetyo", product: "Dompet Kulit", qty: 1, total: 295000, status: "shipped", date: "2 Mei 2026", shipping: 20000, resi: "JNT-87654321" },
]

const statusCfg = {
	pending: { label: "Menunggu Bayar", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950", icon: Clock },
	paid: { label: "Dibayar", cls: "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950", icon: CircleDollarSign },
	shipped: { label: "Dikirim", cls: "border-violet-300 text-violet-700 bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:bg-violet-950", icon: Truck },
	completed: { label: "Selesai", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950", icon: CheckCircle2 },
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

function OrderTable({ data }) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID Pesanan</TableHead>
						<TableHead>Pelanggan</TableHead>
						<TableHead className="hidden md:table-cell">Produk</TableHead>
						<TableHead className="text-right">Total</TableHead>
						<TableHead className="text-center">Status</TableHead>
						<TableHead className="hidden lg:table-cell">Tanggal</TableHead>
						<TableHead className="text-center w-[70px]">Aksi</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.length === 0 ? (
						<TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Belum ada pesanan.</TableCell></TableRow>
					) : data.map(o => {
						const st = statusCfg[o.status]
						return (
							<TableRow key={o.id} className="hover:bg-muted/50 transition-colors">
								<TableCell className="font-mono text-xs font-medium">{o.id}</TableCell>
								<TableCell className="font-medium">{o.customer}</TableCell>
								<TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[180px]">{o.product}</TableCell>
								<TableCell className="text-right font-medium">{fmt(o.total)}</TableCell>
								<TableCell className="text-center">
									<Badge variant="outline" className={st.cls}>{st.label}</Badge>
								</TableCell>
								<TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{o.date}</TableCell>
								<TableCell className="text-center">
									<DropdownMenu>
										<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Detail Pesanan</DropdownMenuItem>
											{o.status === "paid" && <DropdownMenuItem><Truck className="mr-2 h-4 w-4" />Input Resi</DropdownMenuItem>}
											{o.status === "shipped" && <DropdownMenuItem><CheckCircle2 className="mr-2 h-4 w-4" />Tandai Selesai</DropdownMenuItem>}
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}

export function OrderList() {
	const counts = {
		all: orders.length,
		pending: orders.filter(o => o.status === "pending").length,
		paid: orders.filter(o => o.status === "paid").length,
		shipped: orders.filter(o => o.status === "shipped").length,
		completed: orders.filter(o => o.status === "completed").length,
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Pesanan Masuk</h1>
				<p className="text-muted-foreground">Kelola semua pesanan yang masuk ke toko Anda.</p>
			</div>

			{/* Summary */}
			<div className="grid gap-4 sm:grid-cols-4">
				{[
					{ label: "Menunggu Bayar", val: counts.pending, color: "text-amber-600", bg: "bg-amber-500/10", icon: Clock },
					{ label: "Perlu Diproses", val: counts.paid, color: "text-blue-600", bg: "bg-blue-500/10", icon: Package },
					{ label: "Dalam Pengiriman", val: counts.shipped, color: "text-violet-600", bg: "bg-violet-500/10", icon: Truck },
					{ label: "Selesai", val: counts.completed, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 },
				].map(s => (
					<Card key={s.label}>
						<CardContent className="flex items-center gap-3 pt-6">
							<div className={`rounded-lg p-2.5 ${s.bg}`}><s.icon className={`h-5 w-5 ${s.color}`} /></div>
							<div>
								<p className="text-sm text-muted-foreground">{s.label}</p>
								<p className="text-2xl font-bold">{s.val}</p>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Order Table with Tabs */}
			<Card>
				<CardHeader className="pb-3">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input placeholder="Cari pesanan..." className="pl-9" />
					</div>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="all">
						<TabsList className="mb-4">
							<TabsTrigger value="all">Semua ({counts.all})</TabsTrigger>
							<TabsTrigger value="paid">Perlu Diproses ({counts.paid})</TabsTrigger>
							<TabsTrigger value="shipped">Dikirim ({counts.shipped})</TabsTrigger>
							<TabsTrigger value="completed">Selesai ({counts.completed})</TabsTrigger>
						</TabsList>
						<TabsContent value="all"><OrderTable data={orders} /></TabsContent>
						<TabsContent value="paid"><OrderTable data={orders.filter(o => o.status === "paid")} /></TabsContent>
						<TabsContent value="shipped"><OrderTable data={orders.filter(o => o.status === "shipped")} /></TabsContent>
						<TabsContent value="completed"><OrderTable data={orders.filter(o => o.status === "completed")} /></TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	)
}
