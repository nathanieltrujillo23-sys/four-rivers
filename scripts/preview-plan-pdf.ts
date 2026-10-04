/** Dev helper: writes sample stewardship-plan PDFs so the layout can be eyeballed. */
import { writeFileSync } from "node:fs";
import { buildStewardshipPdf } from "../src/lib/stewardshipPdf";
import { en } from "../src/i18n/en";
import { es } from "../src/i18n/es";
import { emptyBudget, newItem } from "../src/utils/budget";

const out = process.argv[2] ?? "/tmp";

function sample(lang: "en" | "es" = "en") {
  const L = (en: string, es: string) => (lang === "es" ? es : en);
  const b = emptyBudget();
  b.income = [newItem(L("Paycheck (part-time)", "Sueldo (medio tiempo)"), 2100), newItem(L("Tutoring", "Clases particulares"), 450), newItem(L("Birthday money", "Regalo de cumpleaños"), 50)];
  b.needs = [newItem(L("Rent and utilities", "Renta y servicios"), 1100), newItem(L("Groceries", "Comida"), 320), newItem(L("Phone", "Teléfono"), 45), newItem(L("Gas", "Gasolina"), 120), newItem(L("Student loan minimum", "Pago mínimo del préstamo"), 85)];
  b.discretionary = [newItem(L("Eating out", "Salir a comer"), 150), newItem(L("Streaming", "Streaming"), 25), newItem(L("Hobbies", "Pasatiempos"), 80)];
  b.saving = [newItem(L("Emergency fund", "Fondo de emergencia"), 200), newItem(L("Car repairs", "Reparaciones del auto"), 50)];
  b.investing = [newItem(L("Roth IRA", "Cuenta de jubilación"), 120)];
  b.giving = [newItem(L("Church", "Iglesia"), 130), newItem(L("Food pantry", "Despensa de alimentos"), 25)];
  return b;
}

for (const lang of ["en", "es"] as const) {
  const dict = lang === "en" ? en : es;
  const t = (key: keyof typeof en, vars?: Record<string, string | number>) => {
    let s = dict[key];
    for (const [k, v] of Object.entries(vars ?? {})) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  const { doc } = await buildStewardshipPdf({ name: process.env.PDF_NAME ?? "Nate Trujillo", budget: sample(lang), lang, t, date: new Date("2026-10-04") });
  writeFileSync(`${out}/plan-${lang}.pdf`, Buffer.from(doc.output("arraybuffer")));
}
// Many lines, over-budget, special characters: exercises page breaks and sanitizing.
{
  const b = sample();
  b.discretionary = Array.from({ length: 14 }, (_, i) => newItem(`Extra line number ${i + 1} with “smart quotes” and an emoji 😀`, 100 + i));
  const t = (key: keyof typeof en, vars?: Record<string, string | number>) => {
    let s = en[key];
    for (const [k, v] of Object.entries(vars ?? {})) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  const { doc } = await buildStewardshipPdf({ name: "María José de la Cruz Hernández-Villanueva", budget: b, lang: "en", t });
  writeFileSync(`${out}/plan-long.pdf`, Buffer.from(doc.output("arraybuffer")));
}
console.log("done");
