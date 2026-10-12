"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createRoom, onlineAvailable } from "@/lib/game/online";
import { cn } from "@/lib/utils";

const pill = "inline-flex min-h-12 items-center gap-2 rounded-full border border-[rgba(17,35,43,.16)] bg-white/80 px-5 text-[14.5px] font-bold text-ink transition hover:bg-white active:scale-[.97] disabled:opacity-60";

/** "Create room" and "Join with code" on the Play page (docs4.0/MULTIPLAYER.md §3). */
export function RoomButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const valid = /^[A-Z2-9]{5}$/.test(code);

  const create = async () => {
    if (!onlineAvailable()) return setErr("Multiplayer is not set up on this site yet.");
    setBusy(true);
    setErr(null);
    try {
      router.push(`/play/room/${await createRoom()}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={pill} disabled={busy} onClick={create}>
        {busy && <Loader2 className="size-4 animate-spin" />} Create room
      </button>
      {joining ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) router.push(`/play/room/${code}`);
          }}
        >
          <input
            autoFocus
            aria-label="Room code"
            placeholder="CODE"
            maxLength={5}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            className="h-12 w-[118px] rounded-full border border-[rgba(17,35,43,.16)] bg-white px-4 text-center font-mono text-[16px] font-bold tracking-[.25em]"
          />
          <button type="submit" disabled={!valid} className={cn(pill, "px-4")}>
            Join
          </button>
        </form>
      ) : (
        <button type="button" className={pill} onClick={() => setJoining(true)}>
          Join with code
        </button>
      )}
      {err && (
        <p role="alert" className="w-full text-[13px] font-semibold text-[var(--down)]">
          {err}
        </p>
      )}
    </>
  );
}
