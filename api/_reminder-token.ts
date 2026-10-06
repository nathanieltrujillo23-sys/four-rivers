import { createHmac, timingSafeEqual } from "node:crypto";

export type UnsubscribeKind = "reminders" | "digest" | "announce";

/** A link-safe proof that an unsubscribe request came from an email we sent to this person. */
export function unsubscribeToken(userId: string, secret: string, kind: UnsubscribeKind = "reminders"): string {
  const label = kind === "digest" ? "unsubscribe-digest" : kind === "announce" ? "unsubscribe-announce" : "unsubscribe";
  return createHmac("sha256", secret).update(`${label}:${userId}`).digest("hex");
}

export function validUnsubscribeToken(
  userId: string,
  token: string,
  secret: string,
  kind: UnsubscribeKind = "reminders",
): boolean {
  const expected = Buffer.from(unsubscribeToken(userId, secret, kind));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
