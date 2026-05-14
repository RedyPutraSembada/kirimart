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
import { useGetSellerProducts } from "@/app/data/seller-dashboard/product/product-data"
import Image from "next/image"
import { deleteProduct } from "@/actions/seller-dashboard/product/product.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useState } from "react"
import { ViewProductModal } from "./view/view-product"
import { useDebounce } from 'use-debounce';
import PaginationBar from "@/components/table/pagination-bar"

const statusCfg = {
	active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
	out_of_stock: { label: "Habis", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
	low_stock: { label: "Stok Menipis", cls: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950" },
	// Tambahkan status lain yang mungkin datang dari backend
	draft: { label: "Draft", cls: "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-950" },
	inactive: { label: "Nonaktif", cls: "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-950" },
}

// Fallback jika status tidak dikenali
const DEFAULT_STATUS = { label: "Tidak Diketahui", cls: "border-gray-300 text-gray-500 bg-gray-50" }

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

export function ProductList() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const [deleteConfirm, setDeleteConfirm] = useState(null)
	const [viewProduct, setViewProduct] = useState(null)
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(5)
	const resPerPage = [5, 10, 20, 50]

	const initialFilterState = {
		name_product: '',
	}

	const [filters, setFilters] = useState(initialFilterState)

	const [debouncedNameProduct] = useDebounce(filters.name_product, 1000)

	const { data: products, isLoading: isLoadingProducts, error: errorProducts, refetch: refetchProducts } = useGetSellerProducts({
		...filters,
		name_product: debouncedNameProduct,
	}, page, pageSize);

	const handleNameProductChange = (value) => {
		setFilters((prevFilters) => ({
			...prevFilters,
			name_product: value,
		}))
	}

	const handlePerPageChange = (value) => {
		const newPageSize = value === 'all' ? -1 : Number(value)
		if (newPageSize !== pageSize) {
			setPageSize(newPageSize)
			setPage(1)
		}
	}

	const handlePageChange = (value) => {
		setPage(value)
	}
	
	console.log("products", products);

	const deleteMutation = useMutation({
		mutationFn: deleteProduct,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["seller-products"] })
			toast.success("Produk berhasil dihapus")
		},
		onError: (error) => {
			toast.error(error.message)
		}
	})

	const handleViewProduct = (productId) => {
		setViewProduct(productId)
	}

	const handleEditProduct = (productId) => {
		router.push(`/seller-dashboard/products/${productId}/edit`)
	}

	async function handleDeleteProduct(productId) {
		setDeleteConfirm({ id: productId })
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Daftar Produk</h1>
					<p className="text-muted-foreground">Kelola semua produk yang ada di toko Anda.</p>
				</div>
				<Button asChild>
					<Link href="/seller-dashboard/products/create">
						<Plus className="mr-2 h-4 w-4" />
						Tambah Produk
					</Link>
				</Button>
			</div>

			{isLoadingProducts && <div>Loading...</div>}
			{errorProducts && <div>Error: {errorProducts.message}</div>}
			{products && (
				<div className="grid gap-4 sm:grid-cols-3">
					{[
						{ label: "Total Produk", val: products?.data?.length, color: "text-blue-600", bg: "bg-blue-500/10" },
						{ label: "Produk Aktif", val: products?.data?.filter(p => p.status === 'active').length, color: "text-emerald-600", bg: "bg-emerald-500/10" },
						{ label: "Stok Habis", val: products?.data?.filter(p => p.status === 'out_of_stock').length, color: "text-red-600", bg: "bg-red-500/10" },
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
			)}

				<Card>
					<CardHeader className="pb-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="relative flex-1 max-w-sm">
								<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input placeholder="Cari produk..." className="pl-9" value={filters.title} onChange={(event) => handleNameProductChange(event.target.value)} />
							</div>
						</div>
					</CardHeader>
					{products && (
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
										{products?.data?.map((p, i) => {
											const st = statusCfg[p.status] ?? DEFAULT_STATUS
											return (
												<TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
													<TableCell className="text-muted-foreground text-center">{i + 1}</TableCell>
													<TableCell>
														<div className="flex items-center gap-3">
															<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
																<Image
																	src={p.images[0].imageUrl}
																	className="text-muted-foreground"
																	unoptimized width={100} height={100} 
																	alt={p.name}
																	 />
															</div>
															<div className="min-w-0">
																<p className="font-medium truncate max-w-[200px] lg:max-w-[300px]">{p.name}</p>
																<p className="text-xs text-muted-foreground">{p.weightGram} gram</p>
															</div>
														</div>
													</TableCell>
													<TableCell>
														<Badge variant="secondary" className="font-normal">{p.category.name}</Badge>
													</TableCell>
													<TableCell className="text-right">
														<div className="flex flex-col items-end">
															<span className="font-medium">{fmt(p.basePrice)}</span>
															{p.originalPrice && <span className="text-xs text-muted-foreground line-through">{fmt(p.originalPrice)}</span>}
														</div>
													</TableCell>
													<TableCell className="text-center">
														<span className={p.baseStock === 0 ? st.cls : p.baseStock <= 5 ? st.cls : ""}>{p.baseStock}</span>
													</TableCell>
													<TableCell className="text-center text-muted-foreground">{p.soldCount ?? 0}</TableCell>
													<TableCell className="text-center"><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
													<TableCell className="text-center">
														<DropdownMenu>
															<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem>
																	<Button variant="ghost" onClick={() => handleViewProduct(p.id)}>
																		<Eye className="mr-2 h-4 w-4" />Lihat</Button>
																</DropdownMenuItem>
																<DropdownMenuItem>
																	<Button variant="ghost" onClick={() => handleEditProduct(p.id)}>
																		<Pencil className="mr-2 h-4 w-4" />Edit</Button>
																</DropdownMenuItem>
																<DropdownMenuItem className="text-red-600 focus:text-red-600">
																	<Button variant="ghost" onClick={() => handleDeleteProduct(p.id)}>
																		<Trash2 className="mr-2 h-4 w-4" />Hapus</Button>
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
								pageCount={Math.ceil((products?.total || 0) / pageSize)}
								pageIndex={page - 1}
								handlePage={handlePageChange}
								resPerPage={resPerPage}
							/>
						</CardContent>
					)}
				</Card>
			<ViewProductModal
				productId={viewProduct}
				open={!!viewProduct}
				onClose={() => setViewProduct(null)}
			/>
			<ConfirmationDialog
				open={!!deleteConfirm}
				onClose={() => setDeleteConfirm(null)}
				title='Are you sure?'
				description={`This action cannot be undone. This will permanently delete data.`}
				confirmText='Delete'
				cancelText='Cancel'
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
