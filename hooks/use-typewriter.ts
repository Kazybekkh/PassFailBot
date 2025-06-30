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
    const intervalId = setInterval(() => {
      // Set the state to a slice of the full string.
      // This is more robust than appending characters to a previous state.
      setDisplayedText(text.slice(0, i + 1))
      i++

      if (i > text.length) {
        clearInterval(intervalId)
      }
    }, speed)

    // Cleanup function to clear the interval when the component unmounts
    // or when the `text` prop changes, preventing memory leaks and bugs.
    return () => clearInterval(intervalId)
  }, [text, speed])

  return displayedText
}
