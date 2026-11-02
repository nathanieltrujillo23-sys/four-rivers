/** Case frameworks, story prompts, and the recruiting checklist for Consulting Tools. General, widely taught structures for practice. */

export interface Framework {
  id: string;
  name: string;
  when: string;
  /** Each bucket and the questions inside it. */
  structure: { head: string; items: string[] }[];
  clarify: string[];
  pitfalls: string[];
  drill: string;
}

export const FRAMEWORKS: Framework[] = [
  {
    id: "profit",
    name: "Profitability",
    when: "A company's profits have fallen, or a client wants to improve them.",
    structure: [
      { head: "Revenue", items: ["Price (changed? vs competitors?)", "Volume (customers, units per customer)", "Mix (which products or segments)"] },
      { head: "Costs", items: ["Variable costs (materials, labor per unit, shipping)", "Fixed costs (rent, salaries, overhead)", "What changed, and when"] },
      { head: "Diagnose", items: ["Is it the company, the industry, or both?", "Which product, region or customer segment explains most of the change?", "Is it one-time or structural?"] },
    ],
    clarify: ["How is profit defined and over what period?", "Since when has it fallen, and by how much?", "Is the whole industry affected?"],
    pitfalls: ["Listing buckets without a hypothesis", "Forgetting to compare with competitors and the industry", "Not narrowing from the total to the specific cause"],
    drill: "A regional grocery chain's profits fell 20% over two years. How would you find out why?",
  },
  {
    id: "entry",
    name: "Market entry",
    when: "A client wants to enter a new market, product or geography.",
    structure: [
      { head: "Market", items: ["Size and growth", "Customer needs and segments", "Profitability of the market"] },
      { head: "Competition", items: ["Who is there, their share and strengths", "Barriers to entry", "How they might react"] },
      { head: "Our ability", items: ["Capabilities and assets that transfer", "Entry mode: build, buy or partner", "Investment and time to break even"] },
      { head: "Risks and decision", items: ["What could go wrong", "Financial return versus alternatives", "Recommendation and next steps"] },
    ],
    clarify: ["Why does the client want to enter now?", "What is the goal: profit, share, strategic position?", "Any constraints on budget or time?"],
    pitfalls: ["Only sizing the market and not the ability to win", "Ignoring how competitors will respond", "No clear recommendation"],
    drill: "A US fitness-apparel brand is considering entering India. Should it?",
  },
  {
    id: "ma",
    name: "Acquisition (M&A)",
    when: "A client is deciding whether to buy a company, or what to pay.",
    structure: [
      { head: "Strategic fit", items: ["Why this target: growth, capability, customers", "Fit with the client's strategy"] },
      { head: "Target's standalone value", items: ["Market, competitive position", "Financial performance and outlook"] },
      { head: "Synergies", items: ["Cost synergies", "Revenue synergies", "Cost and risk of integration"] },
      { head: "Price and deal", items: ["Valuation versus what it is worth to us", "Financing", "Alternatives to buying"] },
    ],
    clarify: ["What is the objective of the acquisition?", "Is there a competing bidder or a deadline?", "How will it be paid for?"],
    pitfalls: ["Overstating synergies", "Forgetting integration risk", "Not comparing with building or partnering"],
    drill: "A regional bank wants to buy a fintech startup. Walk me through your recommendation.",
  },
  {
    id: "pricing",
    name: "Pricing",
    when: "A client is launching a product or reconsidering its price.",
    structure: [
      { head: "Cost", items: ["Unit cost and the floor it sets", "Fixed cost recovery"] },
      { head: "Customer", items: ["Value to the customer and willingness to pay", "Segments with different sensitivity"] },
      { head: "Competition", items: ["Competitors' prices and substitutes", "Positioning"] },
      { head: "Strategy", items: ["Goal: volume, margin, share", "Pricing model: one price, tiers, subscription", "Test and monitor"] },
    ],
    clarify: ["Is this a new product or a price change?", "What is the objective?", "What do competitors charge?"],
    pitfalls: ["Cost-plus only, ignoring value", "Not estimating the effect on volume", "No view on testing the price"],
    drill: "A software firm wants to price a new analytics tool. How do you set the price?",
  },
  {
    id: "growth",
    name: "Growth strategy",
    when: "A client wants to grow revenue and asks where to focus.",
    structure: [
      { head: "Current business", items: ["Where growth comes from today", "Which segments are strongest"] },
      { head: "Core growth", items: ["More customers, more per customer, new channels"] },
      { head: "Adjacent growth", items: ["New products, new geographies, new segments"] },
      { head: "Inorganic and priorities", items: ["Acquisitions and partnerships", "Rank options by size, fit, risk and speed"] },
    ],
    clarify: ["What growth target and timeframe?", "What are the constraints on capital or capability?", "Where has growth been coming from?"],
    pitfalls: ["A list of ideas with no prioritization", "Ignoring capabilities", "No sizing of the opportunities"],
    drill: "A national restaurant chain's same-store sales have flattened. Where should it look for growth?",
  },
  {
    id: "cost",
    name: "Cost reduction and operations",
    when: "A client needs to cut costs or fix an operational problem.",
    structure: [
      { head: "Cost structure", items: ["Where the money goes: by category and by unit"] },
      { head: "Process", items: ["Steps, bottlenecks and waste", "Quality and error rates", "Capacity and utilization"] },
      { head: "Levers", items: ["Procurement and suppliers", "Headcount and productivity", "Technology and automation", "Footprint"] },
      { head: "Plan", items: ["Savings and cost to achieve", "Risks to quality or service", "Sequence quick wins first"] },
    ],
    clarify: ["What cost target and by when?", "Which costs are off the table?", "What has been tried?"],
    pitfalls: ["Cutting without considering revenue or quality", "No view on one-time costs", "Generic ideas with no numbers"],
    drill: "A hospital wants to cut operating costs by 10% without hurting patient care. What do you do?",
  },
  {
    id: "newprod",
    name: "New product launch",
    when: "A client wants to launch a product, or decide whether to.",
    structure: [
      { head: "Customer need", items: ["Who has the problem and how big it is", "Willingness to pay"] },
      { head: "Product and market", items: ["How it differs from alternatives", "Market size and growth"] },
      { head: "Go-to-market", items: ["Channels, pricing and promotion", "Capability and resources needed"] },
      { head: "Economics", items: ["Revenue and cost forecast", "Investment, break-even and risks"] },
    ],
    clarify: ["Is the product built or an idea?", "Who is the target customer?", "What does success look like?"],
    pitfalls: ["Falling in love with the product", "Skipping the economics", "No plan to test"],
    drill: "A beverage company is thinking of launching a protein drink for older adults. Walk me through it.",
  },
  {
    id: "turn",
    name: "Turnaround",
    when: "A business is in trouble and needs to be stabilized.",
    structure: [
      { head: "Stabilize", items: ["Cash position and runway", "Immediate cost and cash actions"] },
      { head: "Diagnose", items: ["What went wrong: market, product, cost, management", "Which parts of the business are worth saving"] },
      { head: "Fix", items: ["Cut or fix the unprofitable parts", "Rebuild the core"] },
      { head: "Rebuild", items: ["Strategy, leadership and a measured plan", "Communication with lenders, staff and customers"] },
    ],
    clarify: ["How long until cash runs out?", "Who are the key stakeholders?", "What is the cause as management sees it?"],
    pitfalls: ["Ignoring cash first", "Treating every part of the business alike", "Not addressing people and communication"],
    drill: "A regional airline is losing money and has six months of cash. What would you do?",
  },
];

export const STORY_PROMPTS: { id: string; theme: string; prompt: string; tip: string }[] = [
  { id: "lead", theme: "Leadership", prompt: "Tell me about a time you led a group to achieve something.", tip: "Situation briefly; spend the time on what you did and the result, with a number if you can." },
  { id: "conflict", theme: "Conflict", prompt: "Tell me about a disagreement with a teammate, and how you resolved it.", tip: "Show you listened and found a path, not that you won." },
  { id: "fail", theme: "Failure", prompt: "Tell me about a time you failed.", tip: "Choose a real one, own it, and say what you changed afterward." },
  { id: "impact", theme: "Impact", prompt: "Tell me about the accomplishment you are proudest of.", tip: "Quantify the result and say what was hard about it." },
  { id: "ambig", theme: "Ambiguity", prompt: "Tell me about a time you had to figure something out with little direction.", tip: "Show how you structured the problem and asked the right questions." },
  { id: "why", theme: "Why consulting", prompt: "Why consulting, and why now?", tip: "Be specific: what you like about the work, what you did to learn about it, and what you want to build." },
];

export const CONSULTING_READINESS: { group: string; items: { id: string; text: string }[] }[] = [
  {
    group: "Case skills",
    items: [
      { id: "structure", text: "I can set up a clear structure for a case in about a minute" },
      { id: "math", text: "I do mental math and percent calculations quickly and accurately" },
      { id: "sizing", text: "I can size a market and sanity-check the answer" },
      { id: "chart", text: "I can read a chart or table and say what matters" },
      { id: "synthesis", text: "I can give a recommendation, the reasons, and the risks, in under a minute" },
    ],
  },
  {
    group: "Practice",
    items: [
      { id: "cases10", text: "I have done at least ten practice cases, with at least three different partners" },
      { id: "feedback", text: "I ask for specific feedback after each case and act on it" },
      { id: "stories", text: "I have a polished story for each of the fit themes" },
    ],
  },
  {
    group: "Network and process",
    items: [
      { id: "club", text: "I am active in a consulting or business club" },
      { id: "calls", text: "I have spoken with at least five people in consulting" },
      { id: "resume", text: "My resume has been reviewed by someone who works in the field" },
      { id: "dates", text: "I have recorded each firm's application dates from its own careers page, with the date I checked" },
    ],
  },
];
