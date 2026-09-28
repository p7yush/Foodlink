"use client"

import { useState } from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"
import { profileAvatarImageSource, profileAvatarInitial } from "@/lib/profile-image"

type ProfileAvatarProps = {
  src: string | null
  name: string | null | undefined
  className?: string
}

export function ProfileAvatar({ src, name, className }: ProfileAvatarProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const initial = profileAvatarInitial(name)
  const imageSource = profileAvatarImageSource(src, failedSource)

  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold uppercase text-primary", className)} aria-hidden="true">
      {imageSource ? (
        <img
          src={imageSource}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailedSource(imageSource)}
        />
      ) : initial ? (
        <span>{initial}</span>
      ) : (
        <User className="h-1/2 w-1/2" aria-hidden="true" />
      )}
    </span>
  )
}
