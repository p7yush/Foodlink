import type { SupabaseClient } from "@supabase/supabase-js"

export type PasswordAuthClient = Pick<
  SupabaseClient["auth"],
  "signInWithPassword" | "getSession" | "updateUser" | "dispose"
>

export type PasswordChangeResult =
  | { status: "success" }
  | { status: "verification-failed"; error: unknown }
  | { status: "verification-incomplete" }
  | { status: "account-mismatch" }
  | { status: "session-changed" }
  | { status: "update-failed"; error: unknown }

export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  if (!currentPassword) return "Enter your current password."
  if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return "Use at least 8 characters, including a letter and a number."
  }
  if (newPassword !== confirmPassword) return "The new passwords do not match."
  return null
}

function normalizedEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export async function verifyCurrentPasswordAndChange(
  auth: PasswordAuthClient,
  userId: string,
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  try {
    const verification = await auth.signInWithPassword({ email, password: currentPassword })
    if (verification.error) return { status: "verification-failed", error: verification.error }

    const { user, session } = verification.data
    if (!session || !user) return { status: "verification-incomplete" }
    if (
      user.id !== userId
      || session.user.id !== userId
      || normalizedEmail(user.email) !== normalizedEmail(email)
      || normalizedEmail(session.user.email) !== normalizedEmail(email)
    ) {
      return { status: "account-mismatch" }
    }

    // This is an isolated, non-persisting Auth client. Re-read its session and
    // compare the exact token immediately before updateUser so the update cannot
    // silently use a different account/session than the one just verified.
    let currentSessionResult: Awaited<ReturnType<PasswordAuthClient["getSession"]>>
    try {
      currentSessionResult = await auth.getSession()
    } catch (error) {
      return { status: "verification-failed", error }
    }
    if (currentSessionResult.error) {
      return { status: "verification-failed", error: currentSessionResult.error }
    }
    const currentSession = currentSessionResult.data.session
    if (!currentSession) return { status: "verification-incomplete" }
    if (
      currentSession.user.id !== userId
      || normalizedEmail(currentSession.user.email) !== normalizedEmail(email)
    ) {
      return { status: "account-mismatch" }
    }
    if (currentSession.access_token !== session.access_token) {
      return { status: "session-changed" }
    }

    try {
      const { data, error } = await auth.updateUser({ password: newPassword })
      if (error) return { status: "update-failed", error }
      if (!data.user) return { status: "update-failed", error: new Error("Auth did not confirm the account update") }
      if (data.user.id !== userId) return { status: "account-mismatch" }
      return { status: "success" }
    } catch (error) {
      return { status: "update-failed", error }
    }
  } catch (error) {
    return { status: "verification-failed", error }
  } finally {
    try {
      await auth.dispose()
    } catch {
      // Disposal is cleanup only; never mask the Auth result.
    }
  }
}

export function passwordChangeErrorMessage(error: unknown, phase: "verification" | "update") {
  const details = typeof error === "object" && error !== null ? error as {
    code?: unknown
    message?: unknown
    name?: unknown
    status?: unknown
  } : {}
  const code = typeof details.code === "string" ? details.code.toLowerCase() : ""
  const message = typeof details.message === "string" ? details.message.toLowerCase() : ""
  const name = typeof details.name === "string" ? details.name.toLowerCase() : ""
  const status = typeof details.status === "number" ? details.status : null

  if (
    phase === "verification"
    && (code === "invalid_credentials" || message.includes("invalid login credentials"))
  ) {
    return "Current password is incorrect."
  }
  if (
    phase === "update"
    && (code === "same_password" || /same password|different from (the )?(old|current) password/.test(message))
  ) {
    return "Choose a new password that is different from your current password."
  }
  if (
    phase === "update"
    && (code === "weak_password" || /weak password|password.{0,30}(weak|too short)/.test(message))
  ) {
    return "Choose a stronger password that meets your account's password requirements."
  }
  if (
    code === "session_not_found"
    || name.includes("authsessionmissing")
    || /(session|token).{0,30}(expired|invalid|missing)|jwt expired/.test(message)
    || (phase === "update" && status === 401)
  ) {
    return "Your authentication session is invalid or expired. Sign in again and retry."
  }

  return phase === "verification"
    ? "Could not verify the current password. Check your connection and try again."
    : "Could not update the password. Check your connection and try again."
}
