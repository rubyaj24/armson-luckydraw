"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { DrawStageWinner } from "@/lib/types";

const drawDays = [
  { value: "2026-10-03", label: "Day one", date: "October 3" },
  { value: "2026-10-04", label: "Day two", date: "October 4" },
] as const;

type Phase = "idle" | "spinning" | "revealed";

export function DrawStage({
  eventName,
  drawClosed,
  sampleIds,
  initialCompletedDraws,
}: {
  eventName: string;
  drawClosed: boolean;
  sampleIds: string[];
  initialCompletedDraws: DrawStageWinner[];
}) {
  const firstOpenDay = drawDays.find(
    (day) => !initialCompletedDraws.some((draw) => draw.drawDay === day.value),
  );
  const [selectedDay, setSelectedDay] = useState(firstOpenDay?.value ?? drawDays[0].value);
  const [completedDraws, setCompletedDraws] = useState(initialCompletedDraws);
  const [phase, setPhase] = useState<Phase>("idle");
  const [displayId, setDisplayId] = useState(sampleIds[0] ?? "WAITING-FOR-ENTRIES");
  const [winner, setWinner] = useState<DrawStageWinner | null>(
    initialCompletedDraws.find((draw) => draw.drawDay === selectedDay) ?? null,
  );
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = drawDays.find((day) => day.value === selectedDay)!;
  const completedForDay = useMemo(
    () => completedDraws.find((draw) => draw.drawDay === selectedDay) ?? null,
    [completedDraws, selectedDay],
  );

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function chooseDay(day: typeof drawDays[number]["value"]) {
    if (phase === "spinning") return;
    const completed = completedDraws.find((draw) => draw.drawDay === day) ?? null;
    setSelectedDay(day);
    setWinner(completed);
    setDisplayId(completed?.luckyDrawId ?? sampleIds[0] ?? "WAITING-FOR-ENTRIES");
    setPhase(completed ? "revealed" : "idle");
    setError("");
  }

  async function startDraw() {
    if (phase === "spinning" || completedForDay || !sampleIds.length) return;
    if (!window.confirm(`Run the final draw for ${selected.label}, ${selected.date}? This cannot be undone.`)) return;

    setError("");
    setWinner(null);
    setPhase("spinning");
    let cursor = Math.floor(Math.random() * sampleIds.length);
    intervalRef.current = setInterval(() => {
      cursor = (cursor + 1 + Math.floor(Math.random() * 7)) % sampleIds.length;
      setDisplayId(sampleIds[cursor]);
    }, 72);

    const minimumSpin = new Promise((resolve) => setTimeout(resolve, 7_500));
    try {
      const responsePromise = fetch("/api/admin/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drawDay: selectedDay,
          reason: `${selected.label} main-stage finale`,
        }),
      }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "The draw could not be completed.");
        return result as {
          drawId: string;
          drawDay: string;
          winner: { name: string; city: string; luckyDrawId: string };
        };
      });

      const [result] = await Promise.all([responsePromise, minimumSpin]);
      const revealed: DrawStageWinner = {
        drawId: result.drawId,
        drawDay: result.drawDay,
        ...result.winner,
      };
      setDisplayId(revealed.luckyDrawId);
      setWinner(revealed);
      setCompletedDraws((current) => [...current, revealed]);
      setPhase("revealed");
    } catch (drawError) {
      setError(drawError instanceof Error ? drawError.message : "The draw could not be completed.");
      setPhase("idle");
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  }

  return (
    <main className={`draw-stage ${phase}`}>
      <div className="stage-grid" aria-hidden="true" />
      <header className="stage-toolbar">
        <Link href="/admin">← Dashboard</Link>
        <span>{eventName}</span>
        <button onClick={toggleFullscreen}>⛶ Full screen</button>
      </header>

      <section className="stage-brand" aria-label="Armson Homes presents CETalks Spotlight 2026">
        <div className="stage-presenter">
          <Image
            className="stage-armson-logo"
            src="/assets/Armson logo.png"
            alt="Armson Homes"
            width={112}
            height={112}
            priority
          />
          <div>
            <span>Presented by</span>
            <strong>Armson Homes</strong>
            <small>Since 1998</small>
          </div>
        </div>
        <div className="stage-event-brand">
          <div>
            <span>In association with</span>
            <Image src="/assets/cetalks logo.png" alt="CETalks" width={48} height={46} />
          </div>
          <Image className="stage-spotlight-logo" src="/assets/spotlight26.png" alt="Spotlight 2026" width={510} height={208} priority />
        </div>
      </section>

      <section className="stage-content">
        <div className="stage-day-tabs" aria-label="Choose festival day">
          {drawDays.map((day) => {
            const isComplete = completedDraws.some((draw) => draw.drawDay === day.value);
            return (
              <button
                key={day.value}
                className={selectedDay === day.value ? "active" : ""}
                onClick={() => chooseDay(day.value)}
                disabled={phase === "spinning"}
              >
                <small>{day.label}</small>
                <strong>{day.date}</strong>
                <span>{isComplete ? "Winner selected ✓" : "Final draw"}</span>
              </button>
            );
          })}
        </div>

        <p className="stage-kicker">{phase === "spinning" ? "The wheel is turning" : winner ? "Tonight’s winner" : `${selected.label} lucky draw`}</p>
        <div
          className="lottery-machine"
          aria-label={displayId}
          aria-live={phase === "revealed" ? "polite" : "off"}
        >
          <span className="machine-light machine-light-left" />
          <div className="lottery-window">
            <div className="lottery-id" aria-hidden="true">
              {displayId.split("").map((character, index) => (
                <span
                  key={index}
                  style={{ "--digit-index": index } as CSSProperties}
                >
                  <b>{character}</b>
                </span>
              ))}
            </div>
          </div>
          <span className="machine-light machine-light-right" />
        </div>

        {phase === "spinning" && <p className="stage-status">Mixing all eligible entries…</p>}

        {winner && phase === "revealed" ? (
          <div className="stage-winner">
            <p>Congratulations</p>
            <h1>{winner.name}</h1>
            <span>{winner.city}</span>
          </div>
        ) : (
          <button
            className="stage-draw-button"
            onClick={startDraw}
            disabled={phase === "spinning" || Boolean(completedForDay) || drawClosed || !sampleIds.length}
          >
            {phase === "spinning" ? "Drawing…" : completedForDay ? "Draw complete" : drawClosed ? "Lucky draw closed" : !sampleIds.length ? "Waiting for entries" : `Start ${selected.label} draw`}
          </button>
        )}

        {error && <p className="stage-error" role="alert">{error}</p>}
        <p className="stage-note">One winner · Previous winners excluded · Selection cannot be rerun</p>
      </section>

      {phase === "revealed" && winner && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 42 }, (_, index) => (
            <i key={index} style={{ "--i": index } as CSSProperties} />
          ))}
        </div>
      )}
    </main>
  );
}
