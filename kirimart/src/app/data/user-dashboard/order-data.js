import { getMyTransactionHistory, getOrderDetail } from "@/actions/user-dashboard/order.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetMyTransactions() {
	return useQuery({
		queryFn: async () => getMyTransactionHistory(),
		queryKey: ["my-transactions"],
	})
}

export function useGetOrderDetail(orderId) {
	return useQuery({
		queryFn: async () => getOrderDetail(orderId),
		queryKey: ["order-detail", orderId],
	})
}
