"use client"

import { usePathname } from "next/navigation"
import { Search, Bell, Menu } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function Header() {
  const pathname = usePathname()

  if (pathname === "/") return null

  // A simple way to get a title from pathname for mock purposes
  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Operations Dashboard"
    if (pathname === "/donations") return "Donations"
    if (pathname === "/donations/new") return "Post Surplus Food"
    if (pathname.startsWith("/donations/")) return "Donation Details"
    if (pathname === "/matches") return "Matching Center"
    if (pathname === "/volunteers") return "Volunteers"
    if (pathname === "/recipients") return "Recipients"
    if (pathname === "/analytics") return "Impact Analytics"
    if (pathname === "/settings") return "Settings"
    return "FoodFlow"
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
      
      <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
        <form className="ml-auto flex-1 sm:flex-initial hidden md:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search donations, volunteers..."
              className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </form>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Toggle notifications</span>
          <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
        </Button>
        <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-primary">
            OT
          </div>
        </Button>
      </div>
    </header>
  )
}
