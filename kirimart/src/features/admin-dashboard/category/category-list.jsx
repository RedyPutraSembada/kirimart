"use client"

import { useState } from "react"
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
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FolderTree, Image as ImageIcon } from "lucide-react"
import Link from "next/link"
import { useGetAdminCategories } from "@/app/data/admin-dashboard/category/category-data"
import { deleteCategory } from "@/actions/admin-dashboard/category/category.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useDebounce } from "use-debounce"
import PaginationBar from "@/components/table/pagination-bar"
import { toast } from "sonner"

export function CategoryList() {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [deleteConfirm, setDeleteConfirm] = useState(null)
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const resPerPage = [10, 20, 50, 100]

	const [filters, setFilters] = useState({ search: '' })
	const [debouncedSearch] = useDebounce(filters.search, 1000)

	const { data: categoriesData, isLoading, error } = useGetAdminCategories(
		{ ...filters, search: debouncedSearch },
		page, pageSize
	)

	const handleSearchChange = (value) => {
		setFilters((prev) => ({ ...prev, search: value }))
	}

	const handlePerPageChange = (value) => {
		const newPageSize = value === 'all' ? -1 : Number(value)
		if (newPageSize !== pageSize) {
			setPageSize(newPageSize)
			setPage(1)
		}
	}

	const handlePageChange = (value) => setPage(value)

	const deleteMutation = useMutation({
		mutationFn: deleteCategory,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-categories"] })
			toast.success("Kategori berhasil dihapus")
			setDeleteConfirm(null)
		},
		onError: (error) => {
			toast.error(error.message || "Gagal menghapus kategori")
			setDeleteConfirm(null)
		}
	})

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Kategori Produk</h1>
					<p className="text-muted-foreground">Kelola hirarki master data kategori yang akan digunakan oleh penjual.</p>
				</div>
				<Button asChild>
					<Link href="/admin-dashboard/categories/create">
						<Plus className="mr-2 h-4 w-4" />
						Tambah Kategori
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Cari nama kategori..."
							className="pl-9"
							value={filters.search}
							onChange={(e) => handleSearchChange(e.target.value)}
						/>
					</div>
				</CardHeader>
				{isLoading && <CardContent><div className="py-10 text-center">Loading...</div></CardContent>}
				{error && <CardContent><div className="py-10 text-center text-red-500">Error: {error.message}</div></CardContent>}
				
				{categoriesData && (
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[50px] text-center">Icon</TableHead>
										<TableHead>Nama Kategori</TableHead>
										<TableHead>Induk</TableHead>
										<TableHead>Subkategori</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-center w-[70px]">Aksi</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{categoriesData?.data?.length === 0 ? (
										<TableRow>
											<TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
												Tidak ada kategori ditemukan.
											</TableCell>
										</TableRow>
									) : (
										categoriesData?.data?.map((cat) => (
											<TableRow key={cat.id} className="hover:bg-muted/50 transition-colors">
												<TableCell className="text-center">
													{cat.iconUrl ? (
														<div className="relative inline-block h-8 w-8 rounded-md border overflow-hidden shrink-0 align-middle">
															<Image src={cat.iconUrl} alt={cat.name} fill sizes="32px" className="object-cover" />
														</div>
													) : (
														<div className="h-8 w-8 rounded-md bg-muted border flex items-center justify-center inline-block">
															<ImageIcon className="h-4 w-4 text-muted-foreground" />
														</div>
													)}
												</TableCell>
												<TableCell>
													<div className="flex flex-col">
														<span className="font-medium">{cat.name}</span>
														<span className="text-xs text-muted-foreground">/{cat.slug}</span>
													</div>
												</TableCell>
												<TableCell>
													{cat.parent ? (
														<Badge variant="secondary" className="font-normal text-xs">
															<FolderTree className="h-3 w-3 mr-1" />
															{cat.parent.name}
														</Badge>
													) : (
														<span className="text-muted-foreground text-sm">-Utama-</span>
													)}
												</TableCell>
												<TableCell>
													<span className="text-sm">{cat.children?.length || 0} sub</span>
												</TableCell>
												<TableCell className="text-center">
													{cat.isActive ? (
														<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">Aktif</Badge>
													) : (
														<Badge variant="outline" className="border-gray-300 text-gray-600 bg-gray-50">Nonaktif</Badge>
													)}
												</TableCell>
												<TableCell className="text-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem>
																<Button variant="ghost" className="w-full justify-start px-2 h-auto" onClick={() => router.push(`/admin-dashboard/categories/${cat.id}/edit`)}>
																	<Pencil className="mr-2 h-4 w-4" />Edit
																</Button>
															</DropdownMenuItem>
															<DropdownMenuItem className="text-red-600 focus:text-red-600">
																<Button variant="ghost" className="w-full justify-start px-2 h-auto text-red-600 hover:text-red-600" onClick={() => setDeleteConfirm({ id: cat.id })}>
																	<Trash2 className="mr-2 h-4 w-4" />Hapus
																</Button>
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))
									)}
								</TableBody>
							</Table>
						</div>
						<PaginationBar
							pageSize={pageSize}
							page={page}
							handlePerPage={handlePerPageChange}
							pageCount={Math.ceil((categoriesData?.total || 0) / pageSize)}
							pageIndex={page - 1}
							handlePage={handlePageChange}
							resPerPage={resPerPage}
						/>
					</CardContent>
				)}
			</Card>

			<ConfirmationDialog
				open={!!deleteConfirm}
				onClose={() => setDeleteConfirm(null)}
				title='Hapus Kategori?'
				description='Jika kategori ini memiliki subkategori atau sedang dipakai oleh produk, penghapusan akan diblokir.'
				confirmText='Hapus Kategori'
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
