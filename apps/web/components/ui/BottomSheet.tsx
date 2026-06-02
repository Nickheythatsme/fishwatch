'use client'

import type { ReactNode } from 'react'
import { Drawer } from 'vaul'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
}

export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[1100] bg-on-surface/30" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[1101] flex h-[85vh] flex-col rounded-t-2xl bg-surface-container-low outline-none">
          <Drawer.Handle className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-outline-variant" />
          <Drawer.Title className="sr-only">{title ?? 'Panel'}</Drawer.Title>
          <div className="flex-1 overflow-hidden">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
