import { supabase } from "@/lib/supabase"

export const PROFILE_IMAGES_BUCKET = "foodlink-profile-images"

export function getProfileImageUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl
}

export function profileAvatarInitial(name: string | null | undefined): string | null {
  const initial = Array.from(name?.trim() ?? "")[0]
  return initial ? initial.toUpperCase() : null
}

export function profileAvatarImageSource(
  source: string | null | undefined,
  failedSource: string | null,
): string | null {
  return source && source !== failedSource ? source : null
}
