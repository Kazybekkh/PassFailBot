# PassFailBot 🤖

Welcome to PassFailBot – an AI-powered study companion that gamifies your learning! This app converts any uploaded PDF into a timed multiple-choice quiz, lets you wager virtual coins on your target score, and pays out (or wipes out) your stake based on a single pass/fail result.

![PassFailBot Screenshot](/screenshot.png)

## ✨ Features

-   **PDF to Quiz:** Upload any PDF lecture or document and get an instant quiz.
-   **Gamified Learning:** Bet virtual coins on your ability to pass a certain score.
-   **Customizable Quizzes:** Choose between questions strictly from the PDF or similarly-styled questions for a real challenge.
-   **Timed Challenges:** Test your knowledge under pressure with a configurable timer.
-   **Stats Tracking:** Keep track of your coin balance and review your past performance.
-   **Interactive AI Companion:** A friendly (and sometimes cheeky) robot guide with fun animations.
-   **Anti-Cheat:** Tab-switching detection to ensure a fair challenge.

## 🛠️ Tech Stack

### Core
-   **Next.js 14:** React framework with App Router.
-   **React 18:** Front-end library for building user interfaces.
-   **TypeScript:** For type-safe JavaScript.
-   **Node.js:** JavaScript runtime environment.
-   **OpenAI API:** For dynamic quiz generation and topic identification.

### Styling & UI
-   **Tailwind CSS:** A utility-first CSS framework.
-   **shadcn/ui:** A component library built on Radix UI and Tailwind CSS.
-   **Radix UI:** For headless, accessible UI components.
-   **Lucide React:** For beautiful and consistent icons.
-   **Custom CSS:** For the retro, 8-bit animations and effects.

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   pnpm (or npm/yarn)
-   An OpenAI API Key

### Installation

1.  **Clone the repository:**
    \`\`\`bash
    git clone https://github.com/Kazybekkh/PassFailBot.git
    cd PassFailBot
    \`\`\`

2.  **Install dependencies:**
    \`\`\`bash
    pnpm install
    \`\`\`

3.  **Set up environment variables:**
    Create a `.env.local` file in the root of your project and add your OpenAI API key:
    \`\`\`
    OPENAI_API_KEY=your_openai_api_key_here
    \`\`\`

4.  **Run the development server:**
    \`\`\`bash
    pnpm run dev
    \`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
