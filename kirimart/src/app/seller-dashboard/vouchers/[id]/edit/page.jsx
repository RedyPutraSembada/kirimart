import { getVoucherById } from "@/actions/seller-dashboard/voucher/voucher.actions"
import { FormEditVoucher } from "@/features/seller-dashboard/voucher/edit/form-edit-voucher"

export default async function EditVoucherPage({ params }) {
	const id = (await params).id

	const dataVoucher = await getVoucherById(id)

	if (!dataVoucher.success) {
		return <div>Error loading voucher</div>
	}

	return <FormEditVoucher dataVoucher={dataVoucher.data} />
}
