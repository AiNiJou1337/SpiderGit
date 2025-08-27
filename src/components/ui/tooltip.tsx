'use client'

import * as React from 'react'
import { cn } from '@/src/lib/utils/helpers'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

interface TooltipProviderProps {
  children: React.ReactNode
}

interface TooltipTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

export function Tooltip({ children, content, side = 'top', className }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    let x = rect.left + rect.width / 2
    let y = rect.top

    switch (side) {
      case 'top':
        y = rect.top - 8
        break
      case 'bottom':
        y = rect.bottom + 8
        break
      case 'left':
        x = rect.left - 8
        y = rect.top + rect.height / 2
        break
      case 'right':
        x = rect.right + 8
        y = rect.top + rect.height / 2
        break
    }

    setPosition({ x, y })
    setOpen(true)
  }

  const handleMouseLeave = () => {
    setOpen(false)
  }

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        <div
          ref={triggerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="cursor-pointer"
        >
          {children}
        </div>
        {open && (
          <div
            className={cn(
              'fixed z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-md pointer-events-none',
              'transform -translate-x-1/2 -translate-y-full',
              side === 'bottom' && 'translate-y-2',
              side === 'left' && 'translate-x-0 -translate-y-1/2',
              side === 'right' && '-translate-x-full -translate-y-1/2',
              className
            )}
            style={{
              left: position.x,
              top: position.y,
            }}
          >
            {content}
          </div>
        )}
      </div>
    </TooltipContext.Provider>
  )
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const { setOpen } = React.useContext(TooltipContext)
  
  const handleMouseEnter = () => setOpen(true)
  const handleMouseLeave = () => setOpen(false)

  if (asChild) {
    return React.cloneElement(children as React.ReactElement, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    })
  }

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
    </div>
  )
}

export function TooltipContent({ children, className }: TooltipContentProps) {
  const { open } = React.useContext(TooltipContext)
  
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-md pointer-events-none',
        'transform -translate-x-1/2 -translate-y-full -top-2',
        className
      )}
    >
      {children}
    </div>
  )
}
