import React from 'react'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	DoubleArrowLeftIcon,
	DoubleArrowRightIcon,
} from '@radix-ui/react-icons'
import {
	Pagination,
	PaginationContent,
	PaginationItem,
} from '@/components/ui/pagination'

const PaginationBar = ({
	pageSize,
	page,
	handlePerPage,
	pageCount,
	pageIndex,
	handlePage,
	resPerPage,
}) => {
	return (
		<div className='flex items-center justify-between space-x-2 py-4'>
			<div className='flex-1 text-sm text-muted-foreground'></div>
			<div className='flex items-center space-x-6 lg:space-x-8 '>
				<div className='flex items-center space-x-2'>
					<p className='text-sm font-medium  '>Limit</p>
					<Select
						value={pageSize === -1 ? 'all' : pageSize.toString()}
						onValueChange={handlePerPage}
					>
						<SelectTrigger>
							<SelectValue placeholder={pageSize === -1 ? 'All' : pageSize} />
						</SelectTrigger>
						<SelectContent>
							{resPerPage?.map((size) => (
								<SelectItem key={size} value={size.toString()}>
									{size}
								</SelectItem>
							))}
							<SelectItem value='all'>All</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{pageSize !== -1 && (
					<div className='flex items-center gap-6 lg:gap-8'>
						<div className='flex items-center gap-2'>
							<p className='whitespace-nowrap text-sm font-medium'>
								Page {pageIndex + 1} of {pageCount}
							</p>
						</div>
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<Button
										variant='outline'
										className='hidden h-8 w-8 p-0 lg:flex'
										value={page}
										onClick={() => handlePage(1)}
										disabled={+page === 1 || false}
									>
										<DoubleArrowLeftIcon className='h-4 w-4' />
									</Button>
								</PaginationItem>
								<PaginationItem>
									<Button
										variant='outline'
										className='h-8 w-8 p-0'
										value={page}
										onClick={() => handlePage(+page - 1)}
										disabled={+page - 1 < 1 || false}
									>
										<ChevronLeftIcon className='h-4 w-4' />
									</Button>
								</PaginationItem>
								<PaginationItem>
									<Button
										variant='outline'
										className='h-8 w-8 p-0'
										value={page}
										onClick={() => handlePage(+page + 1)}
										disabled={+page + 1 > pageCount || false}
									>
										<ChevronRightIcon className='h-4 w-4' />
									</Button>
								</PaginationItem>
								<PaginationItem>
									<Button
										variant='outline'
										className='hidden h-8 w-8 p-0 lg:flex'
										value={page}
										onClick={() => handlePage(pageCount)}
										disabled={+page + 1 > pageCount || false}
									>
										<DoubleArrowRightIcon className='h-4 w-4' />
									</Button>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				)}
			</div>
		</div>
	)
}

export default PaginationBar