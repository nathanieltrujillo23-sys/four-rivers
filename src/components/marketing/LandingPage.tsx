import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext";
import { RIVERS, THEME } from "../../theme/theme";
import { INTRODUCTION } from "../../content/lessons";
import {
  QUIZ_PASS_THRESHOLD,
  QUIZ_QUESTION_COUNT,
} from "../../content/quizzes";
import { EXAM_PASS_THRESHOLD, EXAM_QUESTION_COUNT } from "../../content/exam";
import { CHALLENGE_LENGTH_DAYS } from "../../state/challenge";
import {
  EDEN_RIVER_REFS,
  PRINCIPLE_SCRIPTURE,
  VERSE,
} from "../../content/scripture";
import { ScriptureQuote } from "../ui/Scripture";
import { Button } from "../ui/Button";
import { Card, CardBody } from "../ui/Card";
import { Testimony } from "./Testimony";
import { Contact } from "./Contact";
import { HeroRivers } from "./HeroRivers";
import { GuidedTour, type TourStep } from "./GuidedTour";

const TOUR_STEPS: TourStep[] = [
  {
    target: "intro",
    title: "Start with the Introduction",
    text: `Before the rivers, ${INTRODUCTION.lessons.length} short modules show what stewardship means in Scripture and cover budgeting, compounding, and debt. No tracker, just a foundation.`,
  },
  {
    target: "rivers",
    title: "Then the four rivers",
    text: "Income, saving, investing, and giving, in that order. Each river is about 15 minutes of scripture-backed teaching plus one simple tracker to practice it.",
  },
  {
    target: "modules",
    title: "Modules and quizzes",
    text: `Mark each module complete as you read it, then take the river's ${QUIZ_QUESTION_COUNT}-question quiz. Score ${QUIZ_PASS_THRESHOLD} to unlock the next river, and retake it as often as you like.`,
  },
  {
    target: "exam",
    title: "The final exam",
    text: `After River 4, ${EXAM_QUESTION_COUNT} practical questions, one per page. Score ${EXAM_PASS_THRESHOLD} to pass, with unlimited retakes.`,
  },
  {
    target: "certificate",
    title: "Your certificate",
    text: "Pass the exam and a printable certificate unlocks, with a QR code anyone can scan to verify it.",
  },
  {
    target: "challenge",
    title: "The 30-Day Challenge",
    text: `Want a pace to follow? This optional plan spreads every module, entry, and quiz across ${CHALLENGE_LENGTH_DAYS - 1} days, with the exam on day ${CHALLENGE_LENGTH_DAYS}, and tracks your streak.`,
  },
  {
    target: "begin",
    title: "Ready when you are",
    text: "That's the whole course, and it's free. Create an account and begin with the Introduction whenever you like.",
  },
];

export function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [touring, setTouring] = useState(false);
  // Stays lit after a finished tour, nudging toward the button until it's used.
  const [beginGlow, setBeginGlow] = useState(false);

  return (
    <div className="flex flex-col gap-14 py-4">
      <section className="text-center">
        <p className="mb-3 font-[family-name:var(--font-ui)] text-xs uppercase tracking-[0.2em] text-clay">
          Genesis 2:10–14
        </p>
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          One source. Four streams.
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-[family-name:var(--font-ui)] text-lg text-ink-soft">
          A short, sequential course in four biblical principles of stewardship,
          each paired with a simple tool to start practicing it.
        </p>
        <div className="mt-8">
          <HeroRivers />
        </div>
        <div className="mx-auto mt-6 max-w-xl text-left">
          <ScriptureQuote verse={VERSE.gen2_10_kjv} />
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <span
            data-tour="begin"
            className={`begin-wrap${beginGlow ? " glow-border" : ""}`}
          >
            <Link to={user ? "/course" : "/signin"}>
              <Button>
                {user ? "Continue the course" : "Begin the course"}
              </Button>
            </Link>
          </span>
          {!user && (
            <Button variant="tour" onClick={() => setTouring(true)}>
              Show me around
            </Button>
          )}
        </div>
      </section>

      <div data-tour="intro">
        <Card accent={THEME.palette.gold}>
          <CardBody>
            <span
              className="font-[family-name:var(--font-ui)] text-sm font-semibold"
              style={{ color: THEME.palette.gold }}
            >
              Before River 1
            </span>
            <h3 className="mt-1 text-xl font-semibold text-ink">
              Introduction: Stewardship
            </h3>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
              {INTRODUCTION.lessons.length} short modules on stewardship in
              Scripture, plus the practical basics of budgeting, compounding,
              and debt.
            </p>
          </CardBody>
        </Card>
      </div>

      <section
        data-tour="rivers"
        className="grid scroll-mt-6 gap-4 sm:grid-cols-2"
      >
        {RIVERS.map((r) => (
          <Card key={r.number} accent={r.accent}>
            <CardBody>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-[family-name:var(--font-ui)] text-sm font-semibold"
                  style={{ color: r.accent }}
                >
                  River {r.number}
                </span>
                <span className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                  named for the {r.edenRiver} ({EDEN_RIVER_REFS[r.number]})
                </span>
              </div>
              <h3 className="mt-1 text-xl font-semibold text-ink">{r.title}</h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {r.principle}
              </p>
              <div className="mt-3">
                <ScriptureQuote verse={PRINCIPLE_SCRIPTURE[r.number]} compact />
              </div>
            </CardBody>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div data-tour="modules">
          <Card accent={RIVERS[0].accent} className="h-full">
            <CardBody>
              <h3 className="text-lg font-semibold text-ink">
                Modules and quizzes
              </h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                Each river is a short list of modules you mark complete as you
                go, then a {QUIZ_QUESTION_COUNT}-question quiz. Score{" "}
                {QUIZ_PASS_THRESHOLD} to unlock the next river.
              </p>
            </CardBody>
          </Card>
        </div>
        <div data-tour="exam">
          <Card accent={RIVERS[1].accent} className="h-full">
            <CardBody>
              <h3 className="text-lg font-semibold text-ink">Final exam</h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                {EXAM_QUESTION_COUNT} scenario-based questions, one per page.
                Score {EXAM_PASS_THRESHOLD} to pass, and retake it any time.
              </p>
            </CardBody>
          </Card>
        </div>
        <div data-tour="certificate">
          <Card accent={RIVERS[2].accent} className="h-full">
            <CardBody>
              <h3 className="text-lg font-semibold text-ink">Certificate</h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                Pass the exam to unlock a printable certificate with a QR code
                anyone can scan to verify it.
              </p>
            </CardBody>
          </Card>
        </div>
        <div data-tour="challenge">
          <Card accent={RIVERS[3].accent} className="h-full">
            <CardBody>
              <h3 className="text-lg font-semibold text-ink">
                {CHALLENGE_LENGTH_DAYS}-Day Challenge
              </h3>
              <p className="mt-1 font-[family-name:var(--font-ui)] text-sm text-ink-soft">
                An optional pace: every module, entry, and quiz across{" "}
                {CHALLENGE_LENGTH_DAYS - 1} days, the exam on day{" "}
                {CHALLENGE_LENGTH_DAYS}, with a streak to keep you going.
              </p>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="rounded-2xl bg-parchment-deep/60 p-8 text-center">
        <h2 className="text-2xl font-semibold text-ink">How it works</h2>
        <div className="mx-auto mt-5 grid max-w-2xl gap-5 font-[family-name:var(--font-ui)] text-sm text-ink-soft sm:grid-cols-3">
          <div>
            <div className="text-2xl font-semibold text-water-deep">1</div>
            Read (or listen to) about 15 minutes of teaching per river, each
            point backed by scripture.
          </div>
          <div>
            <div className="text-2xl font-semibold text-water-deep">2</div>
            Use the companion tracker to log at least one real entry.
          </div>
          <div>
            <div className="text-2xl font-semibold text-water-deep">3</div>
            Finish all four and see everything on one dashboard.
          </div>
        </div>
      </section>

      {touring && (
        <GuidedTour
          steps={TOUR_STEPS}
          onClose={(completed) => {
            setTouring(false);
            if (completed) setBeginGlow(true);
          }}
          finalAction={{
            label: "Begin the course",
            onClick: () => navigate("/signin"),
          }}
        />
      )}

      <Testimony />

      <Contact />

      <p className="text-center font-[family-name:var(--font-ui)] text-xs text-ink-soft/80">
        4 Rivers is educational. It does not provide personalized financial or
        investment advice.
      </p>
    </div>
  );
}
