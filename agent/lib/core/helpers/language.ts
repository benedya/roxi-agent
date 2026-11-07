/** The language fixed bot texts are written in, and the fallback when a user's language is unknown. */
export const DEFAULT_LANGUAGE = "en";

/** The lowercase primary language of an IETF tag (pt-BR becomes pt), or null when it isn't one. */
export function normalizeLanguageCode(code: string | null | undefined): string | null {
  const primary = code?.trim().toLowerCase().split(/[-_]/u)[0];

  return primary && /^[a-z]{2,3}$/u.test(primary) ? primary : null;
}
