import { ProductDetail } from "@/features/public/product/product-detail"

export default async function Page({ params }) {
  const { id } = await params
  
  return <ProductDetail id={id} />
}
