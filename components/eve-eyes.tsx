import { cn } from "@/lib/utils"
import type { EyeState } from "@/types" // Assuming EyeState is declared in a separate file

type EveEyesProps = {
  state: EyeState
}

export function EveEyes({ state }: EveEyesProps) {
  return (
    // This container gets the floating animation
    <div className={cn("eye-container", state === "idle" && "animate-float")}>
      {/* These are the two divs for the eyes. */}
      {/* They get classes based on the current state. */}
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
      <div className={cn("mouth", state === "win" && "mouth-win")} />
    </div>
  )
}
