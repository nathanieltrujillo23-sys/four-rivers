/**
 * LinkedIn's "Add to profile" link for the certificate (Update 42): it opens the person's profile with the
 * Licenses & certifications form already filled in (name, issuer, month and year, credential ID and the public
 * verification link). No LinkedIn app or key is needed; the person reviews and saves it themselves.
 */
export const CERT_NAME = "4 Rivers: A Course in Stewardship";
export const CERT_ISSUER = "4 Rivers";

export function linkedInAddToProfile(passedAt: string | null, userId: string, verifyUrl: string): string {
  const d = passedAt ? new Date(passedAt) : new Date();
  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: CERT_NAME,
    organizationName: CERT_ISSUER,
    issueYear: String(d.getFullYear()),
    issueMonth: String(d.getMonth() + 1),
    certUrl: verifyUrl,
    certId: userId.slice(0, 8).toUpperCase(),
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}
