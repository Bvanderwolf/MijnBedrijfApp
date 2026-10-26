import { useRef, useState } from "react";
import {
  ArrowRight, BarChart3, BookOpen, Briefcase, Building2, CalendarDays, Camera,
  CheckCircle2, Coffee, Download, Lamp, Lock, Monitor, Package, RotateCcw,
  ShoppingBag, Sparkles, Star, TrendingUp, Upload, User, WalletCards,
} from "lucide-react";
import type { Route } from "./+types/home";
import { ACCOUNTS, SECTORS, formatMoney, localDateKey } from "../domain/accounts";
import { calculateFinancials } from "../domain/accounting";
import type { AppSnapshot, ScenarioInstance, SectorId } from "../domain/types";
import { useAppModel } from "../hooks/useAppModel";
import { BusinessScene } from "../components/BusinessScene";
import { BookingChallenge } from "../components/BookingChallenge";
import styles from "./home.module.css";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Mijn Bedrijf — spelenderwijs boekhouden" },
    { name: "description", content: "Bouw iedere dag aan je bedrijf en leer spelenderwijs boekhouden." },
    { property: "og:title", content: "Mijn Bedrijf" },
    { property: "og:description", content: "Spelenderwijs leren boekhouden" },
    { property: "og:image", content: "/og.png" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Mijn Bedrijf" },
    { name: "twitter:description", content: "Spelenderwijs leren boekhouden" },
    { name: "twitter:image", content: "/og.png" },
  ];
}

type MainView = "company" | "practice" | "overview" | "profile";

export default function Home() {
  const app = useAppModel();
  const [activeScenario, setActiveScenario] = useState<ScenarioInstance | null>(null);
  const [view, setView] = useState<MainView>("company");

  if (app.loading) return <LoadingScreen />;
  if (activeScenario) {
    return (
      <BookingChallenge
        scenario={activeScenario}
        onBack={() => setActiveScenario(null)}
        onSuccessContinue={() => {
          if (activeScenario.mode === "daily") setView("company");
          setActiveScenario(null);
        }}
        onAttempt={(correct, attempt) => app.recordAttempt(activeScenario, correct, attempt)}
        onComplete={() => app.completeScenario(activeScenario)}
      />
    );
  }
  if (!app.snapshot.profile) {
    return <Onboarding onCreate={async (name, sector, offering) => setActiveScenario(await app.createCompany(name, sector, offering))} />;
  }

  return (
    <AppShell view={view} setView={setView}>
      {view === "company" && <CompanyView snapshot={app.snapshot} onOpenScenario={async () => {
        const tutorial = app.snapshot.instances.find((instance) => instance.mode === "tutorial" && !instance.completedAt);
        setActiveScenario(tutorial ?? (await app.getOrCreateScenario("daily")));
      }} />}
      {view === "practice" && <PracticeView level={app.snapshot.progress.unlockedLevel} mastered={app.snapshot.progress.masteredConcepts.length} onPractice={async () => setActiveScenario(await app.getOrCreateScenario("practice"))} />}
      {view === "overview" && <OverviewView snapshot={app.snapshot} />}
      {view === "profile" && <ProfileView snapshot={app.snapshot} onExport={app.exportData} onImport={app.importData} onReset={app.reset} />}
    </AppShell>
  );
}

function LoadingScreen() {
  return <main className={styles.loading}><span><Building2 size={28} /></span><p>Je zaak wordt geopend…</p></main>;
}

function Onboarding({ onCreate }: { onCreate: (name: string, sector: SectorId, offering: string) => Promise<void> }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sectorId, setSectorId] = useState<SectorId>("creative");
  const [offeringId, setOfferingId] = useState("webdesign");
  const [saving, setSaving] = useState(false);
  const sector = SECTORS.find((item) => item.id === sectorId) ?? SECTORS[0];
  const icons = { creative: Briefcase, shop: ShoppingBag, hospitality: Coffee };
  const chooseSector = (id: SectorId) => {
    const next = SECTORS.find((item) => item.id === id) ?? SECTORS[0];
    setSectorId(id);
    setOfferingId(next.offerings[0].id);
  };

  return (
    <main className={styles.onboardingShell}>
      <section className={styles.onboarding} aria-labelledby="onboarding-title">
        <header className={styles.brand}><span className={styles.logo}><Building2 size={23} /></span><span>Mijn Bedrijf</span></header>
        <div className={styles.progress} aria-label={`Stap ${step} van 3`}>{[1, 2, 3].map((number) => <span className={number <= step ? styles.progressActive : ""} key={number} />)}</div>
        {step === 1 && (
          <form className={styles.step} onSubmit={(event) => { event.preventDefault(); if (name.trim()) setStep(2); }}>
            <div className={styles.welcomeVisual}><Sparkles size={34} /><strong>Jouw droomzaak<br />begint vandaag.</strong><small>Boekhouden leer je stap voor stap.</small></div>
            <span className={styles.eyebrow}>Jouw zaak, jouw verhaal</span>
            <h1 id="onboarding-title">Hoe heet jouw bedrijf?</h1>
            <p>Geef je virtuele onderneming een naam. Je gegevens blijven veilig op dit apparaat.</p>
            <label>Bedrijfsnaam<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bijvoorbeeld: Studio Spruit" autoFocus maxLength={40} /></label>
            <button className={styles.primaryButton} disabled={!name.trim()}>Kies mijn sector <ArrowRight size={20} /></button>
          </form>
        )}
        {step === 2 && (
          <div className={styles.step}>
            <span className={styles.eyebrow}>Stap 2</span><h1 id="onboarding-title">Waar ga je ondernemen?</h1><p>Deze keuze bepaalt de sfeer en een deel van je dagelijkse situaties.</p>
            <div className={styles.choiceGrid}>{SECTORS.map((item) => { const Icon = icons[item.id]; return <button key={item.id} className={sectorId === item.id ? styles.choiceActive : styles.choice} onClick={() => chooseSector(item.id)}><span><Icon size={24} /></span><strong>{item.label}</strong><small>{item.description}</small>{sectorId === item.id && <CheckCircle2 size={20} />}</button>; })}</div>
            <div className={styles.actions}><button className={styles.secondaryButton} onClick={() => setStep(1)}>Terug</button><button className={styles.primaryButton} onClick={() => setStep(3)}>Kies mijn aanbod <ArrowRight size={20} /></button></div>
          </div>
        )}
        {step === 3 && (
          <div className={styles.step}>
            <span className={styles.eyebrow}>Bijna klaar</span><h1 id="onboarding-title">Wat ga je aanbieden?</h1><p>Kies waarmee {name} klanten blij gaat maken.</p>
            <div className={styles.previewImage}><img src={sector.image} alt={`Voorbeeld van ${sector.shortLabel}`} /></div>
            <div className={styles.offeringGrid}>{sector.offerings.map((offering, index) => { const Icon = sectorId === "creative" ? (index ? Camera : Monitor) : sectorId === "shop" ? (index ? Lamp : Package) : Coffee; return <button key={offering.id} className={offeringId === offering.id ? styles.offeringActive : styles.offering} onClick={() => setOfferingId(offering.id)}><Icon size={22} /><span>{offering.label}</span></button>; })}</div>
            <div className={styles.actions}><button className={styles.secondaryButton} onClick={() => setStep(2)}>Terug</button><button className={styles.primaryButton} disabled={saving} onClick={async () => { setSaving(true); await onCreate(name, sectorId, offeringId); }}>{saving ? "Zaak openen…" : "Open mijn bedrijf"} <Sparkles size={19} /></button></div>
          </div>
        )}
        <p className={styles.footnote}>Geen account nodig · voortgang wordt lokaal opgeslagen</p>
      </section>
    </main>
  );
}

function AppShell({ view, setView, children }: { view: MainView; setView: (view: MainView) => void; children: React.ReactNode }) {
  const nav = [
    { id: "company" as const, label: "Bedrijf", icon: Building2 },
    { id: "practice" as const, label: "Oefenen", icon: BookOpen },
    { id: "overview" as const, label: "Overzicht", icon: BarChart3 },
    { id: "profile" as const, label: "Profiel", icon: User },
  ];
  return <div className={styles.appShell}><main className={styles.mainContent}>{children}</main><nav className={styles.bottomNav} aria-label="Hoofdnavigatie">{nav.map((item) => <button key={item.id} className={view === item.id ? styles.navActive : ""} onClick={() => setView(item.id)}><item.icon size={21} /><span>{item.label}</span></button>)}</nav></div>;
}

function CompanyView({ snapshot, onOpenScenario }: { snapshot: AppSnapshot; onOpenScenario: () => Promise<void> }) {
  const profile = snapshot.profile!;
  const financials = calculateFinancials(snapshot.entries);
  const todayComplete = snapshot.progress.lastDailyDate === localDateKey();
  const tutorialOpen = snapshot.instances.some((item) => item.mode === "tutorial" && !item.completedAt);
  const latestCompleted = [...snapshot.instances]
    .reverse()
    .find((item) => item.completedAt && item.mode !== "practice");
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}><div><span className={styles.eyebrow}>Goedemorgen</span><h1>{profile.name}</h1></div><div className={styles.avatar}>{profile.name.slice(0, 1).toUpperCase()}</div></header>
      <BusinessScene profile={profile} growthDays={snapshot.progress.growthDays} message={latestCompleted?.sceneEffect} />
      <section className={styles.metrics} aria-label="Kerncijfers"><div><span><WalletCards size={18} /> Bank</span><strong>{formatMoney(financials.bank)}</strong></div><div><span><TrendingUp size={18} /> Resultaat</span><strong className={financials.result < 0 ? styles.negative : ""}>{formatMoney(financials.result, true)}</strong></div><div><span><Star size={18} /> Reputatie</span><strong>{snapshot.progress.reputation}<small>/100</small></strong></div></section>
      <section className={todayComplete && !tutorialOpen ? styles.dailyDone : styles.dailyCard}><div className={styles.dailyIcon}>{todayComplete && !tutorialOpen ? <CheckCircle2 size={26} /> : <CalendarDays size={26} />}</div><div><span>{tutorialOpen ? "Je eerste boeking" : todayComplete ? "Klaar voor vandaag" : "Scenario van vandaag"}</span><h2>{tutorialOpen ? "Stort je startkapitaal" : todayComplete ? "Je bedrijf groeit rustig verder" : "Er is iets gebeurd in je zaak"}</h2><p>{tutorialOpen ? "Leer meteen hoe debet en credit samenwerken." : todayComplete ? "Oefen gerust verder in de zandbak." : "Los de boeking op en zie wat er verandert."}</p></div>{(!todayComplete || tutorialOpen) && <button onClick={onOpenScenario}>Open scenario <ArrowRight size={19} /></button>}</section>
      <section className={styles.growthCard}><div><span>Groeipad</span><strong>{snapshot.progress.growthDays} groeidagen</strong></div><div className={styles.growthTrack}><span style={{ width: `${Math.min(100, snapshot.progress.growthDays / 8 * 100)}%` }} /></div><small>Nog {Math.max(0, 8 - snapshot.progress.growthDays)} dagen tot een volledig uitgegroeide zaak</small></section>
      <p className={styles.disclaimer}>Educatieve simulatie · geen boekhoudkundig of fiscaal advies</p>
    </div>
  );
}

function PracticeView({ level, mastered, onPractice }: { level: number; mastered: number; onPractice: () => Promise<void> }) {
  const lessons = [["Basis van de balans", "Bezittingen en eigen vermogen", 1], ["Omzet & kosten", "Ontdek hoe resultaat ontstaat", 2], ["Facturen", "Debiteuren en crediteuren", 3], ["Btw", "Boek nettobedragen en btw apart", 4]] as const;
  return <div className={styles.page}><header className={styles.pageHeader}><div><span className={styles.eyebrow}>Zonder gevolgen oefenen</span><h1>Oefenruimte</h1></div><div className={styles.headerIcon}><BookOpen size={24} /></div></header><section className={styles.practiceHero}><div><span>Niveau {level}</span><h2>Blijf je boekhoudspieren trainen</h2><p>Oefeningen veranderen je echte bedrijfscijfers niet. Je leerprogressie telt wel mee.</p></div><strong>{mastered}<small> onderwerpen<br />onder de knie</small></strong></section><div className={styles.lessonList}>{lessons.map(([title, description, required]) => <article className={required <= level ? styles.lesson : styles.lessonLocked} key={title}><span>{required <= level ? <CheckCircle2 size={22} /> : <Lock size={20} />}</span><div><strong>{title}</strong><small>{description}</small></div><em>Niveau {required}</em></article>)}</div><button className={styles.largeCta} onClick={onPractice}>Start een oefenscenario <ArrowRight size={20} /></button></div>;
}

function OverviewView({ snapshot }: { snapshot: AppSnapshot }) {
  const [tab, setTab] = useState<"balance" | "result">("balance");
  const financials = calculateFinancials(snapshot.entries);
  const rows = ACCOUNTS.filter((account) => tab === "balance" ? ["asset", "liability", "equity"].includes(account.type) : ["revenue", "expense"].includes(account.type));
  return (
    <div className={styles.page}><header className={styles.pageHeader}><div><span className={styles.eyebrow}>Actuele cijfers</span><h1>Overzicht</h1></div><div className={styles.headerIcon}><BarChart3 size={24} /></div></header><div className={styles.tabs}><button className={tab === "balance" ? styles.tabActive : ""} onClick={() => setTab("balance")}>Balans</button><button className={tab === "result" ? styles.tabActive : ""} onClick={() => setTab("result")}>Winst & verlies</button></div><section className={styles.statement}><div className={styles.statementIntro}><span>{tab === "balance" ? "Momentopname" : "Sinds de start"}</span><strong>{tab === "balance" ? formatMoney(financials.assets) : formatMoney(financials.result, true)}</strong><small>{tab === "balance" ? "Totaal aan bezittingen" : "Cumulatief resultaat"}</small></div><div className={styles.statementRows}>{rows.map((account) => <div key={account.id}><span><small>{account.code}</small>{account.name}</span><strong>{formatMoney(financials.balances[account.id] ?? 0, true)}</strong></div>)}</div>{tab === "balance" && <div className={styles.equation}><strong>Bezittingen</strong><span>{formatMoney(financials.assets)}</span><em>=</em><strong>Schulden + vermogen + resultaat</strong><span>{formatMoney(financials.liabilities + financials.equity + financials.result)}</span></div>}</section><section className={styles.journal}><h2>Laatste boekingen</h2>{snapshot.entries.length ? [...snapshot.entries].reverse().slice(0, 5).map((entry) => <div key={entry.id}><span>{entry.description}<small>{new Date(entry.postedAt).toLocaleDateString("nl-NL")}</small></span><strong>{formatMoney(entry.lines.find((line) => line.side === "debit")?.amountCents ?? 0)}</strong></div>) : <p>Nog geen boekingen. Je eerste scenario vult dit overzicht.</p>}</section></div>
  );
}

function ProfileView({ snapshot, onExport, onImport, onReset }: { snapshot: AppSnapshot; onExport: () => Promise<AppSnapshot>; onImport: (data: AppSnapshot) => Promise<void>; onReset: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const sector = SECTORS.find((item) => item.id === snapshot.profile?.sectorId);
  const offering = sector?.offerings.find((item) => item.id === snapshot.profile?.offeringId);
  const download = async () => { const data = await onExport(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `mijn-bedrijf-${localDateKey()}.json`; anchor.click(); URL.revokeObjectURL(url); setMessage("Reservekopie gedownload."); };
  return (
    <div className={styles.page}><header className={styles.pageHeader}><div><span className={styles.eyebrow}>Jouw gegevens</span><h1>Profiel</h1></div><div className={styles.avatar}>{snapshot.profile?.name.slice(0, 1).toUpperCase()}</div></header><section className={styles.profileCard}><BusinessScene profile={snapshot.profile!} growthDays={snapshot.progress.growthDays} compact /><div><h2>{snapshot.profile?.name}</h2><p>{sector?.label} · {offering?.label}</p></div></section><section className={styles.dataCard}><h2>Lokale gegevens</h2><p>Je voortgang staat alleen in deze browser. Download een reservekopie om hem veilig te bewaren of op een ander apparaat te importeren.</p><button onClick={download}><Download size={20} /><span><strong>Exporteer reservekopie</strong><small>Download als JSON-bestand</small></span></button><button onClick={() => inputRef.current?.click()}><Upload size={20} /><span><strong>Importeer reservekopie</strong><small>Vervangt de huidige voortgang</small></span></button><input ref={inputRef} type="file" accept="application/json" hidden onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()) as AppSnapshot; if (!data.progress || !Array.isArray(data.entries)) throw new Error(); await onImport(data); setMessage("Reservekopie geïmporteerd."); } catch { setMessage("Dit bestand is geen geldige reservekopie."); } }} /></section><section className={styles.resetCard}><div><RotateCcw size={21} /><span><strong>Opnieuw beginnen</strong><small>Verwijdert je bedrijf en alle boekingen</small></span></div><button onClick={async () => { if (window.confirm("Weet je zeker dat je alle lokale voortgang wilt verwijderen?")) await onReset(); }}>Wis mijn bedrijf</button></section>{message && <p className={styles.toast} role="status">{message}</p>}<p className={styles.disclaimer}>Mijn Bedrijf v1 · Educatieve simulatie</p></div>
  );
}
