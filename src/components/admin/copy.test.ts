import { afterEach, describe, expect, it } from "vitest";
import { MOMENTS, momentWithCopy } from "../../content/moments";
import { OUTREACH_GUIDE, guideWithCopy } from "../../content/outreachGuide";
import { copyText, setCopyOverridesForTests } from "../../lib/copy";
import { isToolId } from "../community/workshop/toolCatalog";
import { summarizeTool } from "../community/workshop/toolSummaries";
import { swotGrid, workshopSteps, topicLabel, TOPICS } from "../community/workshop/workshopContent";
import { buildCopyRegistry } from "./copyRegistry";

afterEach(() => setCopyOverridesForTests({}));

const only = (key: string) => (k: string, f: string) => (k === key ? `EDITED<${key}>` : f);

describe("editable text", () => {
  const groups = buildCopyRegistry();
  const items = groups.flatMap((g) => g.subgroups.flatMap((sg) => sg.items));

  it("lists several hundred pieces of text, each with its own key and some wording", () => {
    expect(items.length).toBeGreaterThan(300);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    for (const i of items) {
      expect(i.def.trim().length, i.key).toBeGreaterThan(0);
      expect(i.label.trim().length, i.key).toBeGreaterThan(0);
    }
  });

  it("covers the six areas of new text", () => {
    expect(groups.map((g) => g.id)).toEqual(["explanations", "moments", "home", "workshop", "toolkit", "outreach"]);
  });

  it("changes what is shown, for every item that has a place on screen or in the PDF", () => {
    let checked = 0;
    for (const item of items) {
      const copy = only(item.key);
      const [kind, a, b] = item.key.split(":");
      let shown: string | null = null;
      if (kind === "moment") shown = JSON.stringify(momentWithCopy(a, MOMENTS.find((m) => m.id === a)!.en, copy));
      else if (kind === "outreach") shown = JSON.stringify(guideWithCopy(OUTREACH_GUIDE.en, copy));
      else if (kind === "workshop" && ["step", "field", "swot"].includes(a)) shown = JSON.stringify([workshopSteps(copy), swotGrid(copy)]);
      else if (kind === "workshop" && a === "topic") shown = TOPICS.map((t) => topicLabel(t, copy)).join("|");
      else if (kind === "toolkit" && (a === "tool" && b && isToolId(b) && item.key.endsWith(":title"))) shown = JSON.stringify(summarizeTool(b, undefined, copy));
      else if (kind === "toolkit" && a === "note" && b && isToolId(b)) shown = JSON.stringify(summarizeTool(b, undefined, copy));
      if (shown === null) continue; // these are checked on screen, in the browser tests
      expect(shown, item.key).toContain(`EDITED<${item.key}>`);
      checked++;
    }
    expect(checked).toBeGreaterThan(150);
  });

  it("splits a reworded moment body and guide list back into paragraphs and lines", () => {
    const m = momentWithCopy("buying-a-car", MOMENTS.find((x) => x.id === "buying-a-car")!.en, (k, f) => (k.endsWith(":s0:body") ? "One.\n\nTwo.\n\n\nThree." : f));
    expect(m.sections[0].body).toEqual(["One.", "Two.", "Three."]);
    const g = guideWithCopy(OUTREACH_GUIDE.en, (k, f) => (k === "outreach:s0:items" ? "a\nb\n\nc" : f));
    expect(g.sections[0].items).toEqual(["a", "b", "c"]);
  });

  it("uses the shipped wording until something is reworded, and the new wording after", () => {
    expect(copyText("moment:x:title", "Original")).toBe("Original");
    setCopyOverridesForTests({ "moment:x:title": "Reworded" });
    expect(copyText("moment:x:title", "Original")).toBe("Reworded");
  });
});
