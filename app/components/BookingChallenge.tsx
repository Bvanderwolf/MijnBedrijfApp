import { useMemo, useState } from "react";
import { ArrowLeft, Check, Lightbulb, Plus, Scale, Trash2 } from "lucide-react";
import { ACCOUNTS, accountById, formatMoney } from "../domain/accounts";
import { isBalanced, sameBooking, sumSides } from "../domain/accounting";
import type { JournalLine, ScenarioInstance } from "../domain/types";
import styles from "./components.module.css";

interface DraftLine {
  key: string;
  accountId: string;
  side: "debit" | "credit";
  amount: string;
}

const newLine = (index: number): DraftLine => ({
  key: `${Date.now()}-${index}-${Math.random()}`,
  accountId: "",
  side: index === 0 ? "debit" : "credit",
  amount: "",
});

const toCents = (value: string) => {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

export function BookingChallenge({
  scenario,
  onBack,
  onSuccessContinue,
  onAttempt,
  onComplete,
}: {
  scenario: ScenarioInstance;
  onBack: () => void;
  onSuccessContinue: () => void;
  onAttempt: (correct: boolean, attempt: number) => Promise<void>;
  onComplete: () => Promise<void>;
}) {
  const [lines, setLines] = useState<DraftLine[]>([newLine(0), newLine(1)]);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const booking = useMemo<JournalLine[]>(
    () =>
      lines.map((item) => ({
        accountId: item.accountId,
        side: item.side,
        amountCents: toCents(item.amount),
      })),
    [lines],
  );
  const totals = sumSides(booking);
  const balanced = isBalanced(booking);

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const submit = async () => {
    const nextAttempt = failedAttempts + 1;
    const correct = sameBooking(booking, scenario.solution);
    await onAttempt(correct, nextAttempt);
    if (!correct) {
      setFailedAttempts(nextAttempt);
      setFeedback(
        !balanced
          ? "Debet en credit zijn nog niet gelijk. Controleer je bedragen en regels."
          : scenario.mode === "daily"
            ? `De boeking is in balans, maar een rekening of zijde klopt nog niet. ${scenario.hint}`
            : nextAttempt === 1
              ? scenario.hint
              : "De boeking is in balans, maar een rekening of zijde klopt nog niet. Kijk naar wat toeneemt en afneemt.",
      );
      return;
    }
    setSaving(true);
    await onComplete();
    setSaving(false);
    setCompleted(true);
  };

  if (completed) {
    return (
      <main className={styles.challengeShell}>
        <section className={styles.successCard} aria-live="polite">
          <div className={styles.successIcon}><Check size={32} /></div>
          <span className={styles.kicker}>Goed geboekt</span>
          <h1>De cijfers kloppen!</h1>
          <p>{scenario.explanation}</p>
          <div className={styles.effectCard}>{scenario.sceneEffect}</div>
          <button className={styles.primaryButton} onClick={onSuccessContinue}>
            {scenario.mode === "daily"
              ? "Terug naar Bedrijf"
              : scenario.mode === "practice"
                ? "Verder oefenen"
                : "Bekijk mijn bedrijf"}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.challengeShell}>
      <header className={styles.challengeHeader}>
        <button className={styles.iconButton} onClick={onBack} aria-label="Terug">
          <ArrowLeft size={22} />
        </button>
        <div>
          <span>{scenario.mode === "practice" ? "Oefenscenario" : scenario.mode === "tutorial" ? "Eerste boeking" : "Scenario van vandaag"}</span>
          <strong>Niveau {scenario.templateId.includes("vat") ? 4 : "1–3"}</strong>
        </div>
      </header>

      <section className={styles.storyCard}>
        <span className={styles.kicker}>{scenario.mode === "practice" ? "Zandbak" : "Vandaag in je zaak"}</span>
        <h1>{scenario.title}</h1>
        <p>{scenario.story}</p>
        {scenario.mode === "practice" && <small>Deze oefening verandert je echte bedrijfscijfers niet.</small>}
      </section>

      <section className={styles.bookingCard} aria-labelledby="booking-title">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.stepBadge}>1</span>
            <h2 id="booking-title">Maak de boeking</h2>
          </div>
          <span className={balanced ? styles.balanceGood : styles.balanceOpen}>
            <Scale size={16} /> {balanced ? "In balans" : "Nog niet in balans"}
          </span>
        </div>

        <div className={styles.lines}>
          {lines.map((item, index) => (
            <fieldset className={styles.bookingLine} key={item.key}>
              <legend>Boekingsregel {index + 1}</legend>
              <label>
                Rekening
                <select value={item.accountId} onChange={(event) => updateLine(item.key, { accountId: event.target.value })}>
                  <option value="">Kies een rekening</option>
                  {ACCOUNTS.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}
                </select>
              </label>
              <div className={styles.lineRow}>
                <label>
                  Zijde
                  <select value={item.side} onChange={(event) => updateLine(item.key, { side: event.target.value as "debit" | "credit" })}>
                    <option value="debit">Debet</option>
                    <option value="credit">Credit</option>
                  </select>
                </label>
                <label>
                  Bedrag
                  <span className={styles.moneyInput}><span>€</span><input inputMode="decimal" placeholder="0,00" value={item.amount} onChange={(event) => updateLine(item.key, { amount: event.target.value })} /></span>
                </label>
                {lines.length > 2 && <button className={styles.removeLine} onClick={() => setLines((current) => current.filter((line) => line.key !== item.key))} aria-label={`Verwijder regel ${index + 1}`}><Trash2 size={18} /></button>}
              </div>
            </fieldset>
          ))}
        </div>

        {lines.length < 4 && <button className={styles.addLine} onClick={() => setLines((current) => [...current, newLine(current.length)])}><Plus size={18} /> Voeg boekingsregel toe</button>}

        <div className={styles.balanceBar}>
          <div><span>Debet</span><strong>{formatMoney(totals.debit)}</strong></div>
          <div className={styles.balanceTrack}><span style={{ width: balanced ? "100%" : `${Math.min(100, Math.max(totals.debit, totals.credit) ? Math.min(totals.debit, totals.credit) / Math.max(totals.debit, totals.credit) * 100 : 0)}%` }} /></div>
          <div><span>Credit</span><strong>{formatMoney(totals.credit)}</strong></div>
        </div>

        {feedback && <div className={styles.hint} role="alert"><Lightbulb size={20} /><p>{feedback}</p></div>}

        {failedAttempts >= 3 && (
          <details className={styles.solution}>
            <summary>Bekijk de uitgewerkte oplossing</summary>
            {scenario.solution.map((item) => <p key={`${item.accountId}-${item.side}`}><strong>{accountById(item.accountId)?.name}</strong><span>{item.side === "debit" ? "Debet" : "Credit"} · {formatMoney(item.amountCents)}</span></p>)}
          </details>
        )}

        <button className={styles.primaryButton} onClick={submit} disabled={saving}>{saving ? "Boeking verwerken…" : "Controleer mijn boeking"}</button>
      </section>
    </main>
  );
}
