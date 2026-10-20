import { Drawer } from '@base-ui/react/drawer'
import * as React from 'react'

const ease = 'ease-[cubic-bezier(0.32,0.72,0,1)]'

/** The sidebar as a left drawer on small screens. `children` is the same nav the desktop sidebar renders. */
export default function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  // The scroll lock restores the page position on close, so same-page anchors jump once the drawer is gone.
  const hash = React.useRef<string | null>(null)

  return (
    <Drawer.Root
      swipeDirection="left"
      open={open}
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (isOpen || !hash.current) return
        history.pushState(null, '', hash.current)
        document.getElementById(decodeURIComponent(hash.current.slice(1)))?.scrollIntoView()
        hash.current = null
      }}
    >
      <Drawer.Trigger
        aria-label="Open menu"
        className="-mr-2 grid size-9 place-items-center text-muted transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path d="M2 5.5h12M2 10.5h12" />
        </svg>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={`fixed inset-0 min-h-dvh bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ${ease} [--backdrop-opacity:0.2] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute dark:[--backdrop-opacity:0.6]`}
        />
        <Drawer.Viewport className="fixed inset-0 flex">
          {/* 3rem bleeds off the left edge so the spring's overshoot never shows a gap. */}
          <Drawer.Popup
            className={`-ml-12 h-full w-[calc(18rem+3rem)] max-w-[calc(85vw+3rem)] translate-x-(--drawer-swipe-movement-x) overflow-y-auto overscroll-contain border-r border-line bg-page pr-4 pb-6 pl-[calc(1rem+3rem)] outline-none transition-transform duration-450 ${ease} touch-auto data-starting-style:translate-x-[calc(-100%+3rem-2px)] data-ending-style:translate-x-[calc(-100%+3rem-2px)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:select-none`}
          >
            <Drawer.Content
              onClick={(e) => {
                const a = (e.target as Element).closest('a')
                if (!a?.hash || a.pathname !== location.pathname) return
                e.preventDefault()
                hash.current = a.hash
                setOpen(false)
              }}
            >
              <div className="flex h-12 items-center justify-between">
                <Drawer.Title render={<a href="/" />} className="flex items-center gap-2 font-medium">
                  <img src="/images/logo.svg" alt="" className="size-4 dark:invert" />
                  Lightbox
                </Drawer.Title>
                <Drawer.Close
                  aria-label="Close menu"
                  className="-mr-2 grid size-9 place-items-center text-muted transition-colors hover:text-ink"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <path d="m3.5 3.5 9 9m-9 0 9-9" />
                  </svg>
                </Drawer.Close>
              </div>
              <nav aria-label="Docs">{children}</nav>
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
