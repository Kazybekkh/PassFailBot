"use client"

import { EveEyes, type EyeState } from "@/components/eve-eyes"

export type { EyeState }

type RobotSceneProps = {
  eyeState: EyeState
}

export function RobotScene({ eyeState }: RobotSceneProps) {
  return (
    <div className="robot-head-container">
      <EveEyes state={eyeState} />
    </div>
  )
}
