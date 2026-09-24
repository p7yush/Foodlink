"use client"

import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/AuthProvider"

export function Header() {
  const pathname = usePathname()
  const { profile } = useAuth()

  // Don't render on landing page or auth pages
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup")) return null

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard"
    if (pathname === "/donations") return profile?.role === "donor" ? "My Donations" : "Available Food"
    if (pathname === "/donations/new") return "Post Surplus Food"
    if (pathname.startsWith("/donations/")) return "Donation Details"
    if (pathname === "/requests") return profile?.role === "donor" ? "Incoming Requests" : "My Requests"
    return "Foodlink"
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <Button variant="outline" size="icon" className="shrink-0 md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
      
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold md:text-xl">{getPageTitle()}</h1>
      </div>
    </header>
  )
}
