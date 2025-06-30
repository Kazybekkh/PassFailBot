"use client"

import { useState, useEffect } from "react"

export const useTypewriter = (text: string, speed = 30) => {
  const [displayedText, setDisplayedText] = useState("")

  useEffect(() => {
    setDisplayedText("") // Start with a clean slate when text prop changes
    if (text) {
      let i = 0
      const intervalId = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i)) // This is the problem!
          i++
        } else {
          clearInterval(intervalId)
        }
      }, speed)

      return () => clearInterval(intervalId)
    }
  }, [text, speed])

  return displayedText
}
