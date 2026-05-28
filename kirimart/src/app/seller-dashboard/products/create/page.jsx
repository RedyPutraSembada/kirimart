import { getCategories } from "@/actions/seller-dashboard/product/product.actions"
import { FormCreateProduct } from "@/features/seller-dashboard/product/create/form-create-product"

export default async function NewProductPage() {
	const categoriesProduct = await getCategories()
	if (!categoriesProduct.success) {
		return <div>Error loading categories</div>
	}
	return <FormCreateProduct categories={categoriesProduct.data} />
}
