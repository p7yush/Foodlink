"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/providers/AuthProvider"
import { ProfileAvatar } from "@/components/profile/ProfileAvatar"
import { getProfileImageUrl } from "@/lib/profile-image"

export function Header() {
  const pathname = usePathname()
  const { profile } = useAuth()

  // Don't render on landing page or auth pages
  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) return null

  const getPageTitle = () => {
    if (pathname === "/dashboard") return "Dashboard"
    if (pathname === "/donations") return profile?.role === "donor" ? "My Donations" : "Available Food"
    if (pathname === "/donations/new") return "Post Surplus Food"
    if (pathname.startsWith("/donations/")) return "Donation Details"
    if (pathname === "/requests") return profile?.role === "donor" ? "Incoming Requests" : "My Requests"
    if (pathname === "/matches") return "Match Suggestions"
    if (pathname === "/recipients") return "Recipient Network"
    if (pathname === "/volunteers") return "Volunteer Network"
    if (pathname === "/analytics") return "Impact Analytics"
    if (pathname === "/volunteer/pickups") return "Available Pickups"
    if (pathname.startsWith("/volunteer/pickups/")) return "Delivery Run"
    if (pathname === "/volunteer/history") return "Pickup History"
    if (pathname === "/volunteer/impact") return "My Impact"
    if (pathname === "/profile") return "Profile & Settings"
    return "Foodlink"
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-md px-4 lg:h-[60px] lg:px-6 shadow-sm">
      <Button variant="outline" size="icon" className="shrink-0 md:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>
      
      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold md:text-xl">{getPageTitle()}</h1>
      </div>
      <Link href="/profile" className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden" aria-label="Open profile settings">
        <ProfileAvatar
          src={getProfileImageUrl(profile?.profile_image_path)}
          name={profile?.name}
          className="h-8 w-8 text-xs"
        />
        <span className="sr-only">Profile</span>
      </Link>
    </header>
  )
}
