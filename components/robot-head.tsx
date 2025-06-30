import { EveEyes, type EyeState } from "@/components/eve-eyes"
import { cn } from "@/lib/utils"

type RobotHeadProps = {
  state: EyeState
}

export function RobotHead({ state }: RobotHeadProps) {
  return (
    <div className={cn("robot-head-container", state === "idle" && "animate-float")}>
      <EveEyes state={state} />
    </div>
  )
}
