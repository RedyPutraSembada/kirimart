import { Suspense } from "react"
import { CatalogList } from "@/features/public/catalog/catalog-list"
import { getPublicCategories, getCatalogProducts } from "@/actions/public/storefront.actions"

export const metadata = {
  title: "Katalog Produk - KawanBelanja",
  description: "Temukan berbagai produk unggulan mulai dari Game, Pulsa, hingga Fashion.",
}

export default async function KatalogPage({ searchParams }) {
  const params = await searchParams
  const categoriesResponse = await getPublicCategories()
  const categories = categoriesResponse.success ? categoriesResponse.data : []

  // Resolve category: bisa via ?categoryId=5 (id) atau ?category=aksesoris (slug dari mega menu navbar)
  let resolvedCategoryId = params?.categoryId || ""
  if (!resolvedCategoryId && params?.category) {
    const matched = categories.find(
      (c) => c.slug === params.category || String(c.id) === params.category
    )
    if (matched) resolvedCategoryId = String(matched.id)
  }

  // SSR: fetch data awal berdasarkan URL params
  const initialFilters = {
    search: params?.search || "",
    categoryId: resolvedCategoryId,
    sort: params?.sort || "popular",
    page: 1,
    perPage: 20,
  }

  const productsResponse = await getCatalogProducts(initialFilters)
  const initialProducts = productsResponse.success ? productsResponse.data : []
  const initialTotal = productsResponse.success ? productsResponse.total : 0

  return (
    <Suspense>
      <CatalogList
        initialCategories={categories}
        initialProducts={initialProducts}
        initialTotal={initialTotal}
      />
    </Suspense>
  )
}
