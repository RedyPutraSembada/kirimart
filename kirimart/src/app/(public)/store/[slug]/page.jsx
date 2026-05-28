import { StoreView } from "@/features/public/store-view"
import { getStoreBySlug } from "@/actions/public/storefront.actions"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }) {
  const slug = (await params).slug
  const res = await getStoreBySlug(slug)
  
  if (!res.success) {
    return { title: 'Toko Tidak Ditemukan' }
  }

  const name = res.data.name
  
  return {
    title: `${name} - KawanBelanja`,
    description: `Belanja produk unggulan di ${name} melalui KawanBelanja.`,
  }
}

export default async function StorePage({ params }) {
  const slug = (await params).slug
  const res = await getStoreBySlug(slug)

  if (!res.success) {
    notFound()
  }

  return <StoreView store={res.data} />
}
