"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { AlertCircle, Clock, MapPin, Package, Inbox, CheckCircle2 } from "lucide-react"

type Stats = {
  total?: number
  available?: number
  requested?: number
  accepted?: number
  availableFood?: number
  totalRequests?: number
  pending?: number
  activePickups?: number
  completedRuns?: number
  milesDriven?: number
}

type DashboardItem = {
  id: string
  title?: string
  quantity?: number
  pickup_address?: string
  status?: string
  food_requests?: any
  food_donations?: any
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<DashboardItem[]>([])

  useEffect(() => {
    if (!user || !profile) return

    async function loadDashboard() {
      try {
        if (profile?.role === "donor") {
          // Fetch donor stats
          const { data: donations } = await supabase
            .from("food_donations")
            .select("*, food_requests(*)")
            .eq("donor_id", user!.id)
            .order("created_at", { ascending: false })

          const total = donations?.length || 0
          
          let requestedCount = 0
          let acceptedCount = 0
          
          donations?.forEach(d => {
            const reqs = d.food_requests || []
            if (reqs.some((r: { status: string }) => r.status === "pending")) requestedCount++
            if (reqs.some((r: { status: string }) => r.status === "accepted")) acceptedCount++
          })

          setStats({
            total,
            available: total - requestedCount - acceptedCount,
            requested: requestedCount,
            accepted: acceptedCount
          })
          setRecentItems(donations?.slice(0, 5) || [])
          
        } else if (profile?.role === "ngo") {
          // Fetch ngo stats
          const { data: availableFood } = await supabase
            .from("food_donations")
            .select("*")
            // A donation is available if it's not accepted, for MVP we just fetch all
            // Ideally we check if it has accepted requests
            
          const { data: myRequests } = await supabase
            .from("food_requests")
            .select("*, food_donations(*)")
            .eq("ngo_id", user!.id)
            .order("requested_at", { ascending: false })

          const totalRequests = myRequests?.length || 0
          const accepted = myRequests?.filter(r => r.status === "accepted").length || 0
          const pending = myRequests?.filter(r => r.status === "pending").length || 0

          // A simple way to count available: total - anything accepted
          const { data: acceptedRequests } = await supabase
            .from("food_requests")
            .select("food_id")
            .eq("status", "accepted")
            
          const acceptedFoodIds = new Set((acceptedRequests || []).map(r => r.food_id))
          const trulyAvailable = (availableFood || []).filter(f => !acceptedFoodIds.has(f.id)).length

          setStats({
            availableFood: trulyAvailable,
            totalRequests,
            pending,
            accepted
          })
          setRecentItems(myRequests?.slice(0, 5) || [])
        } else if (profile?.role === "volunteer") {
          const { data: myPickups } = await supabase
            .from("pickups")
            .select("*, food_requests(*, food_donations(*))")
            .eq("volunteer_id", user!.id)
            .order("assigned_at", { ascending: false })

          const completed = myPickups?.filter(p => p.status === "completed").length || 0
          const active = myPickups?.filter(p => p.status !== "completed").length || 0

          setStats({
            activePickups: active,
            completedRuns: completed,
            milesDriven: completed * 3, // rough estimate
          })
          setRecentItems(myPickups?.slice(0, 5) || [])
        }
      } catch (error) {
        console.error("Dashboard error:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [user, profile])

  if (authLoading || loading) return <div className="p-8">Loading dashboard...</div>
  if (!profile) return <div className="p-8">Please log in.</div>

  const isDonor = profile.role === "donor"

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 p-8 md:p-10 rounded-[1.5rem] bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/10 shadow-sm relative overflow-hidden mb-2">
        <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none transform rotate-12">
          <Package className="w-64 h-64 text-primary" />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="inline-flex items-center justify-center rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-widest ring-1 ring-inset ring-primary/30">
            {profile.role} Dashboard
          </span>
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight z-10">Welcome back, {profile.name}!</h2>
        <p className="text-muted-foreground text-lg z-10 mt-1 max-w-xl">
          Here is an overview of your {isDonor ? 'donations' : profile.role === 'volunteer' ? 'logistics' : 'requests'} and community impact.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isDonor ? (
          <>
            <KpiCard title="Total Donations" value={stats?.total || 0} icon={<Package className="h-4 w-4 text-muted-foreground" />} />
            <KpiCard title="Available" value={stats?.available || 0} icon={<AlertCircle className="h-4 w-4 text-emerald-600" />} />
            <KpiCard title="Requested" value={stats?.requested || 0} icon={<Inbox className="h-4 w-4 text-blue-600" />} />
            <KpiCard title="Accepted Pickups" value={stats?.accepted || 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
          </>
        ) : profile.role === 'volunteer' ? (
          <>
            <KpiCard title="Active Deliveries" value={stats?.activePickups || 0} icon={<Package className="h-4 w-4 text-emerald-600" />} />
            <KpiCard title="Completed Runs" value={stats?.completedRuns || 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
            <KpiCard title="Miles Driven" value={stats?.milesDriven || 0} icon={<MapPin className="h-4 w-4 text-muted-foreground" />} />
            <KpiCard title="Impact Score" value="A+" icon={<AlertCircle className="h-4 w-4 text-blue-600" />} />
          </>
        ) : (
          <>
            <KpiCard title="Available Food Nearby" value={stats?.availableFood || 0} icon={<Package className="h-4 w-4 text-emerald-600" />} />
            <KpiCard title="My Requests" value={stats?.totalRequests || 0} icon={<Inbox className="h-4 w-4 text-muted-foreground" />} />
            <KpiCard title="Pending Requests" value={stats?.pending || 0} icon={<Clock className="h-4 w-4 text-blue-600" />} />
            <KpiCard title="Accepted Requests" value={stats?.accepted || 0} icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} />
          </>
        )}
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
          <CardTitle className="text-base font-semibold">
            {isDonor ? 'Recent Donations' : profile.role === 'volunteer' ? 'Recent Pickups' : 'Recent Requests'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No recent activity.</div>
            ) : (
              recentItems.map(item => {
                const title = isDonor ? item.title : profile.role === 'volunteer' ? item.food_requests?.food_donations?.title : item.food_donations?.title
                const qty = isDonor ? item.quantity : profile.role === 'volunteer' ? item.food_requests?.food_donations?.quantity : item.food_donations?.quantity
                const status = isDonor ? (item.food_requests?.some((r: any) => r.status === 'accepted') ? 'Accepted' : item.food_requests?.some((r: any) => r.status === 'pending') ? 'Requested' : 'Available') : item.status

                return (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1.5 mb-2 sm:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{title || "Unknown Food"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-3">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {isDonor ? item.pickup_address : item.food_donations?.pickup_address}</span>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                      <Badge variant="outline">{status}</Badge>
                      <span className="text-xs font-medium">Qty: {qty}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ title, value, icon }: { title: string, value: number | string, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}
