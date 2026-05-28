"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
	Search, MoreHorizontal, ShieldAlert, Store as StoreIcon, StoreIcon as StoreX, CheckCircle, Trash2
} from "lucide-react"
import { useGetAdminStores } from "@/app/data/admin-dashboard/store/store-data"
import { banStoreAction, unbanStoreAction, deleteStoreAction } from "@/actions/admin-dashboard/store/store.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useState } from "react"
import { useDebounce } from "use-debounce"
import PaginationBar from "@/components/table/pagination-bar"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function StoreList() {
	const queryClient = useQueryClient()
	
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const resPerPage = [10, 20, 50, 100]

	const [filters, setFilters] = useState({ search: '', status: 'all' })
	const [debouncedSearch] = useDebounce(filters.search, 1000)

	// Modals State
	const [banModal, setBanModal] = useState({ open: false, store: null, reason: '' })
	const [unbanConfirm, setUnbanConfirm] = useState(null)
	const [deleteConfirm, setDeleteConfirm] = useState(null)

	const { data: storesData, isLoading, error } = useGetAdminStores(
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
		mutationFn: (data) => banStoreAction(data.id, { banReason: data.reason }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-stores"] })
			toast.success("Toko berhasil diblokir")
			setBanModal({ open: false, store: null, reason: '' })
		},
		onError: (error) => toast.error(error.message)
	})

	const unbanMutation = useMutation({
		mutationFn: (id) => unbanStoreAction(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-stores"] })
			toast.success("Blokir toko berhasil dibuka")
			setUnbanConfirm(null)
		},
		onError: (error) => toast.error(error.message)
	})

	const deleteMutation = useMutation({
		mutationFn: (id) => deleteStoreAction(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-stores"] })
			toast.success("Toko berhasil dihapus secara permanen")
			setDeleteConfirm(null)
		},
		onError: (error) => toast.error(error.message)
	})

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Moderasi Toko</h1>
				<p className="text-muted-foreground">Kelola toko yang terdaftar di platform dan lakukan penindakan jika melanggar.</p>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Cari nama toko atau domain..."
								className="pl-9"
								value={filters.search}
								onChange={(e) => handleSearchChange(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Select value={filters.status} onValueChange={handleStatusFilter}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Semua Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Status</SelectItem>
									<SelectItem value="active">Aktif</SelectItem>
									<SelectItem value="banned">Banned</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardHeader>
				{isLoading && <CardContent><div className="py-8 text-center text-muted-foreground">Loading...</div></CardContent>}
				{storesData && (
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[50px]">No</TableHead>
										<TableHead>Toko</TableHead>
										<TableHead>Domain</TableHead>
										<TableHead>Pemilik</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-center w-[70px]">Aksi</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{storesData.data.length === 0 && (
										<TableRow>
											<TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada data toko ditemukan.</TableCell>
										</TableRow>
									)}
									{storesData.data.map((s, i) => {
										return (
											<TableRow key={s.id} className="hover:bg-muted/50 transition-colors">
												<TableCell className="text-muted-foreground text-center">{(page - 1) * pageSize + i + 1}</TableCell>
												<TableCell>
													<div className="flex items-center gap-3">
														{s.logoUrl ? (
															<img src={s.logoUrl} alt={s.name} className="h-8 w-8 rounded bg-muted object-cover" />
														) : (
															<div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
																<StoreIcon className="h-4 w-4" />
															</div>
														)}
														<div className="min-w-0">
															<p className="font-medium truncate max-w-[200px]">{s.name}</p>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<span className="text-muted-foreground">/{s.domainSlug}</span>
												</TableCell>
												<TableCell>
													<div className="flex flex-col">
														<span className="font-medium text-sm">{s.user?.name || "Tidak diketahui"}</span>
														<span className="text-xs text-muted-foreground">{s.user?.email || "-"}</span>
													</div>
												</TableCell>
												<TableCell className="text-center">
													{s.status === "banned" ? (
														<Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950">Banned</Badge>
													) : (
														<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">Aktif</Badge>
													)}
												</TableCell>
												<TableCell className="text-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															{s.status === "banned" ? (
																<DropdownMenuItem onClick={() => setUnbanConfirm(s)}>
																	<CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />Buka Blokir Toko
																</DropdownMenuItem>
															) : (
																<DropdownMenuItem onClick={() => setBanModal({ open: true, store: s, reason: '' })}>
																	<StoreX className="mr-2 h-4 w-4 text-amber-600" />Blokir Toko
																</DropdownMenuItem>
															)}
															
															<DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteConfirm(s)}>
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
							pageCount={Math.ceil((storesData.total || 0) / pageSize)}
							pageIndex={page - 1}
							handlePage={handlePageChange}
							resPerPage={resPerPage}
						/>
					</CardContent>
				)}
			</Card>

			{/* Modal Ban Store */}
			<Dialog open={banModal.open} onOpenChange={(open) => !open && setBanModal({ ...banModal, open: false })}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-amber-600 flex items-center gap-2">
							<ShieldAlert className="h-5 w-5" /> Blokir Toko
						</DialogTitle>
						<DialogDescription>
							Toko yang diblokir tidak akan tampil di pencarian dan pengguna tidak bisa membelinya. Harap berikan alasan pemblokiran.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<div className="space-y-2">
							<Label>Alasan Pemblokiran (Opsional)</Label>
							<Textarea 
								placeholder="Contoh: Menjual barang ilegal..." 
								value={banModal.reason}
								onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBanModal({ ...banModal, open: false })}>Batal</Button>
						<Button variant="destructive" onClick={() => banMutation.mutate({ id: banModal.store.id, reason: banModal.reason })} disabled={banMutation.isPending}>
							{banMutation.isPending ? "Memproses..." : "Blokir Toko"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Unban Confirmation */}
			<ConfirmationDialog
				open={!!unbanConfirm}
				onClose={() => setUnbanConfirm(null)}
				title='Buka Blokir Toko?'
				description={`Apakah Anda yakin ingin memulihkan status aktif untuk toko ${unbanConfirm?.name}?`}
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
				title='Hapus Permanen Toko?'
				description={`PERINGATAN: Tindakan ini akan menghapus toko ${deleteConfirm?.name} beserta semua data terkait (produk, transaksi) secara permanen dan tidak bisa dikembalikan.`}
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
