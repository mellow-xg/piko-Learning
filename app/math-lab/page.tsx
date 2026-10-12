"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { Shell } from "@/components/Shell";

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: Element[]) => Promise<void>;
      typesetClear?: (elements?: Element[]) => void;
    };
  }
}

const steps = [
  {
    title: "Start with the equation",
    explanation: "We want to find the values of x that make this equation equal to zero.",
    equation: "x^2 - 5x + 6 = 0",
    note: "Look for two numbers that multiply to 6 and add up to -5.",
  },
  {
    title: "Split the middle term",
    explanation: "The numbers -2 and -3 multiply to 6 and add up to -5, so split -5x into -2x and -3x.",
    equation: "x^2 - 2x - 3x + 6 = 0",
    note: "Splitting the middle term helps us group terms that share a factor.",
  },
  {
    title: "Group the terms",
    explanation: "Put the first two terms together and the last two terms together.",
    equation: "x(x - 2) - 3(x - 2) = 0",
    note: "Both groups contain the common factor (x - 2).",
  },
  {
    title: "Factorise",
    explanation: "Take the shared factor (x - 2) outside the brackets.",
    equation: "(x - 2)(x - 3) = 0",
    note: "If two factors multiply to zero, at least one of the factors must be zero.",
  },
  {
    title: "Solve each factor",
    explanation: "Set each bracket equal to zero and solve both small equations.",
    equation: String.raw`\begin{aligned}x - 2 &= 0 \\ x - 3 &= 0\end{aligned}`,
    note: "Add 2 to the first equation and add 3 to the second equation.",
  },
  {
    title: "Final answer",
    explanation: "The two solutions are 2 and 3. You can check them by substituting each value into the original equation.",
    equation: String.raw`x = 2 \quad \text{or} \quad x = 3`,
    note: "Check: 2² - 5(2) + 6 = 0, and 3² - 5(3) + 6 = 0.",
  },
];

const answers = [
  { label: "-2 and -3", correct: true, feedback: "Correct! (-2) × (-3) = 6 and (-2) + (-3) = -5." },
  { label: "2 and 3", correct: false, feedback: "Their product is 6, but their sum is +5. We need a pair whose sum is -5." },
  { label: "1 and 6", correct: false, feedback: "Their product is 6, but their sum is 7. We need a pair whose sum is -5." },
];

export default function MathLabPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState(false);

  const typesetMath = useCallback(() => {
    if (typeof window !== "undefined" && window.MathJax?.typesetPromise) {
      window.MathJax.typesetClear?.();
      void window.MathJax.typesetPromise();
    }
  }, []);

  useEffect(() => {
    typesetMath();
  }, [stepIndex, selected, checked, showHint, completed, typesetMath]);

  function checkAnswer() {
    if (selected === null) return;
    setChecked(true);
    if (answers[selected].correct) setCompleted(true);
  }

  function restartLesson() {
    setStepIndex(0);
    setSelected(null);
    setChecked(false);
    setShowHint(false);
    setCompleted(false);
  }

  return (
    <>
      <Script
        id="mathjax-script"
        src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
        strategy="afterInteractive"
        onReady={typesetMath}
      />
      <Shell active="learn">
        <a className="back-link" href="/learn">← Back to Learn</a>

        <section className="math-hero">
          <div className="math-hero-copy">
            <p className="eyebrow">PIKO MATH STUDIO · INTERACTIVE LESSON</p>
            <h1>Quadratic equations</h1>
            <p>Learn one step at a time. Read the explanation, inspect the equation, and check your understanding before moving on.</p>
            <div className="math-badges"><span>📐 Algebra</span><span>⏱ 8 minutes</span><span>⚡ +30 XP</span></div>
          </div>
          <div className="math-hero-symbol" aria-hidden="true">∑</div>
        </section>

        <div className="math-layout">
          <aside className="math-sidebar">
            <p className="eyebrow">YOUR PROGRESS</p>
            <div className="math-progress-track"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
            <strong>Step {stepIndex + 1} of {steps.length}</strong>
            <div className="math-step-list">
              {steps.map((step, index) => (
                <button key={step.title} className={`math-step-nav ${index === stepIndex ? "is-current" : ""} ${index < stepIndex ? "is-done" : ""}`} onClick={() => setStepIndex(index)}>
                  <span>{index < stepIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>{step.title}
                </button>
              ))}
              <div className={`math-step-nav math-quiz-nav ${completed ? "is-done" : ""}`}><span>{completed ? "✓" : "?"}</span>Quick check</div>
            </div>
            <div className="math-side-note"><span>💡</span><p>You can revisit any step whenever you need a refresher.</p></div>
          </aside>

          <section className="math-lesson-card">
            <div className="math-card-top"><span className="math-step-chip">STEP {String(stepIndex + 1).padStart(2, "0")}</span><span className="math-xp-chip">+5 XP potential</span></div>
            <h2>{steps[stepIndex].title}</h2>
            <p className="math-explanation">{steps[stepIndex].explanation}</p>

            <div className="math-equation-wrap" aria-label="Mathematical equation">
              <div className="math-equation">\[{steps[stepIndex].equation}\]</div>
            </div>

            <div className="math-note"><span>🧠</span><div><strong>Think about this</strong><p>{steps[stepIndex].note}</p></div></div>

            {showHint && <div className="math-hint"><strong>Hint</strong><p>Keep each side of an equation balanced. Whatever operation you apply, apply it consistently to both sides.</p></div>}

            <div className="math-actions">
              <button className="secondary-btn math-action-btn" onClick={() => setShowHint((value) => !value)}>{showHint ? "Hide hint" : "💡 Show a hint"}</button>
              {stepIndex > 0 && <button className="secondary-btn math-action-btn" onClick={() => setStepIndex((index) => index - 1)}>← Previous</button>}
              {stepIndex < steps.length - 1 ? (
                <button className="primary-btn math-action-btn" onClick={() => setStepIndex((index) => Math.min(index + 1, steps.length - 1))}>Next step →</button>
              ) : (
                <button className="primary-btn math-action-btn" onClick={() => document.getElementById("math-quick-check")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Try quick check ↓</button>
              )}
            </div>
          </section>
        </div>

        <section className="math-quiz-card" id="math-quick-check">
          <div className="math-quiz-heading"><span>🎯</span><div><p className="eyebrow">QUICK CHECK</p><h2>Which pair helps factorise the equation?</h2><p>For x² − 5x + 6 = 0, choose two numbers whose product is 6 and whose sum is −5.</p></div></div>
          <div className="math-answer-list">
            {answers.map((answer, index) => (
              <button key={answer.label} className={`math-answer ${selected === index ? "is-selected" : ""} ${checked && answer.correct ? "is-correct" : ""} ${checked && selected === index && !answer.correct ? "is-incorrect" : ""}`} onClick={() => { setSelected(index); setChecked(false); }} aria-pressed={selected === index}>
                <span className="math-answer-radio">{selected === index ? "●" : "○"}</span>{answer.label}
                {checked && answer.correct && <strong>✓ Correct</strong>}
              </button>
            ))}
          </div>
          {checked && selected !== null && <div className={`math-feedback ${answers[selected].correct ? "feedback-good" : "feedback-retry"}`}><strong>{answers[selected].correct ? "Nice work! 🎉" : "Good attempt — try again."}</strong><p>{answers[selected].correct ? "The signed pair is −2 and −3: their product is 6 and their sum is −5." : "Check both conditions: the product must be 6 and the sum must be −5."}</p></div>}
          {completed && <div className="math-complete-banner"><span>🏆</span><div><strong>Lesson practice complete!</strong><p>You finished the worked example and answered the quick check correctly. This demo lesson tracks completion locally.</p></div><button className="secondary-btn" onClick={restartLesson}>Practice again</button></div>}
          <div className="math-quiz-actions"><button className="primary-btn" onClick={checkAnswer} disabled={selected === null}>Check answer</button><span>Take your time — understanding matters more than speed.</span></div>
        </section>

        <section className="math-long-equation">
          <p className="eyebrow">BUILT FOR LONG EQUATIONS</p>
          <h2>Math can take as much space as it needs.</h2>
          <p>Multi-line derivations, fractions, roots, exponents, and aligned equations can all be rendered in the lesson flow.</p>
          <div className="math-equation-wrap math-equation-long">
            <div className="math-equation">\[\begin{aligned} (a+b)^2 &= (a+b)(a+b) \\ &= a^2 + ab + ba + b^2 \\ &= a^2 + 2ab + b^2 \end{aligned}\]</div>
          </div>
        </section>
      </Shell>
    </>
  );
}
