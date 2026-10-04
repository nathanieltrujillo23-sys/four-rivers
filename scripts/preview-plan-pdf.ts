/** Dev helper: writes sample stewardship-plan PDFs so the layout can be eyeballed. */
import { writeFileSync } from "node:fs";
import { buildStewardshipPdf } from "../src/lib/stewardshipPdf";
import { en } from "../src/i18n/en";
import { es } from "../src/i18n/es";
import { emptyBudget, newItem } from "../src/utils/budget";

const out = process.argv[2] ?? "/tmp";

function sample() {
  const b = emptyBudget();
  b.income = [newItem("Paycheck (part-time)", 2100), newItem("Tutoring", 450), newItem("Birthday money", 50)];
  b.needs = [newItem("Rent and utilities", 1100), newItem("Groceries", 320), newItem("Phone", 45), newItem("Gas", 120), newItem("Student loan minimum", 85)];
  b.discretionary = [newItem("Eating out", 150), newItem("Streaming", 25), newItem("Hobbies", 80)];
  b.saving = [newItem("Emergency fund", 200), newItem("Car repairs", 50)];
  b.investing = [newItem("Roth IRA", 120)];
  b.giving = [newItem("Church", 130), newItem("Food pantry", 25)];
  return b;
}

for (const lang of ["en", "es"] as const) {
  const dict = lang === "en" ? en : es;
  const t = (key: keyof typeof en, vars?: Record<string, string | number>) => {
    let s = dict[key];
    for (const [k, v] of Object.entries(vars ?? {})) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
  const { doc } = await buildStewardshipPdf({ name: "Nate Trujillo", budget: sample(), lang, t, date: new Date("2026-10-04") });
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
