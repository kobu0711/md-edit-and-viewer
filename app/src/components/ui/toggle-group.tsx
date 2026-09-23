import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group'
import { type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ToggleGroupContext = React.createContext<VariantProps<typeof buttonVariants>>({
  size: 'default',
  variant: 'outline',
})

function ToggleGroup({
  className,
  variant = 'outline',
  size = 'sm',
  children,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof buttonVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('inline-flex w-fit items-center rounded-md shadow-xs', className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof buttonVariants>) {
  const context = React.useContext(ToggleGroupContext)
  const effectiveVariant = variant ?? context.variant
  const effectiveSize = size ?? context.size

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        buttonVariants({ variant: effectiveVariant, size: effectiveSize }),
        'rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10',
        // TooltipTrigger asChild は data-state を "closed" で上書きしてしまうため、
        // 選択中の判定には aria-checked / aria-pressed も併用する
        'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
        'aria-checked:bg-primary aria-checked:text-primary-foreground',
        'aria-pressed:bg-primary aria-pressed:text-primary-foreground',
        '-ml-px first:ml-0',
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  )
}

export { ToggleGroup, ToggleGroupItem }
