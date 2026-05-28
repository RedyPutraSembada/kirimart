import { ProductDetail } from "@/features/public/product/product-detail"
import { getPublicProductById } from "@/actions/public/storefront.actions"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }) {
  const { id } = await params
  const result = await getPublicProductById(id)

  if (!result.success || !result.data) {
    return { title: "Produk Tidak Ditemukan" }
  }

  const product = result.data
  const primaryImage = product.images?.find(img => img.isPrimary)?.imageUrl || product.images?.[0]?.imageUrl

  return {
    title: `${product.name} — KawanBelanja`,
    description: product.description?.substring(0, 160) || `Beli ${product.name} di KawanBelanja`,
    openGraph: {
      title: product.name,
      description: product.description?.substring(0, 160),
      images: primaryImage ? [primaryImage] : [],
    },
  }
}

export default async function Page({ params }) {
  const { id } = await params

  const result = await getPublicProductById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return <ProductDetail product={result.data} />
}
