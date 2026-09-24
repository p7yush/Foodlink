import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDonations, getAnalytics } from "@/lib/db"
import { AlertCircle, ArrowUpRight, Clock, MapPin, Package, ShieldAlert, Truck } from "lucide-react"

export default async function DashboardPage() {
  const mockDonations = await getDonations()
  const mockAnalytics = await getAnalytics()
  
  const activeDonations = mockDonations.filter(d => d.status !== 'Delivered')
  
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Good morning, Operations Team</h2>
        <p className="text-muted-foreground">Here's what's happening across your rescue network.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Meals rescued" 
          value={mockAnalytics.mealsRescued.toLocaleString()} 
          trend={`+${mockAnalytics.mealsRescuedTrend}%`} 
          icon={<Package className="h-4 w-4 text-muted-foreground" />} 
        />
        <KpiCard 
          title="Active donations" 
          value={mockAnalytics.activeDonations.toString()} 
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} 
        />
        <KpiCard 
          title="Pickups in progress" 
          value={mockAnalytics.pickupsInProgress.toString()} 
          icon={<Truck className="h-4 w-4 text-muted-foreground" />} 
        />
        <KpiCard 
          title="Food at risk" 
          value={mockAnalytics.foodAtRisk.toString()} 
          trend="Action needed"
          trendCritical
          icon={<ShieldAlert className="h-4 w-4 text-destructive" />} 
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Live Rescue Operations */}
        <Card className="md:col-span-4 lg:col-span-5 shadow-sm border-border/50">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Rescue Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {activeDonations.map(donation => (
                <div key={donation.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex flex-col gap-1.5 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{donation.id}</span>
                      <Badge variant="outline" className="text-xs bg-background">{donation.foodType}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {donation.donorName}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Expires {donation.safeUntilTime}</span>
                    </div>
                  </div>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <StatusBadge status={donation.status} />
                    <span className="text-xs font-medium">{donation.quantity} {donation.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Actions */}
        <div className="md:col-span-3 lg:col-span-2 flex flex-col gap-4">
          <Card className="border-destructive/20 shadow-sm overflow-hidden">
            <div className="bg-destructive/10 px-4 py-2 flex items-center gap-2 border-b border-destructive/10">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <span className="text-sm font-semibold text-destructive uppercase tracking-wider">Urgent Action</span>
            </div>
            <CardContent className="p-4 flex flex-col gap-3 bg-destructive/5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold">45 vegetarian meals</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Expires in 1h 42m
                  </p>
                </div>
              </div>
              <p className="text-sm font-medium">Find pickup volunteer immediately.</p>
              <Button size="sm" variant="destructive" className="w-full mt-1">Resolve Issue</Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">Network Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4 mt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Volunteer Availability</span>
                  <span className="font-medium text-emerald-600">High (12 online)</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Shelter Capacity</span>
                  <span className="font-medium">42% utilized</span>
                </div>
                <div className="h-24 w-full bg-muted/50 rounded-lg border border-dashed flex items-center justify-center relative overflow-hidden mt-2">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                  <span className="text-xs font-medium text-muted-foreground relative z-10 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Live Map View (Simulated)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ title, value, trend, icon, trendCritical }: { title: string, value: string, trend?: string, icon: React.ReactNode, trendCritical?: boolean }) {
  return (
    <Card className="shadow-sm border-border/50 hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs mt-1 flex items-center ${trendCritical ? 'text-destructive font-medium' : 'text-emerald-600'}`}>
            {!trendCritical && <ArrowUpRight className="h-3 w-3 mr-1" />}
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'Needs Match':
      return <Badge variant="warning">Needs Match</Badge>
    case 'Matched':
      return <Badge variant="success">Matched</Badge>
    case 'Pickup In Progress':
    case 'Driver Assigned':
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-transparent">In Transit</Badge>
    case 'At Risk':
      return <Badge variant="destructive">At Risk</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
