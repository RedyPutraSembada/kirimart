import { getActivityLogs } from "@/actions/admin-dashboard/activity-log.actions"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import Link from "next/link"

export const metadata = {
	title: "Activity Logs | Admin Dashboard",
}

export default async function ActivityLogsPage({ searchParams }) {
	const params = await searchParams
	const page = parseInt(params.page || "1")
	const filterAction = params.action || ""

	const logsResult = await getActivityLogs({ action: filterAction }, page, 20)
	
	if (!logsResult.success) {
		return (
			<div className="p-6">
				<div className="bg-red-50 text-red-500 p-4 rounded-lg">Gagal memuat log aktivitas.</div>
			</div>
		)
	}

	const { data: logs, total, nextPage } = logsResult

	return (
		<div className="p-6 space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-800">Log Aktivitas (Audit Trail)</h1>
					<p className="text-gray-500 text-sm mt-1">Lacak seluruh aktivitas pengguna, toko, dan admin di platform.</p>
				</div>
			</div>

			<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="p-4 border-b border-gray-100 flex gap-4">
					<form className="flex gap-2">
						<select 
							name="action" 
							defaultValue={filterAction}
							className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">Semua Aksi</option>
							<option value="LOGIN_SUCCESS">Login Berhasil</option>
							<option value="LOGIN_FAILED">Login Gagal</option>
							<option value="UPDATE_ORDER_STATUS">Update Pesanan</option>
							<option value="CREATE_ORDER">Checkout Pesanan</option>
							<option value="SUBMIT_COMPLAINT">Ajukan Komplain</option>
							<option value="CREATE_PRODUCT">Buat Produk</option>
							<option value="CREATE_STORE">Buat Toko</option>
							<option value="UPDATE_STORE_INFO">Update Profil Toko</option>
							<option value="UPDATE_BANK_INFO">Update Rekening</option>
							<option value="APPROVE_WITHDRAWAL">Penarikan Disetujui</option>
							<option value="BAN_USER">Ban User</option>
						</select>
						<button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Filter</button>
						{filterAction && (
							<Link href="/admin-dashboard/activity-logs" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Reset</Link>
						)}
					</form>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm text-gray-600">
						<thead className="bg-gray-50 text-gray-700 text-xs uppercase border-b border-gray-100">
							<tr>
								<th className="px-6 py-4 font-semibold">Waktu</th>
								<th className="px-6 py-4 font-semibold">Pelaku</th>
								<th className="px-6 py-4 font-semibold">Aksi</th>
								<th className="px-6 py-4 font-semibold">Entitas</th>
								<th className="px-6 py-4 font-semibold">IP Address</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{logs.map((log) => (
								<tr key={log.id} className="hover:bg-gray-50/50">
									<td className="px-6 py-4 whitespace-nowrap text-xs">
										{format(new Date(log.createdAt), "dd MMM yyyy, HH:mm", { locale: id })}
									</td>
									<td className="px-6 py-4">
										{log.userName ? (
											<div className="font-medium text-gray-800">{log.userName}</div>
										) : (
											<span className="text-gray-400 italic">Anonim / Sistem</span>
										)}
										{log.storeName && (
											<div className="text-xs text-blue-600">Toko: {log.storeName}</div>
										)}
									</td>
									<td className="px-6 py-4">
										<span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-mono">
											{log.action}
										</span>
									</td>
									<td className="px-6 py-4 text-xs font-mono">
										{log.entityType} <br/>
										<span className="text-gray-400">ID: {log.entityId || "-"}</span>
									</td>
									<td className="px-6 py-4 text-xs">
										{log.ipAddress} <br/>
										<span className="text-gray-400 truncate w-32 inline-block" title={log.userAgent}>
											{log.userAgent}
										</span>
									</td>
								</tr>
							))}

							{logs.length === 0 && (
								<tr>
									<td colSpan="5" className="px-6 py-12 text-center text-gray-500">
										Tidak ada aktivitas yang tercatat.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="p-4 border-t border-gray-100 flex items-center justify-between">
					<p className="text-sm text-gray-500">
						Total: <span className="font-semibold text-gray-900">{total}</span> aktivitas
					</p>
					<div className="flex gap-2">
						{page > 1 && (
							<Link
								href={`?page=${page - 1}${filterAction ? `&action=${filterAction}` : ''}`}
								className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
							>
								Sebelumnya
							</Link>
						)}
						{nextPage && (
							<Link
								href={`?page=${nextPage}${filterAction ? `&action=${filterAction}` : ''}`}
								className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
							>
								Selanjutnya
							</Link>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
