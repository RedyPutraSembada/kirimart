import { getAdminStores } from "@/actions/admin-dashboard/store/store.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetAdminStores(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getAdminStores(filters, page, perPage),
		queryKey: ["admin-stores", filters, page, perPage],
	})
}
