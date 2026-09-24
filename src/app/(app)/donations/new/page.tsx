"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, ArrowRight, CheckCircle2, Clock } from "lucide-react"

export default function CreateDonationPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAnalyzed, setIsAnalyzed] = useState(false)

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setIsAnalyzed(true)
    }, 1500)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Post surplus food</h2>
        <p className="text-muted-foreground">Tell us what you have. FoodFlow will find the best recipient.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">AI-assisted intake</CardTitle>
                  <CardDescription>Describe your surplus, and our AI will extract the details.</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea 
                  placeholder="Paste a description instead. E.g. '45 vegetarian meals from today's lunch service, prepared at 12:30 PM...'"
                  className="min-h-[120px] resize-none text-base p-4 bg-muted/30 focus-visible:ring-primary/50"
                />
                {!isAnalyzed ? (
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing}
                    className="w-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border border-primary/20"
                    variant="outline"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin h-4 w-4 rounded-full border-2 border-primary border-t-transparent"></span>
                        Analyzing with AI...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" /> Analyze with AI
                      </span>
                    )}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium text-sm">
                      <CheckCircle2 className="h-4 w-4" /> AI Analysis Complete
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Food Type</p>
                        <p className="font-medium text-sm">Vegetarian meals</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Quantity</p>
                        <p className="font-medium text-sm">45 meals</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Urgency</p>
                        <Badge variant="destructive" className="mt-0.5">HIGH</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Safe Until</p>
                        <p className="font-medium text-sm text-destructive">3:30 PM today</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Food details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="foodName">Food name</Label>
                <Input id="foodName" defaultValue={isAnalyzed ? "Vegetarian meals from lunch service" : ""} placeholder="e.g. Assorted sandwiches" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" defaultValue={isAnalyzed ? "Prepared Food" : ""} placeholder="e.g. Prepared Food" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dietary">Dietary type (Optional)</Label>
                  <Input id="dietary" defaultValue={isAnalyzed ? "Vegetarian" : ""} placeholder="e.g. Vegetarian, Halal" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" defaultValue={isAnalyzed ? "45" : ""} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" defaultValue={isAnalyzed ? "meals" : ""} placeholder="e.g. meals, kg, items" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="preparedTime">Prepared time</Label>
                  <Input id="preparedTime" type="time" defaultValue={isAnalyzed ? "12:30" : ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="safeUntil">Safe-until time</Label>
                  <Input id="safeUntil" type="time" defaultValue={isAnalyzed ? "15:30" : ""} className={isAnalyzed ? "border-destructive/50 focus-visible:ring-destructive/50" : ""} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Pickup details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Pickup location</Label>
                <Input id="location" defaultValue="Main Kitchen - Rear Entrance" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="availableFrom">Available from</Label>
                <Input id="availableFrom" type="time" defaultValue="13:00" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="availableUntil">Available until</Label>
                <Input id="availableUntil" type="time" defaultValue="15:00" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1 text-center">
                <h3 className="font-semibold text-primary">Ready to match?</h3>
                <p className="text-sm text-muted-foreground">Our algorithm will immediately find the most suitable recipient and volunteer.</p>
              </div>
              <Button size="lg" className="w-full shadow-md font-semibold">
                Find Best Match <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
