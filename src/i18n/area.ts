/**
 * One area's strings, English and Spanish side by side. The Spanish object is
 * typed from the English keys, so adding a string in one language and not the
 * other fails type-checking instead of showing a blank label.
 */
export function area<E extends Record<string, string>>(en: E, es: Record<keyof E, string>) {
  return { en, es };
}
