import type React from "react"
import type { Metadata } from "next"
import { Press_Start_2P, Inter } from "next/font/google" // UPDATED: Import Inter
import "./globals.css"

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press-start-2p",
})

// UPDATED: Setup Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "PassFailBot",
  description: "Turn your notes into a quiz and bet on your score.",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      {/* UPDATED: Add Inter font variable to the body */}
      <body className={`${pressStart2P.variable} ${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}
