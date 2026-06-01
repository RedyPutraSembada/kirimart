"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import Image from "next/image"
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
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
	Search, MoreHorizontal, ShieldAlert, Package, PackageX, CheckCircle, Trash2
} from "lucide-react"
import { useGetAdminProducts } from "@/app/data/admin-dashboard/product/product-data"
import { banProductAction, unbanProductAction, deleteProductAction } from "@/actions/admin-dashboard/product/product.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useState } from "react"
import { useDebounce } from "use-debounce"
import PaginationBar from "@/components/table/pagination-bar"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function ProductList() {
	const queryClient = useQueryClient()
	
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const resPerPage = [10, 20, 50, 100]

	const [filters, setFilters] = useState({ search: '', status: 'all' })
	const [debouncedSearch] = useDebounce(filters.search, 1000)

	// Modals State
	const [banModal, setBanModal] = useState({ open: false, product: null, reason: '' })
	const [unbanConfirm, setUnbanConfirm] = useState(null)
	const [deleteConfirm, setDeleteConfirm] = useState(null)

	const { data: productsData, isLoading, error } = useGetAdminProducts(
		{ 
			search: debouncedSearch, 
			status: filters.status !== 'all' ? filters.status : undefined 
		},
		page, pageSize
	)

	const handleSearchChange = (value) => setFilters((prev) => ({ ...prev, search: value }))
	const handleStatusFilter = (value) => { setFilters((prev) => ({ ...prev, status: value })); setPage(1) }
	
	const handlePerPageChange = (value) => {
		const newPageSize = value === 'all' ? -1 : Number(value)
		if (newPageSize !== pageSize) {
			setPageSize(newPageSize)
			setPage(1)
		}
	}

	const handlePageChange = (value) => setPage(value)

	// Mutations
	const banMutation = useMutation({
		mutationFn: (data) => banProductAction(data.id, { banReason: data.reason }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-products"] })
			toast.success("Produk berhasil diblokir")
			setBanModal({ open: false, product: null, reason: '' })
		},
		onError: (error) => toast.error(error.message)
	})

	const unbanMutation = useMutation({
		mutationFn: (id) => unbanProductAction(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-products"] })
			toast.success("Blokir produk berhasil dibuka")
			setUnbanConfirm(null)
		},
		onError: (error) => toast.error(error.message)
	})

	const deleteMutation = useMutation({
		mutationFn: (id) => deleteProductAction(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-products"] })
			toast.success("Produk berhasil dihapus secara permanen")
			setDeleteConfirm(null)
		},
		onError: (error) => toast.error(error.message)
	})

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Moderasi Produk</h1>
				<p className="text-muted-foreground">Kelola katalog produk dari seluruh toko dan lakukan pemblokiran terhadap produk yang melanggar.</p>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Cari nama produk..."
								className="pl-9"
								value={filters.search}
								onChange={(e) => handleSearchChange(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Select value={filters.status} onValueChange={handleStatusFilter}>
								<SelectTrigger className="w-[150px]">
									<SelectValue placeholder="Semua Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Status</SelectItem>
									<SelectItem value="active">Aktif</SelectItem>
									<SelectItem value="inactive">Nonaktif</SelectItem>
									<SelectItem value="banned">Banned</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				{isLoading && <CardContent><div className="py-8 text-center text-muted-foreground">Loading...</div></CardContent>}
				{productsData && (
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[50px]">No</TableHead>
										<TableHead>Produk</TableHead>
										<TableHead>Toko Pemilik</TableHead>
										<TableHead className="text-right">Harga</TableHead>
										<TableHead className="text-right">Stok</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-center w-[70px]">Aksi</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{productsData.data.length === 0 && (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data produk ditemukan.</TableCell>
										</TableRow>
									)}
									{productsData.data.map((p, i) => {
										const primaryImage = p.images?.[0]?.imageUrl
										return (
											<TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
												<TableCell className="text-muted-foreground text-center">{(page - 1) * pageSize + i + 1}</TableCell>
												<TableCell>
													<div className="flex items-center gap-3">
														{primaryImage ? (
															<div className="relative h-10 w-10 rounded border overflow-hidden bg-muted shrink-0">
																<Image src={primaryImage} alt={p.name} fill sizes="40px" className="object-cover" />
															</div>
														) : (
															<div className="h-10 w-10 rounded border bg-muted flex items-center justify-center text-muted-foreground">
																<Package className="h-5 w-5" />
															</div>
														)}
														<div className="min-w-0">
															<p className="font-medium line-clamp-2 max-w-[200px]">{p.name}</p>
															<span className="text-xs text-muted-foreground truncate">{p.category?.name || "Kategori terhapus"}</span>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex flex-col">
														<span className="font-medium text-sm">{p.store?.name || "Toko dihapus"}</span>
														<span className="text-xs text-muted-foreground">/{p.store?.domainSlug || "-"}</span>
													</div>
												</TableCell>
												<TableCell className="text-right">
													<div className="flex flex-col items-end">
														<span className="font-medium">{fmt(p.basePrice)}</span>
														{p.originalPrice && <span className="text-xs text-muted-foreground line-through">{fmt(p.originalPrice)}</span>}
													</div>
												</TableCell>
												<TableCell className="text-right">
													{p.baseStock}
												</TableCell>
												<TableCell className="text-center">
													{p.status === "banned" ? (
														<Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950">Banned</Badge>
													) : p.status === "active" ? (
														<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">Aktif</Badge>
													) : (
														<Badge variant="outline" className="bg-muted text-muted-foreground">
															{p.status.replace("_", " ")}
														</Badge>
													)}
												</TableCell>
												<TableCell className="text-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{p.status === "banned" ? (
																<DropdownMenuItem onClick={() => setUnbanConfirm(p)}>
																	<CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />Buka Blokir Produk
																</DropdownMenuItem>
															) : (
																<DropdownMenuItem onClick={() => setBanModal({ open: true, product: p, reason: '' })}>
																	<PackageX className="mr-2 h-4 w-4 text-amber-600" />Blokir Produk
																</DropdownMenuItem>
															)}
															
															<DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteConfirm(p)}>
																<Trash2 className="mr-2 h-4 w-4" />Hapus Permanen
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
						<PaginationBar
							pageSize={pageSize}
							page={page}
							handlePerPage={handlePerPageChange}
							pageCount={Math.ceil((productsData.total || 0) / pageSize)}
							pageIndex={page - 1}
							handlePage={handlePageChange}
							resPerPage={resPerPage}
						/>
					</CardContent>
				)}
			</Card>

			{/* Modal Ban Product */}
			<Dialog open={banModal.open} onOpenChange={(open) => !open && setBanModal({ ...banModal, open: false })}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-amber-600 flex items-center gap-2">
							<ShieldAlert className="h-5 w-5" /> Blokir Produk
						</DialogTitle>
						<DialogDescription>
							Produk yang diblokir tidak akan tampil di halaman utama, etalase toko, maupun di pencarian pembeli. Harap berikan alasan pemblokiran.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<div className="space-y-2">
							<Label>Alasan Pemblokiran (Opsional)</Label>
							<Textarea 
								placeholder="Contoh: Barang bajakan / melanggar kebijakan platform..." 
								value={banModal.reason}
								onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBanModal({ ...banModal, open: false })}>Batal</Button>
						<Button variant="destructive" onClick={() => banMutation.mutate({ id: banModal.product.id, reason: banModal.reason })} disabled={banMutation.isPending}>
							{banMutation.isPending ? "Memproses..." : "Blokir Produk"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Unban Confirmation */}
			<ConfirmationDialog
				open={!!unbanConfirm}
				onClose={() => setUnbanConfirm(null)}
				title='Buka Blokir Produk?'
				description={`Apakah Anda yakin ingin memulihkan status produk ${unbanConfirm?.name}? Produk akan dikembalikan ke status Nonaktif untuk di-review penjual.`}
				confirmText='Buka Blokir'
				cancelText='Batal'
				isLoading={unbanMutation.isPending}
				onConfirm={() => {
					if (unbanConfirm) {
						unbanMutation.mutate(unbanConfirm.id)
					}
				}}
			/>

			{/* Delete Confirmation */}
			<ConfirmationDialog
				open={!!deleteConfirm}
				onClose={() => setDeleteConfirm(null)}
				title='Hapus Permanen Produk?'
				description={`PERINGATAN: Tindakan ini akan menghapus produk ${deleteConfirm?.name} secara permanen beserta semua gambar dan ulasannya.`}
				confirmText='Hapus Permanen'
				cancelText='Batal'
				isLoading={deleteMutation.isPending}
				onConfirm={() => {
					if (deleteConfirm) {
						deleteMutation.mutate(deleteConfirm.id)
					}
				}}
			/>
		</div>
	)
}
