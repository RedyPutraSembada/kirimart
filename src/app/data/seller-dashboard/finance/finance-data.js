import { getFinanceSummary } from "@/actions/seller-dashboard/finance.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetFinanceSummary(days = 7) {
	return useQuery({
		queryFn: async () => getFinanceSummary(days),
		queryKey: ["seller-finance", days],
	})
}
