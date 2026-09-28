"use client"

import type { RefObject } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/providers/AuthProvider"
import { ProfileAvatar } from "@/components/profile/ProfileAvatar"
import { getProfileImageUrl } from "@/lib/profile-image"
import {
  LayoutDashboard,
  PackageSearch,
  PlusCircle,
  Inbox,
  User,
  LogOut,
  Leaf,
  Sparkles,
  Building2,
  Truck,
  BarChart3,
  Settings,
  X,
} from "lucide-react"

type SidebarProps = {
  mobileOpen: boolean
  onMobileClose: () => void
  onMobileNavigate: () => void
  closeButtonRef: RefObject<HTMLButtonElement | null>
}

export function Sidebar({ mobileOpen, onMobileClose, onMobileNavigate, closeButtonRef }: SidebarProps) {
  const pathname = usePathname()
  const { profile, loading, logout } = useAuth()

  // Don't render sidebar on landing page or auth pages.
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) return null

  const donorLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Donations", href: "/donations", icon: PackageSearch },
    { name: "Post Donation", href: "/donations/new", icon: PlusCircle },
    { name: "Incoming Requests", href: "/requests", icon: Inbox },
    { name: "Match Suggestions", href: "/matches", icon: Sparkles },
    { name: "Recipients", href: "/recipients", icon: Building2 },
    { name: "Impact", href: "/analytics", icon: BarChart3 },
  ]

  const ngoLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Browse Food", href: "/donations", icon: PackageSearch },
    { name: "My Requests", href: "/requests", icon: Inbox },
    { name: "Match Suggestions", href: "/matches", icon: Sparkles },
    { name: "Volunteers", href: "/volunteers", icon: Truck },
    { name: "Impact", href: "/analytics", icon: BarChart3 },
  ]

  const volunteerLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Available Pickups", href: "/volunteer/pickups", icon: PackageSearch },
    { name: "Pickup History", href: "/volunteer/history", icon: Inbox },
    { name: "My Impact", href: "/volunteer/impact", icon: Leaf },
    { name: "Impact", href: "/analytics", icon: BarChart3 },
  ]

  const navItems = [
    ...(profile?.role === "donor" ? donorLinks : profile?.role === "volunteer" ? volunteerLinks : ngoLinks),
    { name: "Profile", href: "/profile", icon: User },
    ...(profile?.role === "volunteer" ? [{ name: "Settings", href: "/settings", icon: Settings }] : []),
  ]

  const profileImage = getProfileImageUrl(profile?.profile_image_path)
  const displayName = profile?.name || "User"
  const displayRole = profile?.role || "Role"

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col justify-between border-r bg-background md:flex">
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <div className="rounded-md bg-primary/10 p-1.5">
                  <Leaf className="h-5 w-5 text-primary" />
                </div>
                <span className="text-lg tracking-tight">Foodlink</span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
              <nav className="grid items-start space-y-1 px-2 text-sm font-medium lg:px-4" aria-label="Main navigation">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        isActive ? "bg-muted text-primary" : "hover:bg-muted"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 break-words">{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
            <div className="mt-auto border-t p-4">
              <div className="mb-4 flex min-w-0 items-center gap-3">
                <ProfileAvatar src={profileImage} name={displayName} className="h-10 w-10 shrink-0 text-base" />
                <div className="flex min-w-0 flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium">{displayName}</span>
                  <span className="text-xs capitalize text-muted-foreground">{displayRole}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-all hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        )}
      </aside>

      <div
        className={cn(
          "invisible pointer-events-none fixed inset-0 z-[80] md:hidden",
          mobileOpen && "visible pointer-events-auto"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Close navigation menu"
          onClick={onMobileClose}
          className={cn(
            "absolute inset-0 z-0 h-full w-full bg-black/45 opacity-0 transition-opacity",
            mobileOpen && "opacity-100"
          )}
        />
        <aside
          id="mobile-navigation"
          role="dialog"
          aria-modal={mobileOpen}
          aria-label="Main navigation"
          inert={!mobileOpen}
          className={cn(
            "absolute inset-y-0 left-0 z-10 flex w-72 max-w-[calc(100vw-1rem)] flex-col border-r bg-background shadow-2xl transition-transform duration-200 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <Link href="/" onClick={onMobileNavigate} className="flex min-w-0 items-center gap-2 font-semibold">
              <span className="rounded-md bg-primary/10 p-1.5">
                <Leaf className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span className="truncate text-lg tracking-tight">Foodlink</span>
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onMobileClose}
              aria-label="Close navigation menu"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {loading ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">Loading navigation...</div>
          ) : (
            <>
              <nav className="min-h-0 flex-1 overflow-y-auto py-4" aria-label="Main navigation">
                <div className="grid items-start space-y-1 px-3 text-sm font-medium">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onMobileNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:text-primary",
                          isActive ? "bg-muted text-primary" : "hover:bg-muted"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 break-words">{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </nav>

              <div className="shrink-0 border-t p-4">
                <div className="mb-4 flex min-w-0 items-center gap-3">
                  <ProfileAvatar src={profileImage} name={displayName} className="h-10 w-10 shrink-0 text-base" />
                  <div className="flex min-w-0 flex-col overflow-hidden">
                    <span className="truncate text-sm font-medium">{displayName}</span>
                    <span className="text-xs capitalize text-muted-foreground">{displayRole}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onMobileClose()
                    void logout()
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
                  Logout
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
    </>
  )
}
