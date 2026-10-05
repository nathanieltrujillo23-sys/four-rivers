import type { Translation } from "../types";

const KEY = "four-rivers:read-version";
const OPTIONS: Translation[] = ["KJV", "NIV", "ESV", "NLT"];

/** The Bible version this person last chose for group readings (KJV until they pick one). */
export function getReadVersion(): Translation {
  try {
    const v = localStorage.getItem(KEY) as Translation | null;
    return v && OPTIONS.includes(v) ? v : "KJV";
  } catch {
    return "KJV";
  }
}

export function setReadVersion(version: Translation): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    /* storage unavailable: the choice just won't be remembered */
  }
}
