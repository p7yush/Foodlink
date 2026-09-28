import { describe, expect, it, vi } from "vitest"
import {
  passwordChangeErrorMessage,
  validatePasswordChange,
  verifyCurrentPasswordAndChange,
  type PasswordAuthClient,
} from "@/lib/change-password"

const USER_ID = "user-123"
const EMAIL = "volunteer@example.com"

function session(overrides: Record<string, unknown> = {}) {
  const user = { id: USER_ID, email: EMAIL, ...((overrides.user as object | undefined) ?? {}) }
  return { access_token: "verified-access-token", user, ...Object.fromEntries(Object.entries(overrides).filter(([key]) => key !== "user")) }
}

function authClient(overrides: {
  signInWithPassword?: ReturnType<typeof vi.fn>
  getSession?: ReturnType<typeof vi.fn>
  updateUser?: ReturnType<typeof vi.fn>
  dispose?: ReturnType<typeof vi.fn>
} = {}) {
  const verifiedSession = session()
  return {
    signInWithPassword: overrides.signInWithPassword ?? vi.fn().mockResolvedValue({
      data: { user: verifiedSession.user, session: verifiedSession },
      error: null,
    }),
    getSession: overrides.getSession ?? vi.fn().mockResolvedValue({ data: { session: verifiedSession }, error: null }),
    updateUser: overrides.updateUser ?? vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }),
    dispose: overrides.dispose ?? vi.fn().mockResolvedValue(undefined),
  } as unknown as PasswordAuthClient
}

async function change(auth: PasswordAuthClient, currentPassword = "OldPassword1", newPassword = "NewPassword1") {
  return verifyCurrentPasswordAndChange(auth, USER_ID, EMAIL, currentPassword, newPassword)
}

describe("password change validation", () => {
  it("requires the current password", () => {
    expect(validatePasswordChange("", "NewPassword1", "NewPassword1"))
      .toBe("Enter your current password.")
  })

  it("rejects weak new passwords", () => {
    expect(validatePasswordChange("OldPassword1", "short", "short"))
      .toMatch(/at least 8 characters/i)
  })

  it("rejects confirmation mismatches", () => {
    expect(validatePasswordChange("OldPassword1", "NewPassword1", "OtherPassword2"))
      .toBe("The new passwords do not match.")
  })

  it("lets Supabase reject a password reused as the current password", () => {
    expect(validatePasswordChange("SamePassword1", "SamePassword1", "SamePassword1")).toBeNull()
  })
})

describe("isolated current-password verification", () => {
  it("verifies the expected email, rereads the same session, then updates and disposes", async () => {
    const calls: string[] = []
    const signInWithPassword = vi.fn(async () => {
      calls.push("verify")
      const verified = session()
      return { data: { user: verified.user, session: verified }, error: null }
    })
    const getSession = vi.fn(async () => {
      calls.push("read-session")
      return { data: { session: session() }, error: null }
    })
    const updateUser = vi.fn(async (attributes: { password: string }) => {
      calls.push("update")
      expect(attributes).toEqual({ password: "NewPassword1" })
      return { data: { user: { id: USER_ID } }, error: null }
    })
    const dispose = vi.fn(async () => { calls.push("dispose") })

    const result = await change(authClient({ signInWithPassword, getSession, updateUser, dispose }))

    expect(result).toEqual({ status: "success" })
    expect(calls).toEqual(["verify", "read-session", "update", "dispose"])
    expect(signInWithPassword).toHaveBeenCalledWith({ email: EMAIL, password: "OldPassword1" })
    expect(getSession).toHaveBeenCalledOnce()
  })

  it("never updates when Supabase rejects the current password", async () => {
    const updateUser = vi.fn()
    const auth = authClient({
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { code: "invalid_credentials", message: "Invalid login credentials" },
      }),
      updateUser,
    })
    const result = await change(auth, "WrongPassword1")
    expect(result.status).toBe("verification-failed")
    expect(passwordChangeErrorMessage(result.status === "verification-failed" ? result.error : null, "verification"))
      .toBe("Current password is incorrect.")
    expect(updateUser).not.toHaveBeenCalled()
    expect(auth.dispose).toHaveBeenCalledOnce()
  })

  it("rejects a verified user ID or email that does not match the profile account", async () => {
    for (const otherUser of [
      { id: "other-user", email: EMAIL },
      { id: USER_ID, email: "other@example.com" },
    ]) {
      const updateUser = vi.fn()
      const result = await change(authClient({
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: otherUser, session: { ...session(), user: otherUser } },
          error: null,
        }),
        updateUser,
      }))
      expect(result).toEqual({ status: "account-mismatch" })
      expect(updateUser).not.toHaveBeenCalled()
    }
  })

  it("does not update if Supabase did not return a verification session", async () => {
    const updateUser = vi.fn()
    const result = await change(authClient({
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID, email: EMAIL }, session: null }, error: null }),
      updateUser,
    }))
    expect(result).toEqual({ status: "verification-incomplete" })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("does not update when the isolated client has no current session", async () => {
    const updateUser = vi.fn()
    const result = await change(authClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      updateUser,
    }))
    expect(result).toEqual({ status: "verification-incomplete" })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("does not update if the isolated session account changes between verification and update", async () => {
    const updateUser = vi.fn()
    const changedSession = session({ user: { id: "other-user", email: EMAIL } })
    const result = await change(authClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: changedSession }, error: null }),
      updateUser,
    }))
    expect(result).toEqual({ status: "account-mismatch" })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("does not update if the verified access token changed before update", async () => {
    const updateUser = vi.fn()
    const changedSession = { ...session(), access_token: "different-session-token" }
    const result = await change(authClient({
      getSession: vi.fn().mockResolvedValue({ data: { session: changedSession }, error: null }),
      updateUser,
    }))
    expect(result).toEqual({ status: "session-changed" })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("handles verification and session-read network failures without updating", async () => {
    const updateUser = vi.fn()
    const verificationFailure = await change(authClient({
      signInWithPassword: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      updateUser,
    }))
    const sessionFailure = await change(authClient({
      getSession: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
      updateUser,
    }))
    expect(verificationFailure.status).toBe("verification-failed")
    expect(sessionFailure.status).toBe("verification-failed")
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("reports expired sessions, weak passwords, and reused passwords clearly", () => {
    expect(passwordChangeErrorMessage({ code: "session_not_found", message: "Session not found" }, "update"))
      .toMatch(/session is invalid or expired/i)
    expect(passwordChangeErrorMessage({ code: "weak_password", message: "Password is weak" }, "update"))
      .toMatch(/stronger password/i)
    expect(passwordChangeErrorMessage({ code: "same_password", message: "New password should be different from the old password" }, "update"))
      .toMatch(/different from your current password/i)
  })

  it("does not report success when Auth rejects a weak, reused, or network-failed update", async () => {
    const failures = [
      { error: { code: "weak_password", message: "Password is weak" } },
      { error: { code: "same_password", message: "New password should be different from the old password" } },
      { reject: new TypeError("Failed to fetch") },
    ]
    for (const failure of failures) {
      const updateUser = failure.reject
        ? vi.fn().mockRejectedValue(failure.reject)
        : vi.fn().mockResolvedValue(failure)
      const result = await change(authClient({ updateUser }))
      expect(result.status).toBe("update-failed")
      expect(result.status === "update-failed"
        ? passwordChangeErrorMessage(result.error, "update")
        : "").not.toContain("password has been changed")
    }
  })
})
