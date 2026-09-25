"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Package, Building2, Leaf } from "lucide-react"
import { CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart as RechartsLineChart } from "recharts"
import { AnalyticsData } from "@/types"

const impactData = [
  { month: "Jan", meals: 1800, co2: 1200 },
  { month: "Feb", meals: 2200, co2: 1500 },
  { month: "Mar", meals: 1900, co2: 1300 },
  { month: "Apr", meals: 2800, co2: 1900 },
  { month: "May", meals: 3200, co2: 2200 },
  { month: "Jun", meals: 3842, co2: 2600 },
]

export function AnalyticsClient({ mockAnalytics }: { mockAnalytics: AnalyticsData }) {
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Impact Analytics</h2>
        <p className="text-muted-foreground">Measure your food rescue impact and network efficiency.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border/50 bg-emerald-500/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Meals rescued</CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{mockAnalytics.mealsRescued.toLocaleString()}</div>
            <p className="text-xs mt-1 text-emerald-600 font-medium">All time</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Food diverted</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockAnalytics.foodDiverted} <span className="text-xl text-muted-foreground">tonnes</span></div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CO₂e avoided</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(mockAnalytics.co2eAvoided / 1000).toFixed(1)} <span className="text-xl text-muted-foreground">tonnes</span></div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful deliveries</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockAnalytics.successfulDeliveries}</div>
            <p className="text-xs mt-1 text-muted-foreground font-medium">98.4% success rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Meals Rescued Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={impactData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="meals" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg">Impact Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <p className="text-lg leading-relaxed text-foreground font-medium">
              &quot;This month, Foodlink helped rescue <span className="text-primary font-bold">3,842 meals</span> that would otherwise have gone to waste.&quot;
            </p>
            
            <div className="space-y-4 pt-4 border-t border-border/50">
               <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Efficiency Metrics</h4>
               
               <div className="space-y-2">
                 <div className="flex justify-between items-center text-sm">
                   <span>Avg. matching time</span>
                   <span className="font-bold">4.2 min</span>
                 </div>
                 <div className="w-full bg-muted rounded-full h-1.5">
                   <div className="bg-primary h-1.5 rounded-full" style={{ width: '85%' }}></div>
                 </div>
               </div>
               
               <div className="space-y-2">
                 <div className="flex justify-between items-center text-sm">
                   <span>Avg. pickup time</span>
                   <span className="font-bold">18 min</span>
                 </div>
                 <div className="w-full bg-muted rounded-full h-1.5">
                   <div className="bg-primary h-1.5 rounded-full" style={{ width: '70%' }}></div>
                 </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
