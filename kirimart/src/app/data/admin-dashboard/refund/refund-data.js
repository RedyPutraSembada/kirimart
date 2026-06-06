import { getAllRefundRequests } from "@/actions/admin-dashboard/refund.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetAllRefundRequests() {
	return useQuery({
		queryFn: async () => getAllRefundRequests(),
		queryKey: ["admin-refunds"],
	})
}
