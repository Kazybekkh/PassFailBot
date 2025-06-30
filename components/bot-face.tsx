import { cn } from "@/lib/utils"

export type BotReaction = "idle" | "thinking" | "wary" | "loading" | "win" | "lose"

type BotFaceProps = {
  reaction: BotReaction
}

export function BotFace({ reaction }: BotFaceProps) {
  const reactionClass = {
    idle: "face-idle",
    thinking: "face-thinking",
    wary: "face-wary",
    loading: "face-loading",
    win: "face-win",
    lose: "face-lose",
  }

  return <div className={cn("bot-face", reactionClass[reaction])} />
}
