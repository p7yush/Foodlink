"use client"

import { type FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { KeyRound, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"

type PageState = "checking" | "ready" | "invalid" | "done"

function resetLinkError() {
  return "This reset link has expired or is invalid. Request a new link to continue."
}

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("checking")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    let active = true
    let sawRecoveryEvent = false
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const linkError = query.get("error_code") || query.get("error") || hash.get("error_code") || hash.get("error")
    const isRecoveryUrl = query.get("type") === "recovery"
      || hash.get("type") === "recovery"
      || query.has("code")

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        sawRecoveryEvent = true
        setErrorMessage("")
        setPageState("ready")
      }
    })

    async function checkRecoverySession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!active) return
        if (linkError) {
          setErrorMessage(resetLinkError())
          setPageState("invalid")
        } else if (error) {
          setErrorMessage(resetLinkError())
          setPageState("invalid")
        } else if (session && (isRecoveryUrl || sawRecoveryEvent)) {
          setPageState("ready")
        } else if (sawRecoveryEvent) {
          setPageState("ready")
        } else {
          setErrorMessage(resetLinkError())
          setPageState("invalid")
        }
      } catch {
        if (!active) return
        setErrorMessage(resetLinkError())
        setPageState("invalid")
      }
    }

    void checkRecoverySession()
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function saveNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage("")
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setErrorMessage("Use at least 8 characters, including a letter and a number.")
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("The new passwords do not match.")
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes("session") || message.includes("token") || message.includes("expired")) {
          setErrorMessage(resetLinkError())
          setPageState("invalid")
        } else if (message.includes("weak") || message.includes("password")) {
          setErrorMessage("Choose a stronger password that meets your account's password requirements.")
        } else {
          setErrorMessage("The password could not be updated. Request a new reset link and try again.")
        }
      } else {
        setNewPassword("")
        setConfirmPassword("")
        setPageState("done")
        await supabase.auth.signOut()
      }
    } catch {
      setErrorMessage("The password could not be updated. Request a new reset link and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4 sm:p-6">
      <Card className="w-full max-w-md border-border/60 shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {pageState === "invalid" ? <ShieldAlert className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <CardTitle className="text-2xl">
            {pageState === "done" ? "Password updated" : pageState === "invalid" ? "Reset link unavailable" : "Set a new password"}
          </CardTitle>
          <CardDescription>
            {pageState === "done"
              ? "Your password has been updated. Sign in with your new password."
              : pageState === "invalid"
                ? "The password reset link can no longer be used."
                : "Choose a new password for your Foodlink account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pageState === "checking" && <p className="text-center text-sm text-muted-foreground" role="status">Checking your reset link…</p>}
          {pageState === "ready" && (
            <form onSubmit={saveNewPassword} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={saving} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={saving} />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /> Show passwords
              </label>
              <p className="text-xs text-muted-foreground">Use at least 8 characters, including a letter and a number.</p>
              <Button type="submit" className="w-full" disabled={saving}>{saving ? "Updating password…" : "Update password"}</Button>
            </form>
          )}
          {errorMessage && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{errorMessage}</p>}
          {(pageState === "invalid" || pageState === "done") && (
            <div className="mt-5 flex flex-col gap-3">
              {pageState === "invalid" && <Link href="/forgot-password" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Request another reset link</Link>}
              {pageState === "done" && <Link href="/login?passwordUpdated=1" className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">Go to login</Link>}
              {pageState === "invalid" && <Link href="/login" className="text-center text-sm text-muted-foreground hover:underline">Back to login</Link>}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
