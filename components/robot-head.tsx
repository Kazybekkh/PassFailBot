import { EveEyes, type EyeState } from "@/components/eve-eyes"
import { cn } from "@/lib/utils"

type RobotHeadProps = {
  state: EyeState
}

export function RobotHead({ state }: RobotHeadProps) {
  return (
    <div
      className={cn(
        "robot-head-container",
        "[filter:drop-shadow(0_0_8px_rgba(79,172,254,0.6))]",
        state === "idle" && "animate-float",
      )}
    >
      <EveEyes state={state} />
    </div>
  )
}
