import { getCategories, getProductById } from "@/actions/seller-dashboard/product/product.actions"
import { FormEditProduct } from "@/features/seller-dashboard/product/edit/form-edit-product"

export const dynamic = 'force-dynamic';

export default async function NewProductEditPage({ params }) {
    const id = (await params).id

    const dataProduct = await getProductById(id)
    console.log("DATA PRODUCT", dataProduct)

    if (!dataProduct.success) {
        return <div>Error loading product</div>
    }

    const categoriesProduct = await getCategories()
    if (!categoriesProduct.success) {
        return <div>Error loading categories</div>
    }

    return <FormEditProduct categories={categoriesProduct.data} dataProduct={dataProduct.data} />
}
