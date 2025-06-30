import { cn } from "@/lib/utils"

export type EyeState = "idle" | "focused" | "win" | "lose"

type EveEyesProps = {
  state: EyeState
}

export function EveEyes({ state }: EveEyesProps) {
  return (
    <div className={cn("eye-container", state === "idle" && "animate-float")}>
      <div
        className={cn(
          "eye",
          state === "focused" && "animate-squint",
          state === "win" && "eye-win",
          state === "lose" && "eye-lose",
        )}
      />
      <div
        className={cn(
          "eye",
          state === "focused" && "animate-squint",
          state === "win" && "eye-win",
          state === "lose" && "eye-lose",
        )}
      />
    </div>
  )
}
