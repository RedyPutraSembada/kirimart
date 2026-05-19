import { getSellerOrders } from "@/actions/seller-dashboard/order.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetSellerOrders() {
	return useQuery({
		queryFn: async () => getSellerOrders(),
		queryKey: ["seller-orders"],
	})
}
