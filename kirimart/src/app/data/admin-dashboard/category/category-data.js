import { getAdminCategories, getCategoryById, getAllCategoriesForDropdown } from "@/actions/admin-dashboard/category/category.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetAdminCategories(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getAdminCategories(filters, page, perPage),
		queryKey: ["admin-categories", filters, page, perPage],
	})
}

export function useGetAllCategoriesForDropdown() {
	return useQuery({
		queryFn: async () => getAllCategoriesForDropdown(),
		queryKey: ["admin-categories-dropdown"],
	})
}

export function useGetCategoryById(id) {
	return useQuery({
		queryFn: async () => getCategoryById(id),
		queryKey: ["admin-categories", id],
	})
}
