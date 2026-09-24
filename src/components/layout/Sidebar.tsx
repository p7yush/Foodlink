"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PackageSearch,
  Network,
  Users,
  Building2,
  BarChart3,
  Settings,
  Leaf
} from "lucide-react"

const navItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Donations", href: "/donations", icon: PackageSearch },
  { name: "Matching Center", href: "/matches", icon: Network },
  { name: "Volunteers", href: "/volunteers", icon: Users },
  { name: "Recipients", href: "/recipients", icon: Building2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function Sidebar() {
  const pathname = usePathname()

  // Don't render sidebar on landing page
  if (pathname === "/") return null

  return (
    <div className="hidden border-r bg-background md:flex w-64 flex-col justify-between">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="bg-primary/10 p-1.5 rounded-md">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg tracking-tight">FoodFlow</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive ? "bg-muted text-primary" : "hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-2">
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                pathname === "/settings" ? "bg-muted text-primary" : ""
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
          
          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Operations HQ</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
