import { getAdminProducts } from "@/actions/admin-dashboard/product/product.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetAdminProducts(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getAdminProducts(filters, page, perPage),
		queryKey: ["admin-products", filters, page, perPage],
	})
}
