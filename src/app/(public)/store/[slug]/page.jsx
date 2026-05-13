import { StoreView } from "@/features/public/store-view"

export async function generateMetadata({ params }) {
  const slug = (await params).slug
  const name = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  
  return {
    title: `${name} - KawanBelanja`,
    description: `Belanja produk unggulan di ${name} melalui KawanBelanja.`,
  }
}

export default async function StorePage({ params }) {
  const slug = (await params).slug
  // In a real app, you would fetch store data by slug here
  const store = { name: slug, domainSlug: slug }

  return <StoreView store={store} />
}
