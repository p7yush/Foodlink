"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { KG_PER_MEAL } from "@/lib/impact"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowRight,
  Leaf,
  ShieldCheck,
  Clock,
  LineChart,
  MapPin,
} from "lucide-react"

type UserRole = "donor" | "ngo" | null

type NetworkStats = {
  meals_rescued: number
  completed_deliveries: number
  active_volunteers: number
  partner_shelters: number
  donor_partners: number
  available_now: number
}

export default function LandingPage() {
  const [role, setRole] = useState<UserRole>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [checkingUser, setCheckingUser] = useState(true)
  const [stats, setStats] = useState<NetworkStats | null>(null)

  async function handleLogout() {
    await supabase.auth.signOut()
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/")
  }

  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.rpc("impact_stats")
      if (data) setStats(data as NetworkStats)
    }
    loadStats()
  }, [])

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setLoggedIn(false)
          setRole(null)
          return
        }

        setLoggedIn(true)

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (profile?.role === "donor") {
          setRole("donor")
        } else if (profile?.role === "ngo") {
          setRole("ngo")
        }
      } catch (error) {
        console.error("Error loading user:", error)
      } finally {
        setCheckingUser(false)
      }
    }

    loadUser()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-20 min-w-0 items-center justify-between gap-1 border-b bg-background/80 px-2 backdrop-blur-md sm:gap-2 sm:px-6 lg:px-14">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2 font-semibold"
        >
          <div className="bg-primary/10 p-2 rounded-lg">
            <Leaf className="h-6 w-6 text-primary" />
          </div>

          <span className="text-lg tracking-tight sm:text-xl">
            Foodlink
          </span>
        </Link>

        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <Link
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            How it works
          </Link>

          <Link
            href="#impact"
            className="hover:text-foreground transition-colors"
          >
            Impact
          </Link>

          <Link
            href="#network"
            className="hover:text-foreground transition-colors"
          >
            Network
          </Link>
        </nav>

        {/* Header Buttons */}
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-3">
          {checkingUser ? (
            <span className="text-sm text-muted-foreground">
              Loading...
            </span>
          ) : !loggedIn ? (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="h-10 px-2 sm:px-3">
                  Login
                </Button>
              </Link>

              <Link href="/signup">
                <Button variant="ghost" size="sm" className="h-10 px-2 sm:px-3">
                  Create Account
                </Button>
              </Link>

              <Link href="/donations/new">
                <Button className="hidden rounded-full shadow-lg sm:inline-flex">
                  Post a Donation
                </Button>
              </Link>
            </>
          ) : role === "donor" ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="hidden h-10 px-2 sm:inline-flex sm:px-3">
                  View Operations
                </Button>
              </Link>

              <Link href="/donations/new">
                <Button className="hidden rounded-full shadow-lg sm:inline-flex">
                  Post a Donation
                </Button>
              </Link>

              <Button variant="outline" size="sm" className="h-10 px-2 sm:px-3" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : role === "ngo" ? (
            <>
              <Link href="/donations" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="h-10">
                  Browse Food
                </Button>
              </Link>

              <Link href="/requests" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="h-10">
                  View Requests
                </Button>
              </Link>

              <Button variant="outline" size="sm" className="h-10 px-2 sm:px-3" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="h-10">
                  Dashboard
                </Button>
              </Link>

              <Button variant="outline" size="sm" className="h-10 px-2 sm:px-3" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex w-full flex-col items-center px-4 py-20 text-center sm:px-6 md:py-32 lg:px-14 lg:py-40">
          <Badge
            variant="outline"
            className="mb-6 max-w-full whitespace-normal break-words rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-center font-medium tracking-wide text-primary"
          >
            Intelligent Food Rescue Network
          </Badge>

          <h1 className="mb-8 max-w-4xl break-words text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl md:text-7xl">
            Rescue surplus food.
            <br />

            <span className="text-muted-foreground font-medium">
              Before it becomes waste.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
            Foodlink connects surplus food from restaurants and
            cafeterias with nearby shelters and volunteers in real
            time, helping good food reach people instead of becoming
            waste.
          </p>

          {/* Hero Buttons */}
          <div className="mb-16 flex w-full max-w-sm flex-col items-stretch gap-3 sm:mb-20 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            {checkingUser ? (
              <Button
                size="lg"
                disabled
                className="h-14 w-full rounded-full px-6 text-base sm:w-auto sm:px-8"
              >
                Loading...
              </Button>
            ) : !loggedIn ? (
              <>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-full px-6 text-base sm:w-auto sm:px-8"
                  >
                    Login
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-full px-6 text-base sm:w-auto sm:px-8"
                  >
                    Create Account
                  </Button>
                </Link>

                <Link href="/donations/new">
                  <Button
                    size="lg"
                    className="h-14 w-full rounded-full px-6 text-base shadow-xl sm:w-auto sm:px-8"
                  >
                    Post a Donation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </>
            ) : role === "donor" ? (
              <>
                <Link href="/donations/new">
                  <Button
                    size="lg"
                    className="h-14 w-full rounded-full px-6 text-base shadow-xl sm:w-auto sm:px-8"
                  >
                    Post a Donation
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-full px-6 text-base sm:w-auto sm:px-8"
                  >
                    View Operations
                  </Button>
                </Link>
              </>
            ) : role === "ngo" ? (
              <>
                <Link href="/donations">
                  <Button
                    size="lg"
                    className="h-14 w-full rounded-full px-6 text-base shadow-xl sm:w-auto sm:px-8"
                  >
                    Browse Available Food
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/requests">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 w-full rounded-full px-6 text-base sm:w-auto sm:px-8"
                  >
                    View Requests
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-14 w-full rounded-full px-6 text-base sm:w-auto sm:px-8"
                >
                  Open Dashboard
                </Button>
              </Link>
            )}
          </div>

          {/* Hero Visual */}
          <div className="relative flex w-full min-w-0 max-w-5xl flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border bg-card/50 p-2 shadow-2xl md:flex-row">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent z-10 top-1/2"></div>

            <div className="flex w-full min-w-0 flex-col items-center gap-4 rounded-xl border bg-background p-6 text-center md:flex-1">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <PackageIcon className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-sm">
                  Donation Posted
                </h3>

                <p className="text-xs text-muted-foreground">
                  45 meals reported
                </p>
              </div>
            </div>

            <ArrowRight className="text-muted-foreground hidden md:block h-5 w-5 flex-shrink-0" />

            <div className="flex w-full min-w-0 flex-col items-center gap-4 rounded-xl border bg-background p-6 text-center md:flex-1">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-sm">
                  AI Matched
                </h3>

                <p className="text-xs text-muted-foreground">
                  Hope Shelter selected
                </p>
              </div>
            </div>

            <ArrowRight className="text-muted-foreground hidden md:block h-5 w-5 flex-shrink-0" />

            <div className="relative z-20 flex w-full min-w-0 flex-col items-center gap-4 rounded-xl border border-primary/20 bg-background p-6 text-center shadow-sm md:flex-1">
              <div className="absolute -top-3 -right-3">
                <span className="relative flex h-6 w-6">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>

                  <span className="relative inline-flex rounded-full h-6 w-6 bg-primary border-2 border-background"></span>
                </span>
              </div>

              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <MapPin className="h-6 w-6" />
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-sm">
                  In Transit
                </h3>

                <p className="text-xs text-muted-foreground">
                  Volunteer arriving in 8m
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section
          id="impact"
          className="w-full py-20 bg-muted/30 border-y"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-14">
            <div className="text-center mb-10 space-y-2">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                Live network numbers
              </h3>
              <p className="text-sm text-muted-foreground">
                Counted from completed deliveries in the Foodlink database, not estimates.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-2 md:grid-cols-4 md:gap-12">
              <div className="space-y-2">
                <h4 className="break-words text-3xl font-bold tracking-tight text-primary sm:text-4xl md:text-5xl">
                  {stats ? stats.meals_rescued.toLocaleString() : "—"}
                </h4>

                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  Meals rescued
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {stats ? ((stats.meals_rescued * KG_PER_MEAL) / 1000).toFixed(2) : "—"}
                </h4>

                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  Tonnes diverted
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {stats ? stats.active_volunteers : "—"}
                </h4>

                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  Active volunteers
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="break-words text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {stats ? stats.partner_shelters : "—"}
                </h4>

                <p className="text-sm md:text-base text-muted-foreground font-medium">
                  Partner shelters
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 md:py-32 lg:px-14"
        >
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              A seamless food rescue pipeline
            </h2>

            <p className="text-lg text-muted-foreground">
              From the kitchen counter to people in need. Foodlink
              helps coordinate the process so surplus food can be
              redistributed quickly.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <FeatureCard
              icon={
                <Clock className="h-6 w-6 text-foreground" />
              }
              title="1. Rapid Intake"
              desc="Donors post surplus food with details such as quantity, food type, expiry time, and pickup location."
            />

            <FeatureCard
              icon={
                <LineChart className="h-6 w-6 text-foreground" />
              }
              title="2. NGO Requests"
              desc="NGOs can view available food donations and request the food they need."
            />

            <FeatureCard
              icon={
                <ShieldCheck className="h-6 w-6 text-foreground" />
              }
              title="3. Coordinated Pickup"
              desc="Donors can review requests and accept or reject them before the food is collected."
            />
          </div>
        </section>

        {/* Network Section */}
        <section
          id="network"
          className="w-full py-24 bg-muted/30 border-y"
        >
          <div className="mx-auto w-full max-w-4xl px-4 text-center sm:px-6">
            <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-7 w-7 text-primary" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Connecting the local food rescue network
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
              Foodlink brings donors and NGOs together through one
              simple platform, making it easier to discover available
              food, request donations, and coordinate redistribution.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 px-6 lg:px-14 bg-card text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-muted-foreground"
          >
            <Leaf className="h-5 w-5" />

            <span>Foodlink</span>
          </Link>

          <p className="text-sm text-muted-foreground">
            Built for a sustainable future. Hackathon Project.
          </p>
        </div>
      </footer>
    </div>
  )
}

function PackageIcon(
  props: React.SVGProps<SVGSVGElement>
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16.5 9.4 7.5 4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  )
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-col p-8 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-6">
        {icon}
      </div>

      <h3 className="text-xl font-bold mb-3">
        {title}
      </h3>

      <p className="text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  )
}
