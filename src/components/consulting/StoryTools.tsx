import { useState } from "react";
import { CopyButton } from "../community/CopyButton";
import { MAX_DEPTH, TREE_TEMPLATES, checkStory, checkTree, exampleStoryline, newStoryline, newTree, outline, tree, type IssueTree, type Storyline, type TreeNode } from "../../lib/consultingStory";
import { Button } from "../ui/Button";
import { Select, TextArea, TextInput } from "../ui/Field";
import { labelCls } from "../ib/ibParts";
import { Empty, Panel, Tile } from "../wealth/parts";

const iconBtn = "rounded-md border border-line px-2 py-1 font-[family-name:var(--font-ui)] text-xs text-ink-soft transition-colors hover:bg-parchment-deep hover:text-ink disabled:opacity-40";

/* ------------------------------------------------------------------ */
/* Issue tree                                                          */
/* ------------------------------------------------------------------ */

function Branch({ node, depth, index, count, path, t, set }: { node: TreeNode; depth: number; index: number; count: number; path: string; t: IssueTree; set: (t: IssueTree) => void }) {
  const name = node.text.trim() || `branch ${path}`;
  return (
    <li className="flex flex-col gap-2">
      <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-2 py-1.5 ${node.hypothesis ? "border-water-deep bg-parchment-deep" : "border-line"}`}>
        <span aria-hidden="true" className="w-9 shrink-0 font-[family-name:var(--font-ui)] text-xs tabular-nums text-ink-soft">
          {path}
        </span>
        <input
          aria-label={`Branch ${path}`}
          value={node.text}
          maxLength={200}
          placeholder="A part of the question"
          onChange={(e) => set(tree.setText(t, node.id, e.target.value))}
          className="min-w-[160px] flex-1 bg-transparent font-[family-name:var(--font-ui)] text-sm text-ink outline-none placeholder:text-ink-soft/70"
        />
        <div className="flex flex-wrap gap-1">
          <button type="button" className={iconBtn} aria-pressed={node.hypothesis} aria-label={`Test first: ${name}`} onClick={() => set(tree.toggleHypothesis(t, node.id))}>
            {node.hypothesis ? "Testing first" : "Test first"}
          </button>
          <button type="button" className={iconBtn} disabled={depth >= MAX_DEPTH} aria-label={`Add a sub-branch under ${name}`} onClick={() => set(tree.addChild(t, node.id))}>
            + Sub-branch
          </button>
          <button type="button" className={iconBtn} aria-label={`Add a branch beside ${name}`} onClick={() => set(tree.addSibling(t, node.id))}>
            + Beside
          </button>
          <button type="button" className={iconBtn} disabled={index === 0} aria-label={`Move ${name} up`} onClick={() => set(tree.move(t, node.id, -1))}>
            Up
          </button>
          <button type="button" className={iconBtn} disabled={index === count - 1} aria-label={`Move ${name} down`} onClick={() => set(tree.move(t, node.id, 1))}>
            Down
          </button>
          <button type="button" className={iconBtn} aria-label={`Remove ${name}`} onClick={() => set(tree.remove(t, node.id))}>
            Remove
          </button>
        </div>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-5 flex flex-col gap-2 border-l border-line pl-4">
          {node.children.map((c, i) => (
            <Branch key={c.id} node={c} depth={depth + 1} index={i} count={node.children.length} path={`${path}.${i + 1}`} t={t} set={set} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Break a question into parts that do not overlap and leave nothing out, and mark where you would start. */
export function IssueTreeTab({ trees, onChange }: { trees: IssueTree[]; onChange: (trees: IssueTree[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(trees[0]?.id ?? null);
  const [template, setTemplate] = useState(0);
  const current = trees.find((x) => x.id === openId) ?? null;
  const set = (next: IssueTree) => onChange(trees.map((x) => (x.id === next.id ? next : x)));
  const add = () => {
    const made = newTree(template);
    onChange([made, ...trees].slice(0, 20));
    setOpenId(made.id);
  };
  const check = current ? checkTree(current) : null;
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Issue trees" subtitle="Split the client's question into branches that do not overlap and together cover everything, then split each branch again. Mark the branch you would test first: that is your hypothesis.">
        <div className="flex flex-wrap items-end gap-3">
          <label className={labelCls}>
            Start from
            <Select value={String(template)} onChange={(e) => setTemplate(Number(e.target.value))}>
              {TREE_TEMPLATES.map((tpl, i) => (
                <option key={tpl.name} value={i}>
                  {tpl.name}
                </option>
              ))}
            </Select>
          </label>
          <Button onClick={add} disabled={trees.length >= 20}>
            New issue tree
          </Button>
          {trees.length > 0 && (
            <label className={labelCls}>
              Open
              <Select aria-label="Open an issue tree" value={openId ?? ""} onChange={(e) => setOpenId(e.target.value)}>
                {trees.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title || "Untitled"}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
      </Panel>
      {!current || !check ? (
        <Empty>No issue trees yet. Start one from a template above.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Panel
            title="The tree"
            actions={
              <div className="flex flex-wrap gap-2">
                <CopyButton text={outline(current)} label="Copy as an outline" />
                <Button
                  variant="ghost"
                  onClick={() => {
                    const rest = trees.filter((x) => x.id !== current.id);
                    onChange(rest);
                    setOpenId(rest[0]?.id ?? null);
                  }}
                >
                  Delete this tree
                </Button>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
              <label className={labelCls}>
                Name
                <TextInput value={current.title} maxLength={120} onChange={(e) => set({ ...current, title: e.target.value })} />
              </label>
              <label className={labelCls}>
                The question at the top
                <TextInput value={current.question} maxLength={300} placeholder="What is the client asking?" onChange={(e) => set({ ...current, question: e.target.value })} />
              </label>
            </div>
            <ul className="flex flex-col gap-2">
              {current.branches.map((b, i) => (
                <Branch key={b.id} node={b} depth={1} index={i} count={current.branches.length} path={String(i + 1)} t={current} set={set} />
              ))}
            </ul>
            <div>
              <Button variant="secondary" onClick={() => set(tree.addTop(current))}>
                Add a top-level branch
              </Button>
            </div>
          </Panel>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Tile label="Top branches" value={String(check.branches)} sub="aim for two to four" />
              <Tile label="Levels" value={String(check.depth)} sub={`up to ${MAX_DEPTH}`} />
              <Tile label="End points" value={String(check.leaves)} sub="things you could test" />
              <Tile label="Testing first" value={String(check.hypotheses)} sub="your hypothesis" tone={check.hypotheses ? "good" : undefined} />
            </div>
            <Panel title="Look again at" headingLevel={4}>
              <ul className="flex list-disc flex-col gap-2 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                {check.prompts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Storyline                                                           */
/* ------------------------------------------------------------------ */

/** The answer first, then three reasons, then what to do: written here, exported as a three-slide recommendation. */
export function StorylineTab({ stories, onChange }: { stories: Storyline[]; onChange: (stories: Storyline[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(stories[0]?.id ?? null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const s = stories.find((x) => x.id === openId) ?? null;
  const set = (patch: Partial<Storyline>) => s && onChange(stories.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
  const add = (made: Storyline) => {
    onChange([made, ...stories].slice(0, 20));
    setOpenId(made.id);
    setState("idle");
  };
  const check = s ? checkStory(s) : null;
  const list = (key: "risks" | "next", i: number, v: string) => s && set({ [key]: s[key].map((x, k) => (k === i ? v : x)) });

  async function download() {
    if (!s) return;
    setState("busy");
    try {
      const { buildRecommendation } = await import("../../lib/consultingDeck");
      const { pres, filename } = await buildRecommendation(s);
      await pres.writeFile({ fileName: filename });
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Storylines" subtitle="A recommendation leads with the answer. Write the answer, the three reasons that support it, and what happens next, then download it as three slides whose titles tell the story on their own.">
        <div className="flex flex-wrap items-end gap-3">
          <Button onClick={() => add(newStoryline())} disabled={stories.length >= 20}>
            New storyline
          </Button>
          <Button variant="secondary" onClick={() => add(exampleStoryline())} disabled={stories.length >= 20}>
            See an example
          </Button>
          {stories.length > 0 && (
            <label className={labelCls}>
              Open
              <Select aria-label="Open a storyline" value={openId ?? ""} onChange={(e) => { setOpenId(e.target.value); setState("idle"); }}>
                {stories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title || "Untitled"}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>
      </Panel>
      {!s || !check ? (
        <Empty>No storylines yet. Start a new one, or open the example to see the shape.</Empty>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="flex min-w-0 flex-col gap-6">
            <Panel title="The setup" subtitle="Three short sentences. They sit beside the answer on slide 1, in case someone asks how you got here.">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelCls}>
                  Name of this storyline
                  <TextInput value={s.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} />
                </label>
                <label className={labelCls}>
                  Client (invented or anonymized)
                  <TextInput value={s.client} maxLength={120} onChange={(e) => set({ client: e.target.value })} />
                </label>
              </div>
              <label className={labelCls}>
                Situation: what is true and not in dispute
                <TextArea rows={2} maxLength={600} value={s.situation} onChange={(e) => set({ situation: e.target.value })} />
              </label>
              <label className={labelCls}>
                Complication: what changed or went wrong
                <TextArea rows={2} maxLength={600} value={s.complication} onChange={(e) => set({ complication: e.target.value })} />
              </label>
              <label className={labelCls}>
                Question: what the client is asking
                <TextInput value={s.question} maxLength={300} onChange={(e) => set({ question: e.target.value })} />
              </label>
            </Panel>
            <Panel title="Slide 1: the answer" subtitle="One sentence that says what the client should do and what it is worth. It is the title of the first slide.">
              <label className={labelCls}>
                The answer
                <TextArea rows={2} maxLength={400} value={s.answer} placeholder="The client should ... , which ..." onChange={(e) => set({ answer: e.target.value })} />
              </label>
            </Panel>
            <Panel title="Slide 2: the three reasons" subtitle="Each reason is a sentence that could be true or false, with the facts behind it and the chart that would prove it.">
              <label className={labelCls}>
                Title of slide 2 (a full sentence that sums up the evidence)
                <TextArea rows={2} maxLength={300} value={s.evidenceTitle} onChange={(e) => set({ evidenceTitle: e.target.value })} />
              </label>
              <ol className="grid gap-4 lg:grid-cols-3">
                {s.arguments.map((a, i) => {
                  const setArg = (patch: Partial<typeof a>) => set({ arguments: s.arguments.map((x) => (x.id === a.id ? { ...x, ...patch } : x)) });
                  return (
                    <li key={a.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                      <label className={labelCls}>
                        Reason {i + 1}
                        <TextArea rows={3} maxLength={300} value={a.claim} onChange={(e) => setArg({ claim: e.target.value })} />
                      </label>
                      {a.support.map((x, k) => (
                        <label key={k} className={labelCls}>
                          <span className="sr-only">
                            Reason {i + 1}, fact {k + 1}
                          </span>
                          <TextArea rows={2} aria-label={`Reason ${i + 1}, fact ${k + 1}`} value={x} maxLength={200} placeholder={k === 0 ? "A fact or analysis behind it" : ""} onChange={(e) => setArg({ support: a.support.map((y, m) => (m === k ? e.target.value : y)) })} />
                        </label>
                      ))}
                      <label className={labelCls}>
                        The exhibit that would prove it
                        <TextArea rows={2} value={a.exhibit} maxLength={200} placeholder="e.g. Bar chart: profit by store" onChange={(e) => setArg({ exhibit: e.target.value })} />
                      </label>
                    </li>
                  );
                })}
              </ol>
            </Panel>
            <Panel title="Slide 3: risks and next steps">
              <label className={labelCls}>
                Title of slide 3 (a full sentence)
                <TextArea rows={2} maxLength={300} value={s.nextTitle} onChange={(e) => set({ nextTitle: e.target.value })} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="flex flex-col gap-2">
                  <legend className="font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">Risks, and how you would handle each</legend>
                  {s.risks.map((x, i) => (
                    <TextInput key={i} aria-label={`Risk ${i + 1}`} value={x} maxLength={200} onChange={(e) => list("risks", i, e.target.value)} />
                  ))}
                </fieldset>
                <fieldset className="flex flex-col gap-2">
                  <legend className="font-[family-name:var(--font-ui)] text-xs font-medium text-ink-soft">Next steps: who does what, by when</legend>
                  {s.next.map((x, i) => (
                    <TextInput key={i} aria-label={`Next step ${i + 1}`} value={x} maxLength={200} onChange={(e) => list("next", i, e.target.value)} />
                  ))}
                </fieldset>
              </div>
            </Panel>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Panel title="Read only the titles" subtitle="If these three sentences tell the story, the deck works." headingLevel={4}>
              <ol className="flex list-decimal flex-col gap-2 pl-5 font-[family-name:var(--font-display)] text-base text-ink">
                {check.titles.map((t, i) => (
                  <li key={i} className={t ? "" : "text-ink-soft"}>
                    {t || "(no title yet)"}
                  </li>
                ))}
              </ol>
            </Panel>
            <Panel title="Look again at" headingLevel={4}>
              <ul className="flex list-disc flex-col gap-2 pl-5 font-[family-name:var(--font-ui)] text-sm text-ink">
                {check.prompts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Panel>
            <div className="flex flex-col gap-2">
              <Button onClick={download} disabled={state === "busy" || !check.ready}>
                {state === "busy" ? "Building the slides…" : "Download the three slides (PowerPoint)"}
              </Button>
              <p role="status" className="font-[family-name:var(--font-ui)] text-xs text-ink-soft">
                {state === "done" ? "Downloaded. Each slide has speaker notes." : state === "error" ? "The slides could not be made. Try again." : !check.ready ? "Write the answer, at least two reasons, and the titles of slides 2 and 3 first." : ""}
              </p>
              <Button
                variant="ghost"
                onClick={() => {
                  const rest = stories.filter((x) => x.id !== s.id);
                  onChange(rest);
                  setOpenId(rest[0]?.id ?? null);
                }}
              >
                Delete this storyline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
