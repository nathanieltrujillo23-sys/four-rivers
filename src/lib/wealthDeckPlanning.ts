/** Slides for the planning-depth tools: insurance, Roth conversion, asset location, capital gains and giving. */
import { acct, barChart, C, clip, CW, exhibit, kpi, money, MX, newSlide, noteBox, tableBase, td, text, th, W, type Ctx, type Row } from "./wealthDeckKit";
import { fmtPct, listJoin, snapshotNumbers } from "./wealthMath";
import { TAX_YEAR, assetLocation, capitalGains, givingOptions, insuranceNeeds, rothConversion, type AccountKind } from "./wealthPlanning";
import { CLASS_IDS, MODEL_PORTFOLIOS, weightTotal, type ClassId } from "./wealthPortfolio";
import { RISK_PROFILES, num } from "./wealthMath";

const TAX_SOURCE = `IRS ${TAX_YEAR} brackets and standard deductions (Rev. Proc. 2025-32) and the client's figures; a planning estimate, not tax advice`;

export function insuranceSlide(c: Ctx) {
  const d = c.plan.planning.insurance;
  const r = insuranceNeeds(d, snapshotNumbers(c.plan));
  const gaps = [r.life.gap > 0 && "life insurance", r.disability.gap > 0 && "disability income", r.umbrella.gap > 0 && "liability (umbrella)"].filter(Boolean) as string[];
  const s = newSlide(c, {
    title: "Insurance needs",
    takeaway: gaps.length === 0 ? "Coverage in force meets the estimated needs on all three lines." : `Coverage falls short on ${listJoin(gaps)}.`,
    notes:
      "Insurance is the part of a plan that protects everything else. Start with the question: if the income stopped tomorrow, who would be hurt and for how long? Life insurance matters when someone depends on the paycheck or shares the debts; disability matters for almost everyone who works, because an illness is likelier than a death during the working years; an umbrella policy covers a lawsuit that exceeds home and auto liability limits. The numbers are rules of thumb with the working shown in the appendix. Say plainly that a licensed agent must price and sell the actual policies.",
  });
  const rows: Row[] = [[th("Life insurance need"), th("Amount", "right")]];
  for (const row of r.life.rows) rows.push([td(row.label), td(acct(row.amount), { align: "right" })]);
  rows.push([td("Total need", { bold: true }), td(acct(r.life.need), { align: "right", bold: true })]);
  rows.push([td("Less liquid savings and coverage in force"), td(acct(-(r.life.offset + r.life.existing)), { align: "right" })]);
  rows.push([td("Gap", { bold: true, fill: C.panel }), td(acct(r.life.gap), { align: "right", bold: true, color: r.life.gap > 0 ? C.red : C.green, fill: C.panel })]);
  s.addTable(rows, { x: MX, y: 1.8, w: 6.4, colW: [4.4, 2.0], rowH: 0.42, ...tableBase });
  const x = 7.4;
  const w = W - MX - x;
  kpi(c, s, x, 1.8, w, "Life insurance gap", money(r.life.gap), `need ${money(r.life.need)}`, r.life.gap > 0 ? "red" : "green");
  kpi(c, s, x, 3.05, w, "Disability gap", `${money(r.disability.gap)} a month`, `target ${money(r.disability.target)}, in force ${money(num(d.groupLtd) + num(d.ownLtd))}`, r.disability.target > 0 && r.disability.gap > 0 ? "red" : "green");
  kpi(c, s, x, 4.3, w, "Umbrella to add", money(r.umbrella.gap), `suggested ${money(r.umbrella.recommended)} in total`, r.umbrella.gap > 0 ? "gold" : "green");
  noteBox(c, s, d.note, MX, 5.45, CW, 1.15);
  exhibit(c, s, "Insurance needs by line", "the client's figures; DIME method for life, a share of income for disability, and a net-worth rule of thumb for liability; an educational estimate, not an insurance quote");
}

export function rothSlide(c: Ctx) {
  const d = c.plan.planning.roth;
  const r = rothConversion(d);
  const s = newSlide(c, {
    title: "Roth conversion",
    takeaway: r.amount <= 0 ? "Converting pre-tax savings to a Roth account pays off when today's tax rate is below tomorrow's." : r.advantage > 0 ? `Converting ${money(r.amount)} now costs ${money(r.tax)} in tax and is worth about ${money(r.advantage)} more after ${num(d.years)} years.` : `Converting ${money(r.amount)} now costs ${money(r.tax)} in tax and does not pay back at the tax rates assumed.`,
    notes:
      "A Roth conversion moves pre-tax money into a Roth account. The client pays ordinary income tax on the amount now, and the growth and withdrawals are tax free afterward. It works best in a year of unusually low income, for a client who expects higher tax later, and when the tax can be paid from money outside the account. Fill the lower brackets rather than jump into a higher one. Name the limits: converted money cannot be moved back, and extra income can raise Medicare premiums or reduce aid.",
  });
  const rows: Row[] = [[th("Bracket"), th("Income up to", "right"), th("Room to convert", "right")]];
  r.rooms.forEach((b) => rows.push([td(`${Math.round(b.rate * 100)}%`, { bold: true }), td(money(b.top), { align: "right" }), td(money(b.room), { align: "right" })]));
  if (r.rooms.length === 0) rows.push([td("Add taxable income"), td(""), td("")]);
  s.addTable(rows, { x: MX, y: 1.85, w: 5.2, colW: [1.2, 2.0, 2.0], rowH: 0.45, ...tableBase });
  text(s, `Taxable income before converting ${money(r.taxableBefore)}; conversion tax ${money(r.tax)} (${fmtPct(r.effective, 1)} of the amount); bracket ${Math.round(r.marginalBefore * 100)}% before, ${Math.round(r.marginalAfter * 100)}% after.`, { x: MX, y: 4.3, w: 5.2, h: 0.9, fontSize: 12, color: C.slate });
  text(s, `Value of ${money(r.amount)} after ${num(d.years)} years`, { x: 6.2, y: 1.85, w: W - MX - 6.2, h: 0.3, fontSize: 12, bold: true, color: C.slate });
  barChart(c, s, 6.2, 2.2, W - MX - 6.2, 3.1, ["Roth (tax free)", `Traditional, after ${Math.round(num(d.retRate))}% tax`, "Conversion tax, grown"], [{ name: "Value", values: [Math.round(r.rothEnd), Math.round(r.tradEnd), Math.round(r.taxOpportunity)] }], { colors: [C.green, C.navy, C.red], legend: false });
  noteBox(c, s, d.note || r.verdict, MX, 5.5, CW, 1.1, d.note ? "For discussion" : "What it shows");
  exhibit(c, s, `Roth conversion of ${money(r.amount)}: tax now against value later`, TAX_SOURCE);
}

export function locationSlide(c: Ctx) {
  const d = c.plan.planning.location;
  const pf = c.plan.portfolio;
  const fromPf = pf.started && Math.abs(weightTotal(pf) - 100) < 0.5;
  const profile = (RISK_PROFILES.find((p) => p.name === c.plan.client.risk)?.name ?? "Moderate") as keyof typeof MODEL_PORTFOLIOS;
  const weights = (fromPf ? Object.fromEntries(pf.classes.map((x) => [x.id, num(x.weight)])) : MODEL_PORTFOLIOS[profile]) as Record<ClassId, number>;
  const ret = Object.fromEntries(pf.classes.map((x) => [x.id, num(x.ret)])) as Record<ClassId, number>;
  const names = Object.fromEntries(pf.classes.map((x) => [x.id, x.name])) as Record<ClassId, string>;
  const r = assetLocation(d, weights, ret);
  const kinds: AccountKind[] = ["taxable", "deferred", "roth"];
  const s = newSlide(c, {
    title: "Asset location",
    takeaway: r.saving > 0 ? `Holding each investment in the right account saves about ${money(r.saving)} a year in tax without changing the portfolio.` : "Where each investment is held changes the tax, not the portfolio.",
    notes:
      "Asset location is about which account holds which investment, not what to own. Interest and bond fund income is taxed every year at ordinary rates, so bonds belong in the tax-deferred account when there is room. Investments with the most growth are best in the Roth, because the growth is never taxed. Broad stock funds are tax efficient and fit the taxable account. The overall mix stays the same; only the address changes. Mention the limits: contribution limits, the cost of selling, and the need for cash you can reach.",
  });
  const rows: Row[] = [[th("Asset class"), ...kinds.map((k) => th(k === "taxable" ? "Taxable" : k === "deferred" ? "Tax-deferred" : "Roth", "right")), th("Total", "right")]];
  CLASS_IDS.filter((id) => kinds.some((k) => (r.placed[k][id] ?? 0) > 0)).forEach((id) =>
    rows.push([td(clip(names[id], 30), { bold: true }), ...kinds.map((k) => td((r.placed[k][id] ?? 0) > 0 ? money(r.placed[k][id] ?? 0) : "–", { align: "right" })), td(money(kinds.reduce((t, k) => t + (r.placed[k][id] ?? 0), 0)), { align: "right", bold: true })]),
  );
  const tw = 8.7;
  s.addTable(rows, { x: MX, y: 1.85, w: tw, colW: [3.0, 1.4, 1.4, 1.4, 1.5], rowH: 0.33, ...tableBase });
  const y = 1.85 + 0.33 * rows.length + 0.15;
  text(s, "Bonds and REITs pay income taxed every year at ordinary rates, so they go in the tax-deferred account first; the investments with the most growth go in the Roth; broad stock funds and cash stay in the taxable account.", { x: MX, y, w: tw, h: 0.55, fontSize: 11, color: C.slate });
  const kx = MX + tw + 0.35;
  const kw = W - MX - kx;
  kpi(c, s, kx, 1.85, kw, "Tax drag, same mix everywhere", `${money(r.dragProrata)} a year`);
  kpi(c, s, kx, 3.1, kw, "Tax drag, as placed", `${money(r.dragPlaced)} a year`);
  kpi(c, s, kx, 4.35, kw, "Saving", `${money(r.saving)} a year`, "in the taxable account", "green");
  noteBox(c, s, d.note, MX, y + 0.65, CW, Math.min(1.2, 6.65 - (y + 0.65)));
  exhibit(c, s, "Placement of each asset class by account type", `the client's balances; ${fromPf ? "the portfolio's weights" : `the ${profile} model portfolio`}; yields are illustrative; ${TAX_SOURCE}`);
}

export function gainsSlide(c: Ctx) {
  const d = c.plan.planning.gains;
  const r = capitalGains(d);
  const s = newSlide(c, {
    title: "Capital gains",
    takeaway: r.net < 0 ? `Selling at a net loss of ${money(-r.net)} would reduce this year's income by ${money(r.deduction)} and carry ${money(r.carryForward)} forward.` : r.net === 0 ? "Long-term gains are taxed at 0%, 15% or 20% depending on income; there is room at 0% before any sale." : r.total < 1 ? `Selling the marked lots realizes ${money(r.net)} of gain with no federal tax, because it falls within the 0% long-term bracket.` : `Selling the marked lots realizes ${money(r.net)} of gain and costs about ${money(r.total)} in tax, ${fmtPct(r.effective, 1)} of the gain.`,
    notes:
      "Capital gains tax is paid only when something is sold, which gives the client control over timing. Gains on investments held more than a year are taxed at lower rates, and for people with modest income the first slice is taxed at 0%, so selling to reset the cost basis can be free. Losses can offset gains and up to $3,000 of pay a year. Remind the client of the wash-sale rule, and that the 3.8% net investment income tax applies at higher incomes. This is a planning estimate: state tax, credits and the alternative minimum tax are not included.",
  });
  const sold = d.lots.filter((l) => l.sell).slice(0, 7);
  const rows: Row[] = [[th("Holding"), th("Cost", "right"), th("Value", "right"), th("Gain or loss", "right"), th("Held")]];
  sold.forEach((l) => {
    const g = num(l.value) - num(l.basis);
    rows.push([td(clip(l.name || "Holding", 24), { bold: true }), td(money(num(l.basis)), { align: "right" }), td(money(num(l.value)), { align: "right" }), td(acct(g), { align: "right", color: g < 0 ? C.red : C.green, bold: true }), td(l.longTerm ? "Over a year" : "A year or less")]);
  });
  if (sold.length === 0) rows.push([td("No lots marked to sell"), td(""), td(""), td(""), td("")]);
  s.addTable(rows, { x: MX, y: 1.85, w: 7.6, colW: [2.4, 1.2, 1.2, 1.5, 1.3], rowH: 0.42, ...tableBase });
  const x = 8.6;
  const w = W - MX - x;
  kpi(c, s, x, 1.85, w, "Total tax", money(r.total), `${fmtPct(r.effective, 1)} of the gain`);
  kpi(c, s, x, 3.1, w, "Room at 0%", money(r.zeroRoom), "more long-term gain", r.zeroRoom > 0 ? "green" : "navy");
  kpi(c, s, x, 4.35, w, "Loss carried forward", money(r.carryForward), `${money(r.deduction)} used this year`);
  noteBox(c, s, d.note, MX, 5.5, CW, 1.1);
  exhibit(c, s, "Gains and losses on the lots marked for sale, and the resulting tax", TAX_SOURCE);
}

export function givingSlide(c: Ctx) {
  const d = c.plan.planning.giving;
  const r = givingOptions(d);
  const best = r.best;
  const s = newSlide(c, {
    title: "Charitable giving",
    takeaway: !best
      ? "How a gift is made changes what it costs the giver."
      : Math.max(...r.options.map((o) => o.netCost)) - best.netCost < 1
        ? `At this income the three ways of giving cost about the same after tax, so give in the way that suits the client.`
        : `${best.short} costs least: about ${money(best.netCost)} after tax, against ${money(Math.max(...r.options.map((o) => o.netCost)))} at most, for ${money(best.charity)} to charity.`,
    notes:
      "Generosity is a value for many clients, and how a gift is made can change what it costs. Cash is simple and flexible. Giving appreciated stock instead of selling it avoids the tax on the gain and still lets the client deduct the full value if they itemize. When a client gives about the same amount every year and takes the standard deduction, bunching several years into one gift to a donor-advised fund can push deductions over the standard deduction in the bunching year, while the charities still receive grants on the client's schedule. The tax saving is a pleasant effect; the gift should be the reason.",
  });
  barChart(c, s, MX, 1.85, 6.0, 3.6, r.options.map((o) => clip(o.id === "cash" ? "Cash each year" : o.id === "stock" ? "Stock each year" : "Bunched in a DAF", 26)), [{ name: "Cost after tax", values: r.options.map((o) => Math.round(o.netCost)) }], { colors: [C.navy, C.gold, C.green], legend: false });
  const rows: Row[] = [[th("Option"), th("To charity", "right"), th("Tax saved", "right"), th("Cost after tax", "right")]];
  r.options.forEach((o) => rows.push([td(clip(o.id === "cash" ? "Cash each year" : o.id === "stock" ? "Stock each year" : "Bunched in a DAF", 30), { bold: best?.id === o.id }), td(money(o.charity), { align: "right" }), td(money(o.saved), { align: "right" }), td(money(o.netCost), { align: "right", bold: best?.id === o.id, color: best?.id === o.id ? C.green : C.ink })]));
  s.addTable(rows, { x: 6.9, y: 1.9, w: W - MX - 6.9, colW: [2.5, 1.1, 1.0, 1.23], rowH: 0.6, ...tableBase });
  text(s, r.options.map((o) => o.detail).join("\n\n"), { x: 6.9, y: 4.0, w: W - MX - 6.9, h: 1.4, fontSize: 10, color: C.slate });
  noteBox(c, s, d.note, MX, 5.6, CW, 1.0);
  exhibit(c, s, "Three ways to give the same gift, compared after tax", `${TAX_SOURCE}; gifts to a donor-advised fund do not qualify for the non-itemizer deduction`);
}
