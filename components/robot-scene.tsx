"use client"

import { EveEyes, type EyeState } from "@/components/eve-eyes"

export type { EyeState }

type RobotSceneProps = {
  eyeState: EyeState
}

export function RobotScene({ eyeState }: RobotSceneProps) {
  // The wrapper div was removed to simplify the component.
  // The floating animation is now handled directly in EveEyes.
  return <EveEyes state={eyeState} />
}
