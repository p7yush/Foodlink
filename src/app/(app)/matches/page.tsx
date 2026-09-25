import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getDonations, getRecipients } from "@/lib/db"
import { ArrowRight, Check, Network, AlertCircle } from "lucide-react"
import Link from "next/link"

export default async function MatchesPage() {
  const mockDonations = await getDonations()
  const mockRecipients = await getRecipients()
  
  const needsMatch = mockDonations.filter(d => d.status === 'Needs Match')
  
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" /> Matching Center
          </h2>
          <p className="text-muted-foreground mt-1">Foodlink continuously matches available donations with recipient capacity and volunteer availability.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              Unmatched Donations <Badge variant="secondary" className="bg-muted">{needsMatch.length}</Badge>
            </h3>
          </div>
          
          <div className="flex flex-col gap-4">
            {needsMatch.map(donation => (
              <Card key={donation.id} className="shadow-sm border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold">{donation.quantity} {donation.foodType}</h4>
                      <p className="text-sm text-muted-foreground">{donation.donorName}</p>
                    </div>
                    <Badge variant="destructive" className="bg-destructive/10 text-destructive border-transparent hover:bg-destructive/20 shadow-none">
                      Expires in 1h 42m
                    </Badge>
                  </div>
                  <div className="text-sm flex flex-wrap gap-2 text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs">{donation.category}</span>
                    {donation.dietaryType && <span className="bg-muted px-2 py-0.5 rounded text-xs">{donation.dietaryType}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              Recommended Matches
            </h3>
          </div>
          
          <div className="flex flex-col gap-4">
            {needsMatch.map(donation => (
              <Card key={`match-${donation.id}`} className="shadow-sm border-emerald-500/30 overflow-hidden relative">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 rounded-bl-lg text-xs font-bold tracking-wider z-10">
                  94% MATCH
                </div>
                <CardContent className="p-0 flex flex-col">
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border/50 bg-emerald-500/5">
                     <div className="flex-1">
                       <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">From</p>
                       <p className="font-bold truncate">{donation.quantity} {donation.foodType}</p>
                       <p className="text-sm text-muted-foreground truncate">{donation.donorName}</p>
                     </div>
                     <ArrowRight className="hidden sm:block text-muted-foreground h-5 w-5 shrink-0" />
                     <div className="flex-1">
                       <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">To</p>
                       <p className="font-bold truncate">{mockRecipients[0].name}</p>
                       <p className="text-sm text-muted-foreground truncate">{mockRecipients[0].location}</p>
                     </div>
                  </div>
                  
                  <div className="p-4 bg-background flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500" /> Closest recipient ({mockRecipients[0].distance} km)
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500" /> Enough capacity
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500" /> Dietary reqs satisfied
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-emerald-500" /> 3 volunteers nearby
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full pt-2">
                      <Link href={`/donations/${donation.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">View Details</Button>
                      </Link>
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">Assign Pickup</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {needsMatch.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl border-dashed bg-muted/10">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">No pending matches</h3>
                <p className="text-muted-foreground">All active donations have been matched.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
