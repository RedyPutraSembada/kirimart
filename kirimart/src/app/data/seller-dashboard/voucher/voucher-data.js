import { getSellerVouchers, getVoucherById } from "@/actions/seller-dashboard/voucher/voucher.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetSellerVouchers(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getSellerVouchers(filters, page, perPage),
		queryKey: ["seller-vouchers", filters, page, perPage],
	})
}

export function useGetVoucherById(voucherId) {
	return useQuery({
		queryFn: async () => getVoucherById(voucherId),
		queryKey: ["seller-vouchers", voucherId],
	})
}
