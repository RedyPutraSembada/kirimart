import { getAdminVouchers, getAdminVoucherById } from "@/actions/admin-dashboard/voucher/voucher.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetAdminVouchers(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getAdminVouchers(filters, page, perPage),
		queryKey: ["admin-vouchers", filters, page, perPage],
	})
}

export function useGetAdminVoucherById(voucherId) {
	return useQuery({
		queryFn: async () => getAdminVoucherById(voucherId),
		queryKey: ["admin-vouchers", voucherId],
	})
}
