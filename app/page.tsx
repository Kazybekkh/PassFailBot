"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import {
  Upload,
  Coins,
  Target,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Wand2,
  BookOpen,
  CheckCircle,
  XCircle,
  Loader2,
  FlaskConical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { useTypewriter } from "@/hooks/use-typewriter"

type GameState = "config" | "loading" | "quiz" | "result" | "cheated" | "review"
type ConfigStep = "upload" | "style" | "target" | "bet" | "duration" | "confirm"
type EyeState = "idle" | "focused" | "win" | "lose"
type QuizStyle = "strict" | "similar"

type Question = {
  question: string
  options: string[]
  answer: string
}

type Quiz = {
  questions: Question[]
}

type LastBet = {
  won: boolean
  betAmount: number
  targetScore: number
  finalScore: number
  payout: number
}

const initialBotMessage = "Hello! First, upload the PDF you want to be quizzed on. Or, try the demo quiz!"

// Standalone Robot Head Component
const RobotHead = ({ state }: { state: EyeState }) => (
  <div className={cn("relative flex h-48 w-48 items-center justify-center gap-4", state === "idle" && "animate-float")}>
    <div
      className={cn(
        "h-10 w-10 rounded-sm bg-[#40bcff] border-2 border-gray-800 transition-all",
        state === "focused" && "animate-squint",
        state === "win" && "bg-[hsl(var(--pass))] border-green-700 h-8",
        state === "lose" && "bg-[hsl(var(--fail))] border-red-700 h-12 w-8",
      )}
    />
    <div
      className={cn(
        "h-10 w-10 rounded-sm bg-[#40bcff] border-2 border-gray-800 transition-all",
        state === "focused" && "animate-squint",
        state === "win" && "bg-[hsl(var(--pass))] border-green-700 h-8",
        state === "lose" && "bg-[hsl(var(--fail))] border-red-700 h-12 w-8",
      )}
    />
    <div
      className={cn(
        "absolute bottom-[28%] h-6 w-16 bg-primary opacity-0 transition-opacity",
        state === "win" && "opacity-100",
      )}
      style={{
        maskImage: "radial-gradient(circle at 50% 0, transparent 20px, black 21px)",
        WebkitMaskImage: "radial-gradient(circle at 50% 0, transparent 20px, black 21px)",
      }}
    />
  </div>
)

// Standalone Dialogue Box Component
const Dialogue = ({ text }: { text: string }) => {
  const animatedText = useTypewriter(text)
  return (
    <div className="relative mb-6 w-full">
      <div className="flex min-h-32 w-full items-center justify-center rounded-lg border-2 border-border bg-card p-4 text-center text-lg font-normal leading-relaxed text-card-foreground">
        <p className="h-full">{animatedText}</p>
      </div>
      <div
        className="absolute h-0 w-0 border-8 border-t-border border-transparent"
        style={{ bottom: "-16px", left: "50%", transform: "translateX(-50%)" }}
      />
    </div>
  )
}

// Stats Panel Component
const StatsPanel = ({ coins, lastBet }: { coins: number; lastBet: LastBet | null }) => (
  <Card>
    <CardHeader>
      <CardTitle>Your Stats</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center justify-between text-lg">
        <span className="flex items-center">
          <Coins className="mr-2 text-yellow-500" /> Current Balance:
        </span>
        <span className="font-bold">{coins}</span>
      </div>
      <hr className="border-dashed" />
      <h3 className="font-semibold text-md pt-2">Last Bet</h3>
      {lastBet ? (
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Result:</span>
            <span className={cn("font-bold", lastBet.won ? "text-green-600" : "text-destructive")}>
              {lastBet.won ? "Win" : "Loss"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Your Score / Target:</span>
            <span>
              {lastBet.finalScore}% / {lastBet.targetScore}%
            </span>
          </div>
          <div className="flex justify-between">
            <span>Bet Amount:</span>
            <span>{lastBet.betAmount} coins</span>
          </div>
          <div className="flex justify-between">
            <span>Payout:</span>
            <span className={cn("font-bold", lastBet.won ? "text-green-600" : "text-destructive")}>
              {lastBet.won ? `+${lastBet.payout}` : `-${lastBet.betAmount}`} coins
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">Play a round to see your stats.</p>
      )}
    </CardContent>
  </Card>
)

export default function PassFailBot() {
  /* ──────────────────────── state ──────────────────────── */
  const [gameState, setGameState] = useState<GameState>("config")
  const [configStep, setConfigStep] = useState<ConfigStep>("upload")
  const [eyeState, setEyeState] = useState<EyeState>("idle")
  const [botMessage, setBotMessage] = useState(initialBotMessage)
  const [isIdentifyingTopic, setIsIdentifyingTopic] = useState(false)

  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [quizStyle, setQuizStyle] = useState<QuizStyle | null>(null)
  const [targetScore, setTargetScore] = useState(50)
  const [betAmount, setBetAmount] = useState(100)
  const [duration, setDuration] = useState(15)
  const [coins, setCoins] = useState(1000)

  const [error, setError] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<string[]>([])
  const [finalScore, setFinalScore] = useState(0)
  const [payout, setPayout] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [lastBet, setLastBet] = useState<LastBet | null>(null)

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dialogueTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /* ────────────────── eye reactions helper ─────────────── */
  const triggerEyeState = useCallback((state: EyeState, durationMs = 800) => {
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
    setEyeState(state)
    if (state === "focused") {
      reactionTimeoutRef.current = setTimeout(() => setEyeState("idle"), durationMs)
    }
  }, [])

  /* ───────────── anti-cheat: tab visibility change ─────── */
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && gameState === "quiz") {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      setGameState("cheated")
    }
  }, [gameState])

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
      if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current)
    }
  }, [handleVisibilityChange])

  /* ────────────────────── quiz timer ───────────────────── */
  useEffect(() => {
    if (gameState === "quiz" && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000)
    } else if (timeLeft === 0 && gameState === "quiz") {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
      handleFinishQuiz()
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [gameState, timeLeft])

  /* ──────────────────── config helpers ─────────────────── */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || file.type !== "application/pdf") {
      setPdfFile(null)
      setError("Please upload a valid PDF file.")
      setBotMessage("Whoops, that doesn't look like a PDF. Please try again.")
      return
    }

    setPdfFile(file)
    setError(null)
    setIsIdentifyingTopic(true)
    setBotMessage("Let's see what we have here... Analyzing your document.")
    triggerEyeState("focused")

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/identify-topic", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        // 5xx from the server → treat as a soft-failure and fall back
        let msg = `Server responded with ${res.status}`
        try {
          const data = await res.json()
          if (data?.error) msg = data.error
        } catch {
          const txt = await res.text().catch(() => "")
          if (txt) msg = txt
        }

        // Show the message to the user but DON’T abort the flow
        console.error("identify-topic:", msg)
        setBotMessage(
          `Couldn't identify the topic (${msg}). No worries – I can still create a quiz from "${file.name}".`,
        )
        setIsIdentifyingTopic(false)
        setEyeState("idle")
        return
      }

      const { topic } = await res.json()
      setBotMessage(`Okay, I've analyzed your PDF on '${topic}'. The file "${file.name}" is locked and loaded.`)
    } catch (err: any) {
      const message = err?.message ?? "Unexpected error."
      setError(message)
      setBotMessage(`🚨 ${message}`)
      console.error(err)
      setBotMessage(`Got it! Your file "${file.name}" is locked and loaded.`) // Fallback message
    } finally {
      setIsIdentifyingTopic(false)
      setEyeState("idle")
    }
  }

  const handleNextStep = () => {
    triggerEyeState("focused")
    switch (configStep) {
      case "upload":
        setConfigStep("style")
        setBotMessage("Do you want questions strictly from the PDF, or new questions in a similar style?")
        break
      case "style":
        setConfigStep("target")
        setBotMessage("Okay, what's your target score? Use the slider to set a goal.")
        break
      case "target":
        setConfigStep("bet")
        break
      case "bet":
        setConfigStep("duration")
        break
      case "duration":
        setConfigStep("confirm")
        break
    }
  }

  const handlePrevStep = () => {
    triggerEyeState("focused")
    switch (configStep) {
      case "style":
        setConfigStep("upload")
        setBotMessage(initialBotMessage)
        break
      case "target":
        setConfigStep("style")
        setBotMessage("Do you want questions strictly from the PDF, or new questions in a similar style?")
        break
      case "bet":
        setConfigStep("target")
        break
      case "duration":
        setConfigStep("bet")
        break
      case "confirm":
        setConfigStep("duration")
        break
    }
  }

  const handleStyleSelect = (style: QuizStyle) => {
    setQuizStyle(style)
    if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current)
    dialogueTimeoutRef.current = setTimeout(() => {
      if (style === "strict") {
        setBotMessage("Strictly from the PDF. A true test of memory. I like it.")
      } else {
        setBotMessage("Similar style questions... you want a real challenge! Excellent.")
      }
    }, 1500)
  }

  const handleTargetChange = (v: number) => {
    setTargetScore(v)
    if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current)
    dialogueTimeoutRef.current = setTimeout(() => {
      if (v === 100) setBotMessage("100%?! A perfect score... a bold and difficult challenge.")
      else if (v >= 70) setBotMessage("Feeling confident, huh? A worthy goal.")
      else if (v >= 40) setBotMessage("A reasonable target. Let's see if you can hit it.")
      else setBotMessage("Playing it safe, I see. A wise strategy.")
    }, 1500)
  }

  const handleBetChange = (v: number) => {
    setBetAmount(v)
    if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current)
    dialogueTimeoutRef.current = setTimeout(() => {
      const ratio = v / coins
      if (ratio === 1) setBotMessage("All in! Fortune favors the bold.")
      else if (ratio > 0.75) setBotMessage("Going big! I like your style.")
      else if (ratio > 0.25) setBotMessage("A respectable bet. Good luck!")
      else setBotMessage("A cautious wager. I understand.")
    }, 1500)
  }

  const handleDurationChange = (v: number) => {
    setDuration(v)
    if (dialogueTimeoutRef.current) clearTimeout(dialogueTimeoutRef.current)
    dialogueTimeoutRef.current = setTimeout(() => {
      if (v >= 60) setBotMessage("An hour should be plenty of time. No pressure!")
      else if (v >= 30) setBotMessage(`${v} minutes. A good amount of time to focus.`)
      else setBotMessage(`${v} minutes. Quick and decisive!`)
    }, 1500)
  }

  /* ────────────────── API / quiz start ─────────────────── */
  const handleStartQuiz = async () => {
    if (!pdfFile || !quizStyle) {
      setError("Please complete all configuration steps.")
      return
    }
    if (coins < betAmount) {
      setError("You don't have enough coins for this bet.")
      return
    }

    setGameState("loading")
    setEyeState("focused")
    setError(null)
    setCoins((prev) => prev - betAmount)

    const formData = new FormData()
    formData.append("file", pdfFile)
    formData.append("style", quizStyle)

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        let msg = `Server responded with ${res.status}`
        const responseText = await res.text()
        console.error("Raw error response from server:", responseText)
        try {
          const data = JSON.parse(responseText)
          if (data?.error) msg = data.error
        } catch {
          if (responseText) msg = responseText
        }
        throw new Error(msg)
      }

      const generatedQuiz: Quiz = await res.json()

      setQuiz(generatedQuiz)
      setUserAnswers(new Array(generatedQuiz.questions.length).fill(null))
      setTimeLeft(duration * 60)
      setGameState("quiz")
    } catch (err: any) {
      const message = err?.message ?? "Unexpected error."
      setError(message)
      setBotMessage(`🚨 ${message}`)
      setCoins((prev) => prev + betAmount) // refund the bet
      setGameState("config")
      setEyeState("idle")
    }
  }

  const handleLoadDemoQuiz = async () => {
    try {
      setGameState("loading")
      setEyeState("focused")
      const res = await fetch("/demo-quiz.json")
      if (!res.ok) {
        throw new Error("Failed to load demo file.")
      }
      const demoQuiz: Quiz = await res.json()

      // Set default parameters for the demo quiz
      setTargetScore(50)
      setBetAmount(100)
      setDuration(10)
      setCoins((prev) => prev - 100)

      setQuiz(demoQuiz)
      setUserAnswers(new Array(demoQuiz.questions.length).fill(null))
      setTimeLeft(10 * 60) // 10 minutes for demo
      setGameState("quiz")
    } catch (err: any) {
      setError(err.message ?? "Could not load demo quiz.")
      setBotMessage("Oh no, something went wrong with the demo.")
      setGameState("config")
      setEyeState("lose")
    }
  }

  /* ─────────────────── in-quiz helpers ─────────────────── */
  const handleAnswerSelect = (option: string) => {
    const next = [...userAnswers]
    next[currentQuestionIndex] = option
    setUserAnswers(next)
  }

  const handleNextQuestion = () => {
    if (currentQuestionIndex < (quiz?.questions.length ?? 0) - 1) setCurrentQuestionIndex((i) => i + 1)
    else handleFinishQuiz()
  }

  const handleFinishQuiz = () => {
    if (!quiz) return
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

    const correct = quiz.questions.reduce((acc, q, i) => acc + (q.answer === userAnswers[i] ? 1 : 0), 0)
    const score = Math.round((correct / quiz.questions.length) * 100)
    setFinalScore(score)

    const won = score >= targetScore
    let payoutAmount = 0

    if (won) {
      payoutAmount = Math.floor(betAmount * (1 + targetScore / 100))
      setPayout(payoutAmount)
      setCoins((prev) => prev + payoutAmount)
      setEyeState("win")
    } else {
      setPayout(0)
      setEyeState("lose")
    }

    setLastBet({
      won,
      betAmount,
      targetScore,
      finalScore: score,
      payout: payoutAmount,
    })

    setGameState("result")
  }

  const handlePlayAgain = () => {
    setGameState("config")
    setConfigStep("upload")
    setPdfFile(null)
    setQuizStyle(null)
    setQuiz(null)
    setUserAnswers([])
    setCurrentQuestionIndex(0)
    setError(null)
    setEyeState("idle")
    setBotMessage(initialBotMessage)
  }

  /* ───────────────────── config UI ─────────────────────── */
  const renderConfigStep = () => (
    <div className="flex flex-col items-center gap-4">
      <RobotHead state={eyeState} />
      <Dialogue text={botMessage} />

      <Card className="w-full max-w-md">
        <CardContent className="space-y-6 pt-6">
          {configStep === "upload" && (
            <div className="space-y-4">
              <label
                htmlFor="file-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary",
                  isIdentifyingTopic && "cursor-not-allowed opacity-50",
                )}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {isIdentifyingTopic ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                  <p className="mt-2 text-sm">
                    {isIdentifyingTopic ? "Analyzing..." : pdfFile ? pdfFile.name : "Upload Lecture PDF"}
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={isIdentifyingTopic}
                />
              </label>
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>
              <Button variant="outline" className="w-full bg-transparent" onClick={handleLoadDemoQuiz}>
                <FlaskConical className="mr-2 h-4 w-4" />
                Load Demo Quiz
              </Button>
            </div>
          )}

          {configStep === "style" && (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant={quizStyle === "strict" ? "default" : "outline"}
                onClick={() => handleStyleSelect("strict")}
                className="h-auto flex-col py-4"
              >
                <BookOpen className="mb-2" />
                Strictly from PDF
              </Button>
              <Button
                variant={quizStyle === "similar" ? "default" : "outline"}
                onClick={() => handleStyleSelect("similar")}
                className="h-auto flex-col py-4"
              >
                <Wand2 className="mb-2" />
                Similar Style
              </Button>
            </div>
          )}

          {configStep === "target" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label>
                  <Target className="inline mr-2 text-destructive" size={16} />
                  Target Score
                </label>
                <span>{targetScore}%</span>
              </div>
              <Slider value={[targetScore]} onValueChange={([v]) => handleTargetChange(v)} step={10} />
            </div>
          )}

          {configStep === "bet" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label>
                  <Coins className="inline mr-2 text-yellow-500" size={16} />
                  Bet Amount
                </label>
                <span>
                  {betAmount} (Balance: {coins})
                </span>
              </div>
              <Slider value={[betAmount]} onValueChange={([v]) => handleBetChange(v)} min={10} max={coins} step={10} />
            </div>
          )}

          {configStep === "duration" && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <label>
                  <Clock className="inline mr-2 text-green-600" size={16} />
                  Duration
                </label>
                <span>{duration} min</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((d) => (
                  <Button
                    key={d}
                    variant={duration === d ? "default" : "outline"}
                    onClick={() => handleDurationChange(d)}
                  >
                    {d}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {configStep === "confirm" && (
            <div className="space-y-2 text-sm p-2">
              <div className="flex justify-between">
                <span>PDF:</span> <span>{pdfFile?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Style:</span> <span className="capitalize">{quizStyle}</span>
              </div>
              <div className="flex justify-between">
                <span>Target:</span> <span>{targetScore}%</span>
              </div>
              <div className="flex justify-between">
                <span>Bet:</span> <span>{betAmount} coins</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span> <span>{duration} min</span>
              </div>
            </div>
          )}

          {error && <p className="text-destructive text-sm text-center">{error}</p>}

          <div className="flex justify-between w-full pt-4">
            {configStep !== "upload" ? (
              <Button variant="outline" onClick={handlePrevStep}>
                <ArrowLeft className="mr-2" size={16} /> Back
              </Button>
            ) : (
              <span />
            )}

            {configStep !== "confirm" ? (
              <Button
                onClick={handleNextStep}
                disabled={
                  (configStep === "upload" && (!pdfFile || isIdentifyingTopic)) ||
                  (configStep === "style" && !quizStyle)
                }
              >
                Next <ArrowRight className="ml-2" size={16} />
              </Button>
            ) : (
              <Button className="w-full" onClick={handleStartQuiz}>
                Start Quiz!
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  /* ────────────────────── main render ──────────────────── */
  const renderContent = () => {
    switch (gameState) {
      case "loading":
        return (
          <Card className="w-full max-w-md text-center p-8">
            <div className="flex flex-col items-center">
              <RobotHead state="focused" />
              <p className="text-2xl animate-pulse mt-4">Generating your quiz...</p>
              <p className="mt-4 text-sm text-muted-foreground">
                The AI is reading your PDF. This might take a moment.
              </p>
            </div>
          </Card>
        )

      case "quiz":
        if (!quiz) return null
        const q = quiz.questions[currentQuestionIndex]
        return (
          <Card className="w-full max-w-4xl">
            <CardContent className="p-6">
              <div className="border-b-2 pb-4 mb-4 text-sm flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Coins size={24} className="text-yellow-500" />
                  <span>{coins}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={24} className="text-green-600" />
                  <span>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target size={24} className="text-destructive" />
                  <span>Target: {targetScore}%</span>
                </div>
              </div>

              <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} className="mb-6" />

              <p className="text-lg mb-6 leading-relaxed font-body">{`Q${currentQuestionIndex + 1}: ${q.question}`}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {q.options.map((opt) => (
                  <Button
                    key={opt}
                    variant="outline"
                    className={cn(
                      "p-4 h-auto justify-start whitespace-normal font-body",
                      userAnswers[currentQuestionIndex] === opt && "bg-primary text-primary-foreground",
                    )}
                    onClick={() => handleAnswerSelect(opt)}
                  >
                    {opt}
                  </Button>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
                <Button onClick={handleNextQuestion} disabled={!userAnswers[currentQuestionIndex]}>
                  {currentQuestionIndex === quiz.questions.length - 1 ? "Finish" : "Next"}{" "}
                  <ArrowRight className="ml-2" size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      case "result":
        const won = finalScore >= targetScore
        return (
          <div className="flex flex-col items-center gap-4">
            <RobotHead state={won ? "win" : "lose"} />
            <Card className="w-full max-w-md text-center">
              <CardContent className="space-y-4 py-8">
                <h2 className={cn("text-4xl font-bold", won ? "text-green-600" : "text-destructive")}>
                  {won ? "YOU PASSED!" : "YOU FAILED!"}
                </h2>
                <p className="text-xl">Your Score: {finalScore}%</p>
                <p className="text-lg text-muted-foreground">Target Score: {targetScore}%</p>
                <hr className="border-dashed" />
                <p className="text-xl">Bet: {betAmount} coins</p>
                <p className={cn("text-xl", won ? "text-green-600" : "text-destructive")}>
                  {won ? `Payout: +${payout} coins` : `Lost: -${betAmount} coins`}
                </p>
                <p className="text-lg">New Balance: {coins} coins</p>
                <div className="flex gap-4 justify-center pt-4">
                  <Button onClick={handlePlayAgain}>Play Again</Button>
                  <Button variant="outline" onClick={() => setGameState("review")}>
                    Review Answers
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "review":
        if (!quiz) return null
        return (
          <Card className="w-full max-w-4xl">
            <CardHeader>
              <CardTitle>Quiz Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {quiz.questions.map((q, i) => {
                const userAnswer = userAnswers[i]
                const isCorrect = userAnswer === q.answer
                return (
                  <div key={i} className="border-b pb-4">
                    <p className="font-body text-lg mb-4">{`Q${i + 1}: ${q.question}`}</p>
                    <div className="space-y-2">
                      {q.options.map((opt) => {
                        const isUserAnswer = userAnswer === opt
                        const isCorrectAnswer = q.answer === opt
                        return (
                          <div
                            key={opt}
                            className={cn(
                              "flex items-center gap-3 rounded-md border p-3 text-sm font-body",
                              isCorrectAnswer && "border-green-500 bg-green-50 text-green-900",
                              isUserAnswer && !isCorrectAnswer && "border-red-500 bg-red-50 text-red-900",
                            )}
                          >
                            {isCorrectAnswer ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : isUserAnswer ? (
                              <XCircle className="h-5 w-5 text-red-600" />
                            ) : (
                              <div className="h-5 w-5" /> // Placeholder for alignment
                            )}
                            <span>{opt}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              <div className="flex justify-center pt-4">
                <Button onClick={handlePlayAgain}>Play Again</Button>
              </div>
            </CardContent>
          </Card>
        )

      case "cheated":
        return (
          <Card className="w-full max-w-md text-center bg-destructive text-destructive-foreground">
            <CardContent className="space-y-4 py-8">
              <h2 className="text-4xl font-bold">QUIZ FORFEITED</h2>
              <AlertTriangle size={48} className="mx-auto" />
              <p className="text-xl">You switched tabs during the quiz.</p>
              <p className="text-lg">Your bet of {betAmount} coins is lost.</p>
              <p className="text-lg">New Balance: {coins} coins</p>
              <Button onClick={handlePlayAgain} variant="secondary">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )

      case "config":
      default:
        return renderConfigStep()
    }
  }

  return (
    <main className="flex flex-col lg:flex-row gap-8 min-h-screen items-center p-4 sm:p-8 bg-gray-50">
      <div className="w-full lg:flex-1 flex items-center justify-center">{renderContent()}</div>
      <div className="hidden lg:flex w-full lg:max-w-sm justify-center">
        <div className="w-full">
          <StatsPanel coins={coins} lastBet={lastBet} />
        </div>
      </div>
    </main>
  )
}
