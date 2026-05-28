import { getCategoryById } from "@/actions/admin-dashboard/category/category.actions"
import { FormEditCategory } from "@/features/admin-dashboard/category/edit/form-edit-category"

export default async function AdminCategoriesEditPage({ params }) {
	const id = (await params).id
	const categoryRes = await getCategoryById(id)

	if (!categoryRes.success) {
		return <div>{categoryRes.error}</div>
	}

	return <FormEditCategory dataCategory={categoryRes.data} />
}
