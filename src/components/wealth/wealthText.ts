/** The wording around Wealth Tools that an admin may reword (Admin, Content). */
export const WEALTH_TEXT = {
  eyebrow: "Daily Bread wealth management track",
  title: "Wealth Tools",
  intro:
    "Take a discovery meeting with a student or client all the way to a walk-through presentation: their plan, the financial model behind it, and the tools for the areas they want to learn about.",
  privacy:
    "Only you can see your clients' plans and numbers. They are kept in your own account and are never shown to group leaders, members, or admins. Get a client's okay before you enter their information.",
  toolkitIntro: "A short summary of every tool you have filled in for this client. Open a section, choose a tool, and put in their numbers.",
} as const;

/** What the saving badge says in each state. */
export const SAVE_TEXT: Record<"idle" | "saving" | "saved" | "error", string> = {
  idle: "Saved to your account as you go",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved yet. Your changes are kept on this device and will save when you are back online.",
};
