import { getAdminVoucherById } from "@/actions/admin-dashboard/voucher/voucher.actions"
import { FormEditVoucher } from "@/features/admin-dashboard/voucher/edit/form-edit-voucher"

export default async function EditVoucherPage({ params }) {
	const id = (await params).id

	const dataVoucher = await getAdminVoucherById(id)

	if (!dataVoucher.success) {
		return <div>Error loading voucher</div>
	}

	return <FormEditVoucher dataVoucher={dataVoucher.data} />
}
