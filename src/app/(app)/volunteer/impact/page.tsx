"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { KG_PER_MEAL } from "@/lib/impact"
import { Package, Truck, MapPin, Leaf, Trophy } from "lucide-react"

export default function VolunteerImpact() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    mealsRescued: 0,
    pickupsCompleted: 0,
    distanceTravelled: 0, // Mock for MVP
    foodDiverted: 0 // Mock calculation based on meals
  })

  useEffect(() => {
    async function fetchImpact() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from("pickups")
          .select("*, food_requests(food_donations(quantity))")
          .eq("volunteer_id", user.id)
          .eq("status", "completed")

        if (error) throw error

        let totalMeals = 0
        if (data) {
          data.forEach(pickup => {
            const qty = pickup.food_requests?.food_donations?.quantity || 0
            totalMeals += qty
          })
          
          setStats({
            mealsRescued: totalMeals,
            pickupsCompleted: data.length,
            distanceTravelled: data.length * 3.4, // avg 3.4 km per pickup
            foodDiverted: totalMeals * KG_PER_MEAL
          })
        }
      } catch (err) {
        console.error("Error fetching impact:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchImpact()
  }, [user])

  if (loading) return <div className="p-8">Loading impact...</div>

  if (profile?.role !== "volunteer") {
    return <div className="p-8">Access Denied. Only volunteers can view this page.</div>
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Impact</h1>
        <p className="text-muted-foreground text-lg">See the real-world difference you&apos;re making.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="rounded-2xl border-border/50 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Meals Rescued</p>
                <h3 className="text-4xl font-black mt-2 text-emerald-950 dark:text-emerald-50">{stats.mealsRescued}</h3>
              </div>
              <div className="p-3 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-xl">
                <Package className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Pickups</p>
                <h3 className="text-4xl font-black mt-2">{stats.pickupsCompleted}</h3>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Distance Travelled</p>
                <h3 className="text-4xl font-black mt-2">{stats.distanceTravelled.toFixed(1)} <span className="text-lg text-muted-foreground font-normal">km</span></h3>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-xl">
                <MapPin className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Est. Food Diverted</p>
                <h3 className="text-4xl font-black mt-2">{stats.foodDiverted.toFixed(1)} <span className="text-lg text-muted-foreground font-normal">kg</span></h3>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl">
                <Leaf className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Trophy className="w-6 h-6 text-yellow-500"/> Badges & Achievements</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={`rounded-xl border-border/50 text-center flex flex-col items-center justify-center p-6 ${stats.pickupsCompleted >= 1 ? 'bg-background shadow-sm' : 'bg-muted/30 opacity-50'}`}>
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🌱</span>
            </div>
            <h4 className="font-bold">First Rescue</h4>
            <p className="text-xs text-muted-foreground mt-1">Completed 1 pickup</p>
          </Card>

          <Card className={`rounded-xl border-border/50 text-center flex flex-col items-center justify-center p-6 ${stats.pickupsCompleted >= 10 ? 'bg-background shadow-sm' : 'bg-muted/30 opacity-50'}`}>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">⭐</span>
            </div>
            <h4 className="font-bold">Rising Star</h4>
            <p className="text-xs text-muted-foreground mt-1">Completed 10 pickups</p>
          </Card>
          
          <Card className={`rounded-xl border-border/50 text-center flex flex-col items-center justify-center p-6 ${stats.pickupsCompleted >= 50 ? 'bg-background shadow-sm' : 'bg-muted/30 opacity-50'}`}>
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">👑</span>
            </div>
            <h4 className="font-bold">Foodlink Champ</h4>
            <p className="text-xs text-muted-foreground mt-1">Completed 50 pickups</p>
          </Card>
          
          <Card className={`rounded-xl border-border/50 text-center flex flex-col items-center justify-center p-6 ${stats.foodDiverted >= 100 ? 'bg-background shadow-sm' : 'bg-muted/30 opacity-50'}`}>
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🌍</span>
            </div>
            <h4 className="font-bold">Eco Hero</h4>
            <p className="text-xs text-muted-foreground mt-1">Diverted 100kg of food</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
