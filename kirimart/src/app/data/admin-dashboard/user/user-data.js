import { getUsers } from "@/actions/admin-dashboard/user/user.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetUsers(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getUsers(filters, page, perPage),
		queryKey: ["admin-users", filters, page, perPage],
	})
}
