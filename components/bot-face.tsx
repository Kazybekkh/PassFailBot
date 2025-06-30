import type React from "react"
import { cn } from "@/lib/utils"

export type BotReaction = "idle" | "thinking" | "wary" | "loading" | "win" | "lose"

interface BotFaceProps {
  reaction?: BotReaction
}

export const BotFace: React.FC<BotFaceProps> = ({ reaction = "idle" }) => {
  return (
    <div
      className={cn(
        "bot-face",
        reaction === "idle" && "face-idle",
        reaction === "thinking" && "face-thinking",
        reaction === "wary" && "face-wary",
        reaction === "loading" && "face-loading",
        reaction === "win" && "face-win",
        reaction === "lose" && "face-lose",
      )}
    />
  )
}
