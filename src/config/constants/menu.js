import { Database, LayoutDashboard, Package, ShoppingCart, Store, Tag, BarChart3 } from 'lucide-react'

export const menus = [
	{
		title: 'Dashboard',
		url: '/admin-dashboard',
		icon: LayoutDashboard,
	},
]

export const menusSeller = [
	{
		title: 'Dashboard',
		url: '/seller-dashboard',
		icon: LayoutDashboard,
	},
	{
		title: 'Produk',
		url: '/seller-dashboard/products',
		icon: Package,
		items: [
			{
				title: 'Semua Produk',
				url: '/seller-dashboard/products',
			},
			{
				title: 'Tambah Produk',
				url: '/seller-dashboard/products/new',
			},
		],
	},
	{
		title: 'Pesanan',
		url: '/seller-dashboard/orders',
		icon: ShoppingCart,
	},
	{
		title: 'Voucher',
		url: '/seller-dashboard/vouchers',
		icon: Tag,
	},
	{
		title: 'Profil Toko',
		url: '/seller-dashboard/store',
		icon: Store,
	},
]