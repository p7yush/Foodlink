"use client"

import { type FormEvent, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedEmail = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMessage("Enter a valid email address.")
      setSubmitted(false)
      return
    }

    setLoading(true)
    setErrorMessage("")
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        setErrorMessage("We couldn’t start the password reset. Check the email address and try again.")
        setSubmitted(false)
      } else {
        setSubmitted(true)
      }
    } catch {
      setErrorMessage("We couldn’t start the password reset. Please try again in a moment.")
      setSubmitted(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
          <CardTitle className="text-2xl">Forgot your password?</CardTitle>
          <CardDescription>Enter the email address on your Foodlink account and we’ll send a reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={requestReset} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-email">Email address</Label>
              <Input id="reset-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={loading} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending reset link…" : "Send reset link"}</Button>
            {errorMessage && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{errorMessage}</p>}
            {submitted && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800" role="status">
                If an account matches that email, a password reset link is on its way. Check your inbox and spam folder.
              </p>
            )}
          </form>
          <div className="mt-6 border-t pt-5 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to login</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
