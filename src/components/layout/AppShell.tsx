"use client"

import { useEffect, useReducer, useRef, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"
import { mobileNavigationReducer } from "@/lib/mobile-navigation"

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, dispatchMobileMenu] = useReducer(mobileNavigationReducer, false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const wasMenuOpen = useRef(false)

  useEffect(() => {
    dispatchMobileMenu("close")
  }, [pathname])

  useEffect(() => {
    const desktopBreakpoint = window.matchMedia("(min-width: 768px)")
    const closeOnDesktop = () => {
      if (desktopBreakpoint.matches) dispatchMobileMenu("close")
    }
    desktopBreakpoint.addEventListener("change", closeOnDesktop)
    return () => desktopBreakpoint.removeEventListener("change", closeOnDesktop)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) {
      if (wasMenuOpen.current) {
        menuButtonRef.current?.focus()
        wasMenuOpen.current = false
      }
      return
    }

    wasMenuOpen.current = true
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        dispatchMobileMenu("close")
        return
      }

      if (event.key !== "Tab") return
      const drawer = document.getElementById("mobile-navigation")
      const focusable = drawer?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable?.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey && (activeElement === first || !drawer?.contains(activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (activeElement === last || !drawer?.contains(activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [mobileMenuOpen])

  return (
    <div className="min-h-screen w-full bg-muted/20 md:flex md:h-screen md:overflow-hidden">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => dispatchMobileMenu("close")}
        onMobileNavigate={() => dispatchMobileMenu("navigate")}
        closeButtonRef={closeButtonRef}
      />
      <div className="flex min-w-0 w-full flex-1 flex-col md:h-full md:overflow-hidden">
        <Header
          mobileMenuOpen={mobileMenuOpen}
          menuButtonRef={menuButtonRef}
          onMobileMenuToggle={() => dispatchMobileMenu("toggle")}
        />
        <main className="min-w-0 w-full flex-1 p-3 sm:p-4 md:min-h-0 md:overflow-y-auto md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
