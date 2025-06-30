"use client"

import { useState, useEffect } from "react"

export const useTypewriter = (text: string, speed = 30) => {
  const [displayedText, setDisplayedText] = useState("")

  useEffect(() => {
    if (!text) {
      setDisplayedText("")
      return
    }

    let i = 0
    // Set an interval to update the displayed text
    const intervalId = setInterval(() => {
      // Slice the text from the beginning to the current index
      setDisplayedText(text.slice(0, i + 1))
      i++

      // If we've displayed the whole string, clear the interval
      if (i > text.length) {
        clearInterval(intervalId)
      }
    }, speed)

    // Cleanup function to clear the interval when the component unmounts
    // or when the `text` prop changes. This prevents memory leaks.
    return () => clearInterval(intervalId)
  }, [text, speed])

  return displayedText
}
