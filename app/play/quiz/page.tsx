import type { Metadata } from "next";
import { QuizGame } from "@/components/quiz/QuizGame";

export const metadata: Metadata = {
  title: "Then · Now · Next · GeoPolitics",
  description: "A daily world quiz: ten questions about what happened, what is in the news and what comes next, on a live 3D globe.",
};

// Game 3: a daily quiz. Statecraft stays at /play/match and the Crisis Table at /play/crisis.
export default function QuizPage() {
  return <QuizGame />;
}
