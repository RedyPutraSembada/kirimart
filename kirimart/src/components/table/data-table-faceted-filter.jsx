'use client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
import { useCallback, useEffect, useState } from 'react'

export function DataTableFacetedFilter({
	onSelect,
	title,
	options,
	value = [],
	isShow = true,
	isCapitalized = true,
	resetSignal = false, // Signal to reset the filter
}) {
	const [selectedValues, setSelectedValues] = useState(new Set(value))

	// Stable callback to handle selection
	const handleSelect = useCallback(
		(value) => {
			const newSelectedValues = new Set(selectedValues)
			if (newSelectedValues.has(value)) {
				newSelectedValues.delete(value)
			} else {
				newSelectedValues.add(value)
			}
			setSelectedValues(newSelectedValues)
			onSelect(Array.from(newSelectedValues)) // Notify parent
		},
		[selectedValues, onSelect],
	)

	// Reset selected values when resetSignal changes
	useEffect(() => {
		setSelectedValues(new Set())
		onSelect([]) // Notify parent about the reset
	}, [resetSignal]) // Only trigger when resetSignal changes

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-8 border-dashed w-full justify-start'
				>
					<div className='flex items-center space-x-1 truncate'>
						<PlusCircledIcon className='mr-2 h-4 w-4' />
						{title}
						{selectedValues.size > 0 && (
							<>
								<Separator orientation='vertical' className='mx-2 h-4' />
								<Badge
									variant='secondary'
									className='rounded-sm px-1 font-normal lg:hidden'
								>
									{selectedValues.size}
								</Badge>
								<div className='hidden space-x-1 lg:flex'>
									{isShow && selectedValues.size > 0 ? (
										<>
											{selectedValues.size > 1 ? (
												<Badge
													variant='secondary'
													className='rounded-sm px-1 font-normal'
												>
													{selectedValues.size} selected
												</Badge>
											) : (
												options
													.filter((option) => selectedValues.has(option.value))
													.map((option) => (
														<Badge
															variant='secondary'
															key={option.value}
															className={`rounded-sm px-1 font-normal ${
																isCapitalized && 'capitalize'
															}`}
														>
															{option.label}
														</Badge>
													))
											)}
										</>
									) : (
										<Badge
											variant='secondary'
											className='rounded-sm px-1 font-normal'
										>
											{selectedValues.size} selected
										</Badge>
									)}
								</div>
							</>
						)}
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-full p-0' align='start'>
				<Command>
					<CommandInput placeholder={title} />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedValues.has(option.value)
								return (
									<CommandItem
										key={option.value}
										onSelect={() => handleSelect(option.value)}
									>
										<div
											className={cn(
												'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
												isSelected
													? 'bg-primary text-primary-foreground'
													: 'opacity-50 [&_svg]:invisible',
											)}
										>
											<CheckIcon className={cn('h-4 w-4')} />
										</div>
										{option.icon && (
											<option.icon className='mr-2 h-4 w-4 text-muted-foreground' />
										)}
										<span className={`${isCapitalized && 'capitalize'}`}>
											{option.label}
										</span>
									</CommandItem>
								)
							})}
						</CommandGroup>
						{selectedValues.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={() => {
											setSelectedValues(new Set())
											onSelect([])
										}}
										className='justify-center text-center'
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
