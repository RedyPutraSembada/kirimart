'use client'

import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ActionMenu({
	onEdit,
	onDelete,
	onView,
	onQurban,
	isView = true,
	isDelete = true,
	isEdit = true,
	isQurban = false,
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='ghost'
					className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
				>
					<MoreHorizontal />
					<span className='sr-only'>Open menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-[160px]'>
				{isEdit && <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>}
				{isDelete && (
					<DropdownMenuItem onClick={onDelete}>Delete</DropdownMenuItem>
				)}
				{isView && <DropdownMenuItem onClick={onView}>View</DropdownMenuItem>}

				{/* Qurban actions — hanya muncul kalau isQurban = true */}
				{isQurban && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onQurban}>
							Grouping & Numberring
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
