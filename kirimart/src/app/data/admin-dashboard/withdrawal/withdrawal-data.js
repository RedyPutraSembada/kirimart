import { getAllWithdrawals } from "@/actions/admin-dashboard/withdrawal.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetAllWithdrawals() {
	return useQuery({
		queryFn: async () => getAllWithdrawals(),
		queryKey: ["admin-withdrawals"],
	})
}
