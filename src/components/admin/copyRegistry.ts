import { en } from "../../i18n/en";
import { EXPLANATIONS, type ExplanationSet } from "../../content/explanations";
import { explanationFor } from "../../content/explain";
import { MOMENTS } from "../../content/moments";
import { OUTREACH_GUIDE } from "../../content/outreachGuide";
import { SECTIONS, CATALOG } from "../community/workshop/toolCatalog";
import { specDefaults } from "../community/workshop/specValues";
import { CUSTOM_NOTES } from "../community/workshop/toolDefaults";
import { SPECS } from "../community/workshop/toolSpecs";
import { SWOT_GRID, TOOLKIT_TEXT, TOPICS, WORKSHOP_STEPS, WORKSHOP_TEXT } from "../community/workshop/workshopContent";

/** One piece of text an admin can reword, with the key it is stored under and the wording it ships with. */
export interface CopyItem {
  key: string;
  label: string;
  def: string;
  /** A hint for how tall the box should be. */
  rows?: number;
}
export interface CopyGroup {
  id: string;
  title: string;
  text: string;
  subgroups: { title: string; items: CopyItem[] }[];
}

const SET_NAMES: Record<ExplanationSet, string> = {
  introduction: "Introduction quiz",
  "1": "River 1 quiz",
  "2": "River 2 quiz",
  "3": "River 3 quiz",
  "4": "River 4 quiz",
  exam: "Final exam",
};

/** Every piece of reworded-able text, in the order it is shown in Admin, Content. */
export function buildCopyRegistry(): CopyGroup[] {
  const groups: CopyGroup[] = [];

  groups.push({
    id: "explanations",
    title: "Quiz and exam explanations",
    text: "The \"Why this answer\" text shown after a quiz or the final exam.",
    subgroups: (Object.keys(EXPLANATIONS) as ExplanationSet[]).map((set) => ({
      title: SET_NAMES[set],
      items: EXPLANATIONS[set].map((x, i) => ({
        key: `explain:${set}:${i}`,
        label: `Question ${i + 1}${explanationFor(set, i, "en") ? `, lesson: ${explanationFor(set, i, "en")!.lessonTitle}` : ""}`,
        def: x.why,
        rows: 3,
      })),
    })),
  });

  groups.push({
    id: "moments",
    title: "Money moments",
    text: "The five short reads on the course home. Separate paragraphs with a blank line.",
    subgroups: MOMENTS.map((m) => ({
      title: m.en.title,
      items: [
        { key: `moment:${m.id}:title`, label: "Title", def: m.en.title },
        { key: `moment:${m.id}:hook`, label: "Opening line", def: m.en.hook, rows: 3 },
        ...m.en.sections.flatMap((s, i): CopyItem[] => [
          { key: `moment:${m.id}:s${i}:heading`, label: `Section ${i + 1}: heading`, def: s.heading },
          { key: `moment:${m.id}:s${i}:body`, label: `Section ${i + 1}: text`, def: s.body.join("\n\n"), rows: 6 },
        ]),
        ...m.en.steps.map((x, i): CopyItem => ({ key: `moment:${m.id}:step${i}`, label: `Try this week ${i + 1}`, def: x, rows: 2 })),
        ...m.en.ask.map((x, i): CopyItem => ({ key: `moment:${m.id}:ask${i}`, label: `Ask yourself ${i + 1}`, def: x, rows: 2 })),
        { key: `moment:${m.id}:related`, label: "Link to the related lesson", def: m.en.relatedLabel },
      ],
    })),
  });

  groups.push({
    id: "home",
    title: "Home page: What you'll learn",
    text: "The heading and the four river cards on the home page.",
    subgroups: [
      {
        title: "What you'll learn",
        items: (["learn.title", "learn.sub", "learn.1", "learn.2", "learn.3", "learn.4"] as const).map((k) => ({
          key: `home:${k}`,
          label: k === "learn.title" ? "Heading" : k === "learn.sub" ? "Line under the heading" : `River ${k.slice(-1)} card`,
          def: en[k],
          rows: k.length > 7 ? 3 : 1,
        })),
      },
    ],
  });

  groups.push({
    id: "workshop",
    title: "Discovery workshop",
    text: "The wording of the six steps and the text around them (and on the meeting PDF).",
    subgroups: [
      {
        title: "Around the workshop",
        items: [
          { key: "workshop:intro", label: "Introduction", def: WORKSHOP_TEXT.intro, rows: 3 },
          { key: "workshop:agreementIntro", label: "Agreement: introduction", def: WORKSHOP_TEXT.agreementIntro, rows: 3 },
          { key: "workshop:agreementConsent", label: "Agreement: confirmation box", def: WORKSHOP_TEXT.agreementConsent, rows: 3 },
          { key: "workshop:nextStep", label: "Next-step tools: introduction", def: WORKSHOP_TEXT.nextStep, rows: 2 },
          { key: "workshop:pdfIntro", label: "Meeting PDF: introduction", def: WORKSHOP_TEXT.pdfIntro, rows: 3 },
          { key: "workshop:disclaimer", label: "Education-only line", def: WORKSHOP_TEXT.disclaimer, rows: 2 },
        ],
      },
      ...WORKSHOP_STEPS.map((st, i) => ({
        title: `Step ${i + 1}: ${st.title}`,
        items: [
          { key: `workshop:step:${st.id}:title`, label: "Step name", def: st.title },
          { key: `workshop:step:${st.id}:prompt`, label: "The question to ask", def: st.prompt, rows: 3 },
          ...(st.id === "swot" ? SWOT_GRID.map((g): CopyItem => ({ key: `workshop:swot:${g.id}`, label: `${g.label}: box name`, def: g.label })) : []),
          ...st.fields.flatMap((f): CopyItem[] => [
            { key: `workshop:field:${f.key}:label`, label: `Box: ${f.label}`, def: f.label },
            ...(f.hint ? [{ key: `workshop:field:${f.key}:hint`, label: `Box hint: ${f.label}`, def: f.hint, rows: 2 }] : []),
          ]),
        ],
      })),
      { title: "Topics to choose from", items: TOPICS.map((t) => ({ key: `workshop:topic:${t.id}`, label: "Topic", def: t.label })) },
    ],
  });

  const toolSubgroups = SECTIONS.map((sec) => ({
    title: `${sec.title}: its tools`,
    items: sec.tools.flatMap((id): CopyItem[] => {
      const spec = SPECS[id];
      const notes = spec ? (spec.compute(specDefaults(spec.fields)).notes ?? []) : [...(CUSTOM_NOTES[id as keyof typeof CUSTOM_NOTES] ?? [])];
      return [
        { key: `toolkit:tool:${id}:title`, label: `${CATALOG[id].title}: name`, def: CATALOG[id].title },
        { key: `toolkit:tool:${id}:text`, label: `${CATALOG[id].title}: description`, def: CATALOG[id].text, rows: 2 },
        ...(spec?.intro ?? []).map((p, i): CopyItem => ({ key: `toolkit:intro:${id}:${i}`, label: `${CATALOG[id].title}: introduction ${i + 1}`, def: p, rows: 3 })),
        ...notes.map((n, i): CopyItem => ({ key: `toolkit:note:${id}:${i}`, label: `${CATALOG[id].title}: note ${i + 1}`, def: n, rows: 3 })),
      ];
    }),
  }));
  groups.push({
    id: "toolkit",
    title: "Money toolkit",
    text: "The six sections, thirty-six tools, and the notes and introductions inside them (including the estate planning pages and the meeting PDF).",
    subgroups: [
      {
        title: "Around the toolkit",
        items: [
          { key: "toolkit:page:intro", label: "Introduction", def: TOOLKIT_TEXT.intro, rows: 2 },
          { key: "toolkit:page:disclaimer", label: "Learning-and-planning line", def: TOOLKIT_TEXT.disclaimer, rows: 3 },
        ],
      },
      {
        title: "The six sections",
        items: SECTIONS.flatMap((sec): CopyItem[] => [
          { key: `toolkit:section:${sec.id}:title`, label: `${sec.title}: name`, def: sec.title },
          { key: `toolkit:section:${sec.id}:text`, label: `${sec.title}: description`, def: sec.text, rows: 2 },
        ]),
      },
      ...toolSubgroups,
    ],
  });

  groups.push({
    id: "outreach",
    title: "Outreach guide (English)",
    text: "The one-page guide for churches and campus ministries. Put one list item on each line.",
    subgroups: [
      {
        title: "The guide",
        items: [
          { key: "outreach:title", label: "Title", def: OUTREACH_GUIDE.en.title },
          { key: "outreach:lead", label: "Opening paragraph", def: OUTREACH_GUIDE.en.lead, rows: 3 },
          ...OUTREACH_GUIDE.en.sections.flatMap((s, i): CopyItem[] => [
            { key: `outreach:s${i}:heading`, label: `Section ${i + 1}: heading`, def: s.heading },
            ...(s.text !== undefined ? [{ key: `outreach:s${i}:text`, label: `Section ${i + 1}: text`, def: s.text, rows: 3 }] : []),
            ...(s.items ? [{ key: `outreach:s${i}:items`, label: `Section ${i + 1}: list (one per line)`, def: s.items.join("\n"), rows: 5 }] : []),
          ]),
          { key: "outreach:contact", label: "Line above the contact details", def: OUTREACH_GUIDE.en.contactLine, rows: 2 },
          { key: "outreach:scan", label: "Caption under the QR code", def: OUTREACH_GUIDE.en.scan },
        ],
      },
    ],
  });

  return groups;
}

