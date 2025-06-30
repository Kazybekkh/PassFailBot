import { EveEyes, type EyeState } from "@/components/eve-eyes"
import { cn } from "@/lib/utils"
import { RobotHeadSVG } from "./robot-head-svg"

type RobotHeadProps = {
  state: EyeState
}

export function RobotHead({ state }: RobotHeadProps) {
  return (
    <div className={cn("relative w-48 h-48", state === "idle" && "animate-float")}>
      <div className="absolute inset-0">
        <RobotHeadSVG />
      </div>
      <EveEyes state={state} />
    </div>
  )
}
