"use client"

import { useTypewriter } from "@/hooks/use-typewriter"

export function DialogueBox({ text }: { text: string }) {
  const animatedText = useTypewriter(text)

  return (
    <div className="dialogue-box">
      <p className="h-full">{animatedText}</p>
      <div className="dialogue-caret" />
    </div>
  )
}
