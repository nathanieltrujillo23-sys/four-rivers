import type { Profile } from "../types";

/** The name printed on the certificate: the full name, else the preferred name, else the email. */
export function certificateName(profile: Pick<Profile, "fullName" | "displayName">, email?: string | null): string {
  return profile.fullName?.trim() || profile.displayName?.trim() || email || "Four Rivers Learner";
}
