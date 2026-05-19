import { Database, LayoutDashboard, Package, ShoppingCart, Store, Tag, BarChart3, ShieldAlert, Wallet, Banknote, Settings } from 'lucide-react'

export const menus = [
	{
		title: 'Dashboard',
		url: '/admin-dashboard',
		icon: LayoutDashboard,
	},
	{
		title: 'Kategori Produk',
		url: '/admin-dashboard/categories',
		icon: Database,
	},
	{
		title: 'Produk',
		url: '/admin-dashboard/products',
		icon: Package,
	},
	{
		title: 'Toko',
		url: '/admin-dashboard/stores',
		icon: Store,
	},
	{
		title: 'Pengguna',
		url: '/admin-dashboard/users',
		icon: ShieldAlert,
	},
	{
		title: 'Voucher Platform',
		url: '/admin-dashboard/vouchers',
		icon: Tag,
		items: [
			{
				title: 'Semua Voucher',
				url: '/admin-dashboard/vouchers',
			},
			{
				title: 'Buat Voucher',
				url: '/admin-dashboard/vouchers/create',
			},
		],
	},
	{
		title: 'Penarikan Dana',
		url: '/admin-dashboard/withdrawals',
		icon: Banknote,
	},
	{
		title: 'Pengaturan',
		url: '/admin-dashboard/settings',
		icon: Settings,
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
				url: '/seller-dashboard/products/create',
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
		items: [
			{
				title: 'Semua Voucher',
				url: '/seller-dashboard/vouchers',
			},
			{
				title: 'Buat Voucher',
				url: '/seller-dashboard/vouchers/create',
			},
		],
	},
	{
		title: 'Profil Toko',
		url: '/seller-dashboard/store',
		icon: Store,
	},
	{
		title: 'Keuangan',
		url: '/seller-dashboard/finance',
		icon: Wallet,
	},
]