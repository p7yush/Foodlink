"use client"

import { FormEvent, useEffect, useState } from "react"
import { useAuth } from "@/components/providers/AuthProvider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings as SettingsIcon } from "lucide-react"

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    let active = true

    async function loadProfile() {
      if (!user) {
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle()

      if (!active) return
      if (error) setMessage("Could not load your contact number.")
      else setPhone(data?.phone || "")
      setLoading(false)
    }

    void loadProfile()
    return () => { active = false }
  }, [user])

  async function savePhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage("")
    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone.trim() || null })
      .eq("id", user.id)

    setMessage(error ? `Could not save your number: ${error.message}` : "Contact number saved.")
    setSaving(false)
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <SettingsIcon className="h-6 w-6 text-primary" /> Settings
        </h2>
        <p className="mt-1 text-muted-foreground">Manage your delivery contact information.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Contact number</CardTitle>
          <CardDescription>
            {profile?.role === "volunteer"
              ? "Donors and NGOs can use this number to contact you about an active delivery."
              : "Your number helps coordinate food handoffs."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="max-w-md space-y-4" onSubmit={savePhone}>
            <div className="grid gap-2">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Enter your mobile number"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={loading || saving}
              />
            </div>
            <Button type="submit" disabled={loading || saving}>
              {saving ? "Saving..." : "Save number"}
            </Button>
            {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
