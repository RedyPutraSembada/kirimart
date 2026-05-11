import { getCategories, getProductById, getSellerProducts } from "@/actions/seller-dashboard/product/product.actions"
import { useQuery } from "@tanstack/react-query"

export function useGetCategories() {
	return useQuery({
		queryFn: async () => getCategories(),
		queryKey: ["categories"],
	})
}

export function useGetSellerProducts(filters, page, perPage) {
	return useQuery({
		queryFn: async () => getSellerProducts(filters, page, perPage),
		queryKey: ["seller-products", filters, page, perPage],
	})
}

export function useGetProductById(productId) {
	return useQuery({
		queryFn: async () => getProductById(productId),
		queryKey: ["seller-products", productId],
	})
}