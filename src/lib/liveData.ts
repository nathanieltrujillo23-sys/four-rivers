/**
 * The browser side of /api/data (Update 41): small typed fetchers for the course's public-data tools. Every answer is
 * cached by the server; here a failed request simply returns null and the tool says it couldn't load.
 */
export interface Rate {
  key: "inflation" | "t3m" | "t10y" | "mortgage30";
  value: number;
  asOf: string;
}
export interface RatesReply {
  rates: Rate[];
  live: boolean;
  source: string;
}
export interface PayReply {
  area: "us" | "fl";
  year: string;
  live: boolean;
  jobs: { soc: string; median: number }[];
}
export interface School {
  id: number;
  name: string;
  city: string;
  state: string;
  earnings10: number | null;
  debt: number | null;
  netPrice: number | null;
  completion: number | null;
}
export interface Program {
  title: string;
  earnings1: number | null;
  earnings4: number | null;
  debt: number | null;
  payment: number | null;
}
export interface CharityHit {
  ein: string;
  name: string;
  city: string;
  state: string;
}
export interface CharityFiling {
  year: number;
  revenue: number | null;
  contributions: number | null;
  expenses: number | null;
  netAssets: number | null;
  officerPay: number | null;
  fundraisingFees: number | null;
  pdf: string | null;
}
export interface CharityDetail {
  org: { ein: string; name: string; city: string; state: string; ntee: string; url: string };
  filings: CharityFiling[];
}

/** Set when the last request failed because the source is rate-limiting (shared demo key); tools say "try later". */
export let lastFailureBusy = false;

async function get<T>(query: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/data?${query}`);
    lastFailureBusy = res.status === 503;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const fetchRates = () => get<RatesReply>("source=rates");
export const fetchPay = (area: "us" | "fl") => get<PayReply>(`source=salary&area=${area}`);
export const searchSchools = (q: string) => get<{ schools: School[] }>(`source=school&q=${encodeURIComponent(q)}`);
export const fetchPrograms = (id: number) => get<{ programs: Program[] }>(`source=programs&id=${id}`);
export const searchCharities = (q: string) => get<{ orgs: CharityHit[] }>(`source=charity&q=${encodeURIComponent(q)}`);
export const fetchCharity = (ein: string) => get<CharityDetail>(`source=charity&ein=${encodeURIComponent(ein)}`);

/** "Sep 2026" / "sept 2026" from an ISO date. */
export function monthYear(iso: string, lang: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(lang === "es" ? "es-US" : "en-US", { month: "short", year: "numeric" });
}

export function usd(n: number | null, lang: string): string {
  if (n === null) return "—";
  return n.toLocaleString(lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Large amounts shortened: $1.2B, $3.4M; smaller ones in full. */
export function bigUsd(n: number | null, lang: string): string {
  if (n === null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return usd(n, lang);
}

/** The jobs in the pay table, by Standard Occupational Classification code, in English and Spanish. */
export const JOB_NAMES: Record<string, { en: string; es: string }> = {
  "132051": { en: "Financial analyst", es: "Analista financiero" },
  "132052": { en: "Personal financial advisor", es: "Asesor financiero personal" },
  "113031": { en: "Financial manager", es: "Gerente financiero" },
  "132011": { en: "Accountant or auditor", es: "Contador o auditor" },
  "132041": { en: "Credit analyst", es: "Analista de crédito" },
  "132072": { en: "Loan officer", es: "Oficial de préstamos" },
  "131111": { en: "Management analyst (consultant)", es: "Analista de gestión (consultor)" },
  "111021": { en: "General or operations manager", es: "Gerente general o de operaciones" },
  "151252": { en: "Software developer", es: "Desarrollador de software" },
  "291141": { en: "Registered nurse", es: "Enfermero titulado" },
  "252021": { en: "Elementary school teacher", es: "Maestro de primaria" },
  "412031": { en: "Retail salesperson", es: "Vendedor minorista" },
};
