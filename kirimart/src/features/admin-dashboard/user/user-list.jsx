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
	Search, MoreHorizontal, ShieldAlert, UserX, UserCheck, Trash2, Shield, CalendarDays
} from "lucide-react"
import { useGetUsers } from "@/app/data/admin-dashboard/user/user-data"
import { updateUserRole, banUserAction, unbanUserAction, deleteUserAction } from "@/actions/admin-dashboard/user/user.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useState } from "react"
import { useDebounce } from "use-debounce"
import PaginationBar from "@/components/table/pagination-bar"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const roleCfg = {
	admin: { label: "Admin", cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
	seller: { label: "Seller", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
	user: { label: "User", cls: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
}

function formatDate(date) {
	if (!date) return "-"
	return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function UserList() {
	const queryClient = useQueryClient()
	
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const resPerPage = [10, 20, 50, 100]

	const [filters, setFilters] = useState({ search: '', role: 'all', status: 'all' })
	const [debouncedSearch] = useDebounce(filters.search, 1000)

	// Modals State
	const [roleModal, setRoleModal] = useState({ open: false, user: null, role: 'user' })
	const [banModal, setBanModal] = useState({ open: false, user: null, reason: '' })
	const [unbanConfirm, setUnbanConfirm] = useState(null)
	const [deleteConfirm, setDeleteConfirm] = useState(null)

	const { data: usersData, isLoading, error } = useGetUsers(
		{ 
			search: debouncedSearch, 
			role: filters.role !== 'all' ? filters.role : undefined,
			status: filters.status !== 'all' ? filters.status : undefined 
		},
		page, pageSize
	)

	const handleSearchChange = (value) => setFilters((prev) => ({ ...prev, search: value }))
	const handleRoleFilter = (value) => { setFilters((prev) => ({ ...prev, role: value })); setPage(1) }
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
	const updateRoleMutation = useMutation({
		mutationFn: (data) => updateUserRole(data.id, { role: data.role }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] })
			toast.success("Role berhasil diperbarui")
			setRoleModal({ open: false, user: null, role: 'user' })
		},
		onError: (error) => toast.error(error.message)
	})

	const banMutation = useMutation({
		mutationFn: (data) => banUserAction(data.id, { banReason: data.reason }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] })
			toast.success("Pengguna berhasil diblokir")
			setBanModal({ open: false, user: null, reason: '' })
		},
		onError: (error) => toast.error(error.message)
	})

	const unbanMutation = useMutation({
		mutationFn: (id) => unbanUserAction(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] })
			toast.success("Blokir pengguna berhasil dibuka")
			setUnbanConfirm(null)
		},
		onError: (error) => toast.error(error.message)
	})

	const deleteMutation = useMutation({
		mutationFn: (id) => deleteUserAction(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] })
			toast.success("Pengguna berhasil dihapus secara permanen")
			setDeleteConfirm(null)
		},
		onError: (error) => toast.error(error.message)
	})

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
				<p className="text-muted-foreground">Kelola hak akses dan moderasi akun pengguna di platform.</p>
			</div>

			<Card>
				<CardHeader className="pb-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
						<div className="relative flex-1 max-w-sm">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Cari nama atau email..."
								className="pl-9"
								value={filters.search}
								onChange={(e) => handleSearchChange(e.target.value)}
							/>
						</div>
						<div className="flex gap-2">
							<Select value={filters.role} onValueChange={handleRoleFilter}>
								<SelectTrigger className="w-[140px]">
									<SelectValue placeholder="Semua Role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Semua Role</SelectItem>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="seller">Seller</SelectItem>
									<SelectItem value="user">User</SelectItem>
								</SelectContent>
							</Select>
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
				{usersData && (
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[50px]">No</TableHead>
										<TableHead>Pengguna</TableHead>
										<TableHead>Email</TableHead>
										<TableHead className="text-center">Role</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-right hidden md:table-cell">Bergabung</TableHead>
										<TableHead className="text-center w-[70px]">Aksi</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{usersData.data.length === 0 && (
										<TableRow>
											<TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Tidak ada data pengguna ditemukan.</TableCell>
										</TableRow>
									)}
									{usersData.data.map((u, i) => {
										const roleInfo = roleCfg[u.role || 'user'] || roleCfg['user']
										
										return (
											<TableRow key={u.id} className="hover:bg-muted/50 transition-colors">
												<TableCell className="text-muted-foreground text-center">{(page - 1) * pageSize + i + 1}</TableCell>
												<TableCell>
													<div className="flex items-center gap-3">
														{u.image ? (
															<div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
																<Image src={u.image} alt={u.name} fill sizes="32px" className="object-cover" />
															</div>
														) : (
															<div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
																{u.name.substring(0, 2)}
															</div>
														)}
														<div className="min-w-0">
															<p className="font-medium truncate max-w-[200px]">{u.name}</p>
														</div>
													</div>
												</TableCell>
												<TableCell>
													<span className="text-muted-foreground">{u.email}</span>
												</TableCell>
												<TableCell className="text-center">
													<Badge variant="outline" className={`border-transparent ${roleInfo.cls}`}>{roleInfo.label}</Badge>
												</TableCell>
												<TableCell className="text-center">
													{u.banned ? (
														<Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950">Banned</Badge>
													) : (
														<Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950">Aktif</Badge>
													)}
												</TableCell>
												<TableCell className="text-right text-muted-foreground text-xs hidden md:table-cell">
													{formatDate(u.createdAt)}
												</TableCell>
												<TableCell className="text-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem onClick={() => setRoleModal({ open: true, user: u, role: u.role || 'user' })}>
																<Shield className="mr-2 h-4 w-4" />Ubah Role
															</DropdownMenuItem>
															
															{u.banned ? (
																<DropdownMenuItem onClick={() => setUnbanConfirm(u)}>
																	<UserCheck className="mr-2 h-4 w-4 text-emerald-600" />Buka Blokir
																</DropdownMenuItem>
															) : (
																<DropdownMenuItem onClick={() => setBanModal({ open: true, user: u, reason: '' })}>
																	<UserX className="mr-2 h-4 w-4 text-amber-600" />Blokir Akun
																</DropdownMenuItem>
															)}
															
															<DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeleteConfirm(u)}>
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
							pageCount={Math.ceil((usersData.total || 0) / pageSize)}
							pageIndex={page - 1}
							handlePage={handlePageChange}
							resPerPage={resPerPage}
						/>
					</CardContent>
				)}
			</Card>

			{/* Modal Ubah Role */}
			<Dialog open={roleModal.open} onOpenChange={(open) => !open && setRoleModal({ ...roleModal, open: false })}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Ubah Role Pengguna</DialogTitle>
						<DialogDescription>
							Anda mengubah hak akses untuk {roleModal.user?.name} ({roleModal.user?.email}).
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<div className="space-y-2">
							<Label>Pilih Role</Label>
							<Select value={roleModal.role} onValueChange={(val) => setRoleModal({ ...roleModal, role: val })}>
								<SelectTrigger>
									<SelectValue placeholder="Pilih Role" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="admin">Admin</SelectItem>
									<SelectItem value="seller">Seller</SelectItem>
									<SelectItem value="user">User</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRoleModal({ ...roleModal, open: false })}>Batal</Button>
						<Button onClick={() => updateRoleMutation.mutate({ id: roleModal.user.id, role: roleModal.role })} disabled={updateRoleMutation.isPending}>
							{updateRoleMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Modal Ban User */}
			<Dialog open={banModal.open} onOpenChange={(open) => !open && setBanModal({ ...banModal, open: false })}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="text-amber-600 flex items-center gap-2">
							<ShieldAlert className="h-5 w-5" /> Blokir Pengguna
						</DialogTitle>
						<DialogDescription>
							Akun yang diblokir tidak akan bisa mengakses layanannya. Harap berikan alasan pemblokiran.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						<div className="space-y-2">
							<Label>Alasan Pemblokiran (Opsional)</Label>
							<Textarea 
								placeholder="Contoh: Melanggar ketentuan layanan platform..." 
								value={banModal.reason}
								onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setBanModal({ ...banModal, open: false })}>Batal</Button>
						<Button variant="destructive" onClick={() => banMutation.mutate({ id: banModal.user.id, reason: banModal.reason })} disabled={banMutation.isPending}>
							{banMutation.isPending ? "Memproses..." : "Blokir Akun"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Unban Confirmation */}
			<ConfirmationDialog
				open={!!unbanConfirm}
				onClose={() => setUnbanConfirm(null)}
				title='Buka Blokir Akun?'
				description={`Apakah Anda yakin ingin memulihkan akses untuk akun ${unbanConfirm?.name}?`}
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
				title='Hapus Permanen Akun?'
				description={`PERINGATAN: Tindakan ini akan menghapus akun ${deleteConfirm?.name} beserta semua data terkait (toko, produk, transaksi) secara permanen dan tidak bisa dikembalikan.`}
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
