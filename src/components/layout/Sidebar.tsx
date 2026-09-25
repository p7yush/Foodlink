"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/AuthProvider"
import {
  LayoutDashboard,
  PackageSearch,
  PlusCircle,
  Inbox,
  User,
  LogOut,
  Leaf
} from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const { profile, loading, logout } = useAuth()

  // Don't render sidebar on landing page or auth pages
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup")) return null

  if (loading) return (
    <div className="hidden border-r bg-background md:flex w-64 flex-col justify-between">
      <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
    </div>
  )

  const donorLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Donations", href: "/donations", icon: PackageSearch },
    { name: "Post Donation", href: "/donations/new", icon: PlusCircle },
    { name: "Incoming Requests", href: "/requests", icon: Inbox },
  ]

  const ngoLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Browse Food", href: "/donations", icon: PackageSearch },
    { name: "My Requests", href: "/requests", icon: Inbox },
  ]

  const volunteerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Available Pickups", href: "/volunteer/pickups", icon: PackageSearch },
    { name: "Pickup History", href: "/volunteer/history", icon: Inbox },
    { name: "My Impact", href: "/volunteer/impact", icon: Leaf },
  ]

  const navItems = profile?.role === "donor" ? donorLinks : profile?.role === "volunteer" ? volunteerLinks : ngoLinks

  return (
    <div className="hidden border-r bg-background md:flex w-64 flex-col justify-between">
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="bg-primary/10 p-1.5 rounded-md">
              <Leaf className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg tracking-tight">Foodlink</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
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
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center uppercase font-bold text-primary">
              {profile?.name?.charAt(0) || <User className="h-5 w-5" />}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{profile?.name || "User"}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {profile?.role || "Role"}
              </span>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
