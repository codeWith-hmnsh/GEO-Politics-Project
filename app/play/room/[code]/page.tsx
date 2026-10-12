import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { RoomScreen } from "@/components/game/Online";

type Props = { params: Promise<{ code: string }> };

export const metadata: Metadata = {
  title: "Statecraft room · GeoPolitics",
  description: "Join a private Statecraft room: lead a country for twelve years with friends.",
};

// Private multiplayer room: lobby, then the shared match (docs4.0 BUILD-PLAN S5).
export default function RoomPage({ params }: Props) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-paper" />}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: Props) {
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z2-9]{5}$/.test(code)) notFound();
  return <RoomScreen code={code} />;
}
