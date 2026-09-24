import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDonations, getRecipients, getVolunteers } from "@/lib/db"
import { StatusBadge } from "@/app/(app)/dashboard/page"
import { Clock, MapPin, Navigation, Star, ShieldCheck, CheckCircle2, User, Building } from "lucide-react"

export default async function DonationDetailsPage({ params }: { params: { id: string } }) {
  const mockDonations = await getDonations()
  const mockRecipients = await getRecipients()
  const mockVolunteers = await getVolunteers()
  
  // Try to find it, otherwise use the first one
  const donation = mockDonations.find(d => d.id === params.id) || mockDonations[0]
  const recipient = mockRecipients[0] // Hope Shelter
  const volunteer = mockVolunteers[0] // Aarav Mehta

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold tracking-tight">Donation {donation.id}</h2>
            <StatusBadge status="Matched" />
          </div>
          <p className="text-lg text-muted-foreground font-medium">{donation.quantity} {donation.foodType}</p>
        </div>
        <div className="flex items-center gap-4 bg-destructive/10 text-destructive px-4 py-2 rounded-lg border border-destructive/20 shadow-sm">
          <Clock className="h-5 w-5" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider">Expires In</p>
            <p className="text-lg font-bold leading-none mt-0.5">1h 42m</p>
          </div>
        </div>
      </div>

      {/* Progress Timeline */}
      <Card className="shadow-sm border-border/50 overflow-hidden">
        <div className="bg-muted/30 p-6 border-b border-border/50">
          <div className="flex justify-between items-center relative">
            {/* Timeline Line */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 right-[40%] h-1 bg-primary -translate-y-1/2 z-0"></div>
            
            {/* Steps */}
            <TimelineStep label="Posted" icon={<CheckCircle2 className="h-5 w-5" />} active completed />
            <TimelineStep label="Analyzed" icon={<ShieldCheck className="h-5 w-5" />} active completed />
            <TimelineStep label="Matched" icon={<Navigation className="h-5 w-5" />} active completed />
            <TimelineStep label="Driver Assigned" icon={<User className="h-5 w-5" />} active />
            <TimelineStep label="Picked Up" icon={<MapPin className="h-5 w-5" />} />
            <TimelineStep label="Delivered" icon={<Building className="h-5 w-5" />} />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Mock Map Area */}
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <div className="h-[300px] w-full bg-muted/30 relative flex items-center justify-center border-b border-border/50">
              {/* Map background pattern */}
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
              
              {/* Fake route */}
              <svg className="absolute inset-0 h-full w-full pointer-events-none" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
                <path d="M 150 150 Q 250 100 350 200 T 550 150" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeDasharray="8 8" className="animate-[dash_20s_linear_infinite]" />
              </svg>

              {/* Markers */}
              <div className="absolute left-[150px] top-[150px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-background border shadow-md p-2 rounded-full z-10"><Building className="h-5 w-5 text-muted-foreground" /></div>
                <span className="text-xs font-semibold bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded mt-1 shadow-sm">Donor</span>
              </div>
              <div className="absolute left-[350px] top-[200px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-blue-500 text-white shadow-md p-2 rounded-full z-10 relative">
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                  </span>
                  <User className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded mt-1 shadow-sm">Volunteer</span>
              </div>
              <div className="absolute left-[550px] top-[150px] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-emerald-500 text-white shadow-md p-2 rounded-full z-10"><MapPin className="h-5 w-5" /></div>
                <span className="text-xs font-semibold bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded mt-1 shadow-sm">Recipient</span>
              </div>
            </div>
            
            <CardContent className="p-0">
               <div className="p-4 bg-muted/20 text-sm font-medium border-b border-border/50 flex justify-between items-center">
                 <span className="text-muted-foreground">Live Route Overview</span>
                 <Badge variant="outline" className="bg-background">Restaurant → Volunteer → Shelter</Badge>
               </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="shadow-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-lg">Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted-foreground/20 ml-3 space-y-6 pb-4">
                <ActivityItem time="12:44 PM" title="Aarav Mehta assigned" desc="Driver accepted pickup request." isNew />
                <ActivityItem time="12:43 PM" title="Hope Shelter matched" desc="Confirmed available capacity for 45 meals." />
                <ActivityItem time="12:42 PM" title="AI Analyzed Donation" desc="Classified as Vegetarian, urgency: HIGH." />
                <ActivityItem time="12:41 PM" title="Donation Posted" desc="By Fresh Farms Cafe" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Match Card */}
          <Card className="shadow-sm border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold tracking-wider">
              BEST MATCH
            </div>
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-xl flex items-center justify-between">
                <span>{recipient.name}</span>
                <span className="text-emerald-600 font-bold text-2xl flex items-center">94<span className="text-sm">%</span></span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Distance</p>
                  <p className="font-medium">{recipient.distance} km away</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Capacity</p>
                  <p className="font-medium">{recipient.capacity - recipient.currentCapacity} meals left</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-md">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Accepts vegetarian food
              </div>
            </CardContent>
          </Card>

          {/* Volunteer Card */}
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Assigned Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-lg">{volunteer.name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500 fill-amber-500" /> {volunteer.rating}</span>
                    <span className="flex items-center gap-1"><Navigation className="h-3 w-3" /> {volunteer.distance} km away</span>
                  </div>
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Arrival</p>
                  <p className="font-bold text-lg">8 min</p>
                </div>
                <Button size="sm">Contact</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TimelineStep({ label, icon, active, completed }: { label: string, icon: React.ReactNode, active?: boolean, completed?: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center gap-2">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors shadow-sm ${
        completed ? 'bg-primary text-primary-foreground' : 
        active ? 'bg-background border-2 border-primary text-primary' : 
        'bg-background border-2 border-muted-foreground/30 text-muted-foreground'
      }`}>
        {icon}
      </div>
      <span className={`text-xs font-semibold ${active || completed ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
    </div>
  )
}

function ActivityItem({ time, title, desc, isNew }: { time: string, title: string, desc: string, isNew?: boolean }) {
  return (
    <div className="relative pl-6">
      <div className={`absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background ${isNew ? 'bg-primary' : 'bg-muted-foreground/40'}`}></div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
