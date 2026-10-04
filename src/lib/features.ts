/**
 * Feature switches. The journal is cached (hidden, not deleted): its page,
 * hook, table, and repository methods are all still in place, so turning
 * this on restores it exactly as it was. It was set aside because it pulled
 * attention from the course itself; Small Groups took its slot in the header.
 */
export const FEATURES = {
  journal: false,
  /**
   * Cached like the journal: the per-lesson discussion guides (content/groupGuides)
   * are written and translated but not shown. Community is about interaction,
   * not more teaching. Nothing links to them while this is false.
   */
  groupGuides: false,
} as const;
