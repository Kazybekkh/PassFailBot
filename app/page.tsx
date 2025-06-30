"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Upload, Coins, Target, Clock, AlertTriangle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { RobotScene, type EyeState } from "@/components/robot-scene"

type GameState = "config" | "loading" | "quiz" | "result" | "cheated"

type Question =
\
{
  question: string
  options: string[]
  answer: string
  \
}

type Quiz =
\
{
  \
  questions: Question[]\
\
}

export default function PassFailBot()
\
{
  const [gameState, setGameState] = useState<GameState>("config")
  const [eyeState, setEyeState] = useState<EyeState>("idle")
  const [pdfFile, setPdfFile] = useState<File | null>(null)
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

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  \
  const triggerEyeState = useCallback((state: EyeState, duration = 1000) => \{\
    if (reactionTimeoutRef.current) \{\
      clearTimeout(reactionTimeoutRef.current)\
    \}\
    setEyeState(state)\
  if (state === "focused")
  \
  \
      reactionTimeoutRef.current = setTimeout(() => \
  setEyeState("idle")
  \
      \
  , duration)
    \
  \
  \
}
, [])
\
const handleVisibilityChange = useCallback(() => \{\
    if (document.hidden && gameState === "quiz") \{\
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)\
      setGameState("cheated")\
    \}\
  \}, [gameState])
\
  useEffect(() => \
{
  document.addEventListener("visibilitychange", handleVisibilityChange)
  \
  return () => \
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
  \
  \
  \
}
, [handleVisibilityChange])

  useEffect(() => \
{
  if (gameState === "quiz" && timeLeft > 0)
  \
  \
      timerIntervalRef.current = setInterval(() => \
  setTimeLeft((prev) => prev - 1)
  \
      \
  , 1000)\
    \
  else
  if (timeLeft === 0 && gameState === "quiz")
  \
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
  handleFinishQuiz()
  \
  \
  return () => \
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
  \
  \
  \
}
, [gameState, timeLeft])
\
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => \
{
  const file = e.target.files?.[0]
  if (file && file.type === "application/pdf")
  \
  setPdfFile(file)
  setError(null)
  \
    \
  else \
  setPdfFile(null)
  setError("Please upload a valid PDF file.")
  \
  \
}
\
const handleStartQuiz = async () => \
{
  if (!pdfFile)
  \
  setError("Please select a PDF file first.")
  return
  \
  if (coins < betAmount)
  \
  setError("You don't have enough coins to make this bet.")
  return
  \

  setGameState("loading")
  setEyeState("focused")
  setError(null)
  setCoins((prev) => prev - betAmount)

  const formData = new FormData()
  formData.append("file", pdfFile)

  try
  \
  {
    \
    const response = await fetch("/api/generate-quiz\", \{
        method: "POST",
        body: formData,
      \})

    if (!response.ok)
    \
    throw new Error("Failed to generate quiz. Please try again.")
    \

    const generatedQuiz: Quiz = await response.json()
    setQuiz(generatedQuiz)
    setUserAnswers(new Array(generatedQuiz.questions.length).fill(null))
    setTimeLeft(duration * 60)
    setGameState("quiz")
    setEyeState("focused")
    \
  }
  catch (err) \
  setError((err as Error).message)
  setCoins((prev) => prev + betAmount) // Refund bet
  setGameState("config")
  setEyeState("idle")
  \
  \
}

const handleAnswerSelect = (option: string) => \
{
  const newAnswers = [...userAnswers]
  newAnswers[currentQuestionIndex] = option
  setUserAnswers(newAnswers)
  \
}

const handleNextQuestion = () => \
{
  if (currentQuestionIndex < (quiz?.questions.length ?? 0) - 1)
  \
  setCurrentQuestionIndex((prev) => prev + 1)
  \
  else \
  handleFinishQuiz()
  \
  \
}

const handleFinishQuiz = () => \
{
  if (!quiz) return
  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)

  const correctAnswers = 0
  quiz.questions.forEach((q, i) => \{
      if (q.answer === userAnswers[i]) \{
        correctAnswers++
      \}
    \})

  const score = Math.round((correctAnswers / quiz.questions.length) * 100)
  setFinalScore(score)

  if (score >= targetScore)
  \
  {
    const calculatedPayout = Math.floor(betAmount * (1 + targetScore / 100))
    setPayout(calculatedPayout)
    setCoins((prev) => prev + calculatedPayout)
    setEyeState("win")
    \
  }
  else \
  setPayout(0)
  setEyeState("lose")
  \
  setGameState("result")
  \
}

const handlePlayAgain = () => \
{
  setGameState("config")
  setPdfFile(null)
  setQuiz(null)
  setCurrentQuestionIndex(0)
  setUserAnswers([])
  setError(null)
  setEyeState("idle")
  \
}

const renderContent = () => \
{
    switch (gameState) \{
      case "loading":
        return (
          <Card className="w-full max-w-md pixel-border bg-card/90 backdrop-blur-sm text-center p-8">
            <div className="flex flex-col items-center">
              <RobotScene eyeState="focused" />
              <p className="text-2xl animate-pulse mt-4">Generating your quiz...</p>
              <p className="mt-4 text-sm text-muted-foreground">
                The AI is reading your PDF. This might take a moment.
              </p>
            </div>
          </Card>
        )
      case "quiz":
        if (!quiz) return null
        const question = quiz.questions[currentQuestionIndex]
        return (
          <Card className="w-full max-w-4xl pixel-border bg-card/90 backdrop-blur-sm">
            <CardHeader className="border-b-4 border-double">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <Coins size=\{16\} />
                  <span>\{coins\}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size=\{16\} />
                  <span>
                    \{Math.floor(timeLeft / 60)\}:\{(timeLeft % 60).toString().padStart(2, "0")\}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Target size=\{16\} />
                  <span>Target: \{targetScore\}%</span>
                </div>
              </div>
              <Progress value=\{((currentQuestionIndex + 1) / quiz.questions.length) * 100\} className="mt-4" />
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-lg mb-6 leading-relaxed">\{`Q$\{currentQuestionIndex + 1\}: $\{question.question\}`\}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                \{question.options.map((option, i) => (
                  <Button
                    key=\{i\}
                    variant="outline"
                    className=\{cn(
                      "p-4 h-auto justify-start text-left whitespace-normal",
                      userAnswers[currentQuestionIndex] === option && "bg-primary text-primary-foreground",
                    )\}
                    onClick=\{() => handleAnswerSelect(option)\}
                  >
                    \{option\}
                  </Button>
                ))\}
              </div>
              <div className="mt-8 flex justify-end">
                <Button onClick=\{handleNextQuestion\} disabled=\{!userAnswers[currentQuestionIndex]\}>
                  \{currentQuestionIndex === quiz.questions.length - 1 ? "Finish" : "Next"\}\{" "\}
                  <ArrowRight className="ml-2" size=\{16\} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      case "result":
        const won = finalScore >= targetScore
        return (
          <div className="flex flex-col items-center gap-4">
            <RobotScene eyeState=\{won ? "win" : "lose"\} />
            <Card className="w-full max-w-md pixel-border text-center bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className=\{cn("text-4xl", won ? "text-pass" : "text-fail")\}>
                  \{won ? "YOU PASSED!" : "YOU FAILED!"\}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xl">Your Score: \{finalScore\}%</p>
                <p className="text-lg text-muted-foreground">Target Score: \{targetScore\}%</p>
                <hr className="border-dashed" />
                <p className="text-xl">Bet: \{betAmount\} coins</p>
                <p className=\{cn("text-xl", won ? "text-pass" : "text-fail")\}>
                  \{won ? `Payout: +$\{payout\} coins` : `Lost: -$\{betAmount\} coins`\}
                </p>
                <p className="text-lg">New Balance: \{coins\} coins</p>
                <Button onClick=\{handlePlayAgain\} className="mt-4">
                  Play Again
                </Button>
              </CardContent>
            </Card>
          </div>
        )
      case "cheated":
        return (
          <Card className="w-full max-w-md pixel-border text-center bg-destructive/90 backdrop-blur-sm text-destructive-foreground">
            <CardHeader>
              <CardTitle className="text-4xl">QUIZ FORFEITED</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertTriangle size=\{48\} className="mx-auto" />
              <p className="text-xl">You switched tabs during the quiz.</p>
              <p className="text-lg">Your bet of \{betAmount\} coins has been lost.</p>
              <p className="text-lg">New Balance: \{coins\} coins</p>
              <Button onClick=\{handlePlayAgain\} variant="secondary" className="mt-4">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )
      case "config":
      default:
        return (
          <div className="flex flex-col items-center gap-4">
            <RobotScene eyeState=\{eyeState\} />
            <Card className="w-full max-w-md pixel-border bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-center text-3xl">PassFailBot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-secondary"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload size=\{32\} />
                      <p className="mt-2 text-sm">\{pdfFile ? pdfFile.name : "Upload Lecture PDF"\}</p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="application/pdf"
                      onChange=\{handleFileChange\}
                    />
                  </label>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label>
                      <Target className="inline mr-2 text-fail" size=\{16\} />
                      Target Score
                    </label>
                    <span>\{targetScore\}%</span>
                  </div>
                  <Slider
                    value=\{[targetScore]\}
                    onValueChange=\{([v]) => \{
                      triggerEyeState("focused")
                      setTargetScore(v)
                    \}\}
                    step=\{10\}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label>
                      <Coins className="inline mr-2 text-coin" size=\{16\} />
                      Bet Amount
                    </label>
                    <span>
                      \{betAmount\} (Balance: \{coins\})
                    </span>
                  </div>
                  <Slider
                    value=\{[betAmount]\}
                    onValueChange=\{([v]) => \{
                      triggerEyeState("focused")
                      setBetAmount(v)
                    \}\}
                    min=\{10\}
                    max=\{coins\}
                    step=\{10\}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label>
                      <Clock className="inline mr-2 text-pass" size=\{16\} />
                      Duration
                    </label>
                    <span>\{duration\} min</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    \{[15, 30, 45, 60].map((d) => (
                      <Button
                        key=\{d\}
                        variant=\{duration === d ? "default" : "outline"\}
                        onClick=\{() => \{
                          triggerEyeState("focused")
                          setDuration(d)
                        \}\}
                      >
                        \{d\}
                      </Button>
                    ))\}
                  </div>
                </div>

                \{error && <p className="text-fail text-sm text-center">\{error\}</p>\}

                <Button className="w-full" onClick=\{handleStartQuiz\} disabled=\{!pdfFile\}>
                  Start Quiz
                </Button>
              </CardContent>
            </Card>
          </div>
        )
    \}
  \}

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">\{renderContent()\}</main>
  )
\}
