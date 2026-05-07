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
import {
	Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Package,
	Filter, ArrowUpDown, Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"

const products = [
	{ id: 1, name: "Sepatu Nike Air Max 270", category: "Sepatu", price: 1250000, stock: 24, sold: 42, weight: 800, status: "active" },
	{ id: 2, name: "Kaos Polos Cotton Combed 30s", category: "Pakaian", price: 75000, stock: 150, sold: 38, weight: 200, status: "active" },
	{ id: 3, name: "Tas Ransel Eiger Borneo 28L", category: "Tas", price: 450000, stock: 12, sold: 25, weight: 1200, status: "active" },
	{ id: 4, name: "Jam Tangan Casio G-Shock", category: "Aksesoris", price: 875000, stock: 8, sold: 18, weight: 300, status: "active" },
	{ id: 5, name: "Celana Jeans Slim Fit Stretch", category: "Pakaian", price: 320000, stock: 0, sold: 15, weight: 500, status: "out_of_stock" },
	{ id: 6, name: "Topi Baseball Polo", category: "Aksesoris", price: 189000, stock: 35, sold: 12, weight: 150, status: "active" },
	{ id: 7, name: "Sandal Adidas Adilette", category: "Sepatu", price: 399000, stock: 5, sold: 9, weight: 400, status: "low_stock" },
	{ id: 8, name: "Dompet Kulit Pria Premium", category: "Aksesoris", price: 275000, stock: 20, sold: 7, weight: 200, status: "active" },
]

const statusCfg = {
	active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
	out_of_stock: { label: "Habis", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
	low_stock: { label: "Stok Menipis", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function ProductList() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Daftar Produk</h1>
					<p className="text-muted-foreground">Kelola semua produk yang ada di toko Anda.</p>
				</div>
				<Button asChild>
					<Link href="/seller-dashboard/products/new">
						<Plus className="mr-2 h-4 w-4" />
						Tambah Produk
					</Link>
				</Button>
			</div>

			<div className="grid gap-4 sm:grid-cols-3">
				{[
					{ label: "Total Produk", val: products.length, color: "text-blue-600", bg: "bg-blue-500/10" },
					{ label: "Produk Aktif", val: products.filter(p => p.status === 'active').length, color: "text-emerald-600", bg: "bg-emerald-500/10" },
					{ label: "Stok Habis", val: products.filter(p => p.status === 'out_of_stock').length, color: "text-red-600", bg: "bg-red-500/10" },
				].map(s => (
					<Card key={s.label}>
						<CardContent className="flex items-center gap-3 pt-6">
							<div className={`rounded-lg p-2.5 ${s.bg}`}><Package className={`h-5 w-5 ${s.color}`} /></div>
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
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input placeholder="Cari produk..." className="pl-9" />
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" />Filter</Button>
							<Button variant="outline" size="sm"><ArrowUpDown className="mr-2 h-4 w-4" />Urutkan</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-[50px]">No</TableHead>
									<TableHead>Produk</TableHead>
									<TableHead>Kategori</TableHead>
									<TableHead className="text-right">Harga</TableHead>
									<TableHead className="text-center">Stok</TableHead>
									<TableHead className="text-center">Terjual</TableHead>
									<TableHead className="text-center">Status</TableHead>
									<TableHead className="text-center w-[70px]">Aksi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((p, i) => {
									const st = statusCfg[p.status]
									return (
										<TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
											<TableCell className="text-muted-foreground text-center">{i + 1}</TableCell>
											<TableCell>
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
														<ImageIcon className="h-4 w-4 text-muted-foreground" />
													</div>
													<div className="min-w-0">
														<p className="font-medium truncate max-w-[200px] lg:max-w-[300px]">{p.name}</p>
														<p className="text-xs text-muted-foreground">{p.weight}g</p>
													</div>
												</div>
											</TableCell>
											<TableCell><Badge variant="secondary" className="font-normal">{p.category}</Badge></TableCell>
											<TableCell className="text-right font-medium">{fmt(p.price)}</TableCell>
											<TableCell className="text-center">
												<span className={p.stock === 0 ? "text-red-600 font-semibold" : p.stock <= 5 ? "text-amber-600 font-semibold" : ""}>{p.stock}</span>
											</TableCell>
											<TableCell className="text-center text-muted-foreground">{p.sold}</TableCell>
											<TableCell className="text-center"><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
											<TableCell className="text-center">
												<DropdownMenu>
													<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Lihat</DropdownMenuItem>
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
					<div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
						<p>Menampilkan 1-{products.length} dari {products.length} produk</p>
						<div className="flex gap-2">
							<Button variant="outline" size="sm" disabled>Sebelumnya</Button>
							<Button variant="outline" size="sm" disabled>Selanjutnya</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
