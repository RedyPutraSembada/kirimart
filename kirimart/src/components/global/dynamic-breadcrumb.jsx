'use client'

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

function formatLabel(segment) {
	return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DynamicBreadcrumb({
	basePath = '/admin',
	customLabels = {},
	showRoot = false,
	rootLabel = 'Dashboard',
}) {
	const pathname = usePathname()
	const segments = pathname.replace(basePath, '').split('/').filter(Boolean)

	// contoh: /admin/report/users -> ['report', 'users']
	if (!segments.length && !showRoot) return null

	return (
		<Breadcrumb>
			<BreadcrumbList>
				{showRoot && (
					<React.Fragment key='root'>
						<BreadcrumbItem>
							{segments.length === 0 ? (
								<BreadcrumbPage>{rootLabel}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={basePath}>{rootLabel}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{segments.length > 0 && (
							<BreadcrumbSeparator className='hidden md:block' />
						)}
					</React.Fragment>
				)}

				{segments.map((segment, index) => {
					const currentSegments = segments.slice(0, index + 1)
					const path = `${basePath}/${currentSegments.join('/')}`
					const label = customLabels[segment] || formatLabel(segment)
					const isLast = index === segments.length - 1

					return (
						<React.Fragment key={`${segment}-${index}`}>
							<BreadcrumbItem>
								{isLast ? (
									<BreadcrumbPage>{label}</BreadcrumbPage>
								) : (
									<BreadcrumbLink asChild>
										<Link href={path}>{label}</Link>
									</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{!isLast && <BreadcrumbSeparator className='hidden md:block' />}
						</React.Fragment>
					)
				})}
			</BreadcrumbList>
		</Breadcrumb>
	)
}
