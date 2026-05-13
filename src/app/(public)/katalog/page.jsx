import { CatalogList } from "@/features/public/catalog-list"
import { getCategories } from "@/actions/seller-dashboard/product/product.actions"

export const metadata = {
  title: "Katalog Produk - KawanBelanja",
  description: "Temukan berbagai produk unggulan mulai dari Game, Pulsa, hingga Fashion.",
}

export default async function KatalogPage() {
  const categoriesResponse = await getCategories()
  const categories = categoriesResponse.success ? categoriesResponse.data : []

  return <CatalogList initialCategories={categories} />
}
