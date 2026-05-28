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
	Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Tag, Copy, CalendarDays,
} from "lucide-react"
import Link from "next/link"
import { useGetAdminVouchers } from "@/app/data/admin-dashboard/voucher/voucher-data"
import { deleteAdminVoucher } from "@/actions/admin-dashboard/voucher/voucher.actions"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import ConfirmationDialog from "@/components/ui/confirmation-dialog"
import { useState } from "react"
import { ViewVoucherModal } from "./view/view-voucher"
import { useDebounce } from "use-debounce"
import PaginationBar from "@/components/table/pagination-bar"
import { toast } from "sonner"

const statusCfg = {
	active: { label: "Aktif", cls: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950" },
	inactive: { label: "Nonaktif", cls: "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-950" },
	expired: { label: "Kedaluwarsa", cls: "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950" },
}
const DEFAULT_STATUS = { label: "Tidak Diketahui", cls: "border-gray-300 text-gray-500 bg-gray-50" }

const discountTypeCfg = {
	fixed: { label: "Nominal" },
	percentage: { label: "Persentase" },
	free_shipping: { label: "Gratis Ongkir" },
}

const fmt = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n)

function formatDiscountDisplay(voucher) {
	if (voucher.discountType === "fixed") return fmt(voucher.discountValue)
	if (voucher.discountType === "percentage") return `${voucher.discountValue}%`
	if (voucher.discountType === "free_shipping") return "Gratis Ongkir"
	return "-"
}

function formatDate(date) {
	if (!date) return "-"
	return new Date(date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

export function VoucherList() {
	const queryClient = useQueryClient()
	const router = useRouter()
	const [deleteConfirm, setDeleteConfirm] = useState(null)
	const [viewVoucher, setViewVoucher] = useState(null)
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(5)
	const resPerPage = [5, 10, 20, 50]

	const [filters, setFilters] = useState({ search: '' })
	const [debouncedSearch] = useDebounce(filters.search, 1000)

	const { data: vouchersData, isLoading, error } = useGetAdminVouchers(
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
		mutationFn: deleteAdminVoucher,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-vouchers"] })
			toast.success("Voucher berhasil dihapus")
		},
		onError: (error) => {
			toast.error(error.message)
		}
	})

	const handleCopyCode = (code) => {
		navigator.clipboard.writeText(code)
		toast.success(`Kode "${code}" berhasil disalin`)
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Voucher Platform</h1>
					<p className="text-muted-foreground">Buat kode promo yang berlaku untuk seluruh platform.</p>
				</div>
				<Button asChild>
					<Link href="/admin-dashboard/vouchers/create">
						<Plus className="mr-2 h-4 w-4" />
						Buat Voucher
					</Link>
				</Button>
			</div>

			{isLoading && <div>Loading...</div>}
			{error && <div>Error: {error.message}</div>}
			{vouchersData && (
				<div className="grid gap-4 sm:grid-cols-3">
					{[
						{ label: "Total Voucher", val: vouchersData?.total || 0, color: "text-violet-600", bg: "bg-violet-500/10" },
						{ label: "Voucher Aktif", val: vouchersData?.data?.filter(v => v.status === 'active').length, color: "text-emerald-600", bg: "bg-emerald-500/10" },
						{ label: "Total Digunakan", val: vouchersData?.data?.reduce((a, v) => a + (v.usedCount || 0), 0), color: "text-blue-600", bg: "bg-blue-500/10" },
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
			)}

			<Card>
				<CardHeader className="pb-4">
					<div className="relative max-w-sm">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Cari nama atau kode voucher..."
							className="pl-9"
							value={filters.search}
							onChange={(e) => handleSearchChange(e.target.value)}
						/>
					</div>
				</CardHeader>
				{vouchersData && (
					<CardContent>
						<div className="rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[50px]">No</TableHead>
										<TableHead>Voucher</TableHead>
										<TableHead>Kode</TableHead>
										<TableHead className="text-center">Tipe</TableHead>
										<TableHead className="text-right">Potongan</TableHead>
										<TableHead className="text-right hidden md:table-cell">Min. Belanja</TableHead>
										<TableHead className="text-center">Kuota</TableHead>
										<TableHead className="text-center hidden md:table-cell">Berlaku</TableHead>
										<TableHead className="text-center">Status</TableHead>
										<TableHead className="text-center w-[70px]">Aksi</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{vouchersData?.data?.map((v, i) => {
										const st = statusCfg[v.status] ?? DEFAULT_STATUS
										const dt = discountTypeCfg[v.discountType] ?? { label: "-" }
										const usagePercent = v.quota > 0 ? Math.round((v.usedCount / v.quota) * 100) : 0
										return (
											<TableRow key={v.id} className="hover:bg-muted/50 transition-colors">
												<TableCell className="text-muted-foreground text-center">{(page - 1) * pageSize + i + 1}</TableCell>
												<TableCell>
													<div className="min-w-0">
														<p className="font-medium truncate max-w-[200px]">{v.name}</p>
													</div>
												</TableCell>
												<TableCell>
													<div className="flex items-center gap-2">
														<code className="rounded bg-muted px-2 py-0.5 text-sm font-semibold">{v.code}</code>
														<button
															onClick={() => handleCopyCode(v.code)}
															className="text-muted-foreground hover:text-foreground transition-colors"
														>
															<Copy className="h-3.5 w-3.5" />
														</button>
													</div>
												</TableCell>
												<TableCell className="text-center">
													<Badge variant="secondary" className="font-normal">{dt.label}</Badge>
												</TableCell>
												<TableCell className="text-right font-medium">
													{formatDiscountDisplay(v)}
													{v.discountType === "percentage" && v.maxDiscount && (
														<p className="text-xs text-muted-foreground">Maks {fmt(v.maxDiscount)}</p>
													)}
												</TableCell>
												<TableCell className="text-right text-muted-foreground hidden md:table-cell">{fmt(v.minPurchase)}</TableCell>
												<TableCell className="text-center">
													<div className="flex flex-col items-center gap-1">
														<span className={usagePercent >= 100 ? "text-red-600 font-semibold" : "text-sm"}>
															{v.usedCount}/{v.quota}
														</span>
														<div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
															<div
																className={`h-full rounded-full transition-all ${usagePercent >= 80 ? "bg-red-500" : usagePercent >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
																style={{ width: `${Math.min(usagePercent, 100)}%` }}
															/>
														</div>
													</div>
												</TableCell>
												<TableCell className="text-center text-muted-foreground text-xs hidden md:table-cell">
													<div className="flex flex-col items-center gap-0.5">
														<div className="flex items-center gap-1">
															<CalendarDays className="h-3 w-3" />
															{formatDate(v.startDate)}
														</div>
														<span>s/d {formatDate(v.endDate)}</span>
													</div>
												</TableCell>
												<TableCell className="text-center"><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
												<TableCell className="text-center">
													<DropdownMenu>
														<DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem>
																<Button variant="ghost" onClick={() => setViewVoucher(v.id)}>
																	<Eye className="mr-2 h-4 w-4" />Lihat
																</Button>
															</DropdownMenuItem>
															<DropdownMenuItem>
																<Button variant="ghost" onClick={() => router.push(`/admin-dashboard/vouchers/${v.id}/edit`)}>
																	<Pencil className="mr-2 h-4 w-4" />Edit
																</Button>
															</DropdownMenuItem>
															<DropdownMenuItem className="text-red-600 focus:text-red-600">
																<Button variant="ghost" onClick={() => setDeleteConfirm({ id: v.id })}>
																	<Trash2 className="mr-2 h-4 w-4" />Hapus
																</Button>
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
							pageCount={Math.ceil((vouchersData?.total || 0) / pageSize)}
							pageIndex={page - 1}
							handlePage={handlePageChange}
							resPerPage={resPerPage}
						/>
					</CardContent>
				)}
			</Card>
			<ViewVoucherModal
				voucherId={viewVoucher}
				open={!!viewVoucher}
				onClose={() => setViewVoucher(null)}
			/>
			<ConfirmationDialog
				open={!!deleteConfirm}
				onClose={() => setDeleteConfirm(null)}
				title='Hapus Voucher?'
				description='Tindakan ini tidak bisa dibatalkan. Voucher akan dihapus secara permanen.'
				confirmText='Hapus'
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
