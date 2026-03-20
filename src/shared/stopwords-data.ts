/**
 * Pre-built stopword lists for common languages.
 *
 * Each list contains 15-30 high-frequency function words that are
 * typically filtered out during search indexing (articles, prepositions,
 * conjunctions, common pronouns, etc.).
 */

export const COMMON_STOPWORDS: Record<string, string[]> = {
  en: [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'is', 'was', 'are', 'were', 'be',
    'has', 'have', 'had', 'it', 'not', 'this', 'that', 'from',
  ],
  es: [
    'el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'de', 'del',
    'en', 'con', 'por', 'para', 'es', 'son', 'que', 'no', 'se',
    'al', 'lo', 'su', 'como', 'pero', 'más',
  ],
  fr: [
    'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'de', 'du',
    'en', 'dans', 'avec', 'pour', 'par', 'est', 'sont', 'que', 'ne',
    'pas', 'ce', 'se', 'sur', 'au', 'aux',
  ],
  de: [
    'der', 'die', 'das', 'ein', 'eine', 'und', 'oder', 'in', 'von',
    'mit', 'auf', 'für', 'an', 'zu', 'ist', 'sind', 'war', 'den',
    'dem', 'nicht', 'sich', 'es', 'als', 'auch', 'aus',
  ],
  pt: [
    'o', 'a', 'os', 'as', 'um', 'uma', 'e', 'ou', 'de', 'do', 'da',
    'em', 'no', 'na', 'com', 'por', 'para', 'é', 'são', 'que',
    'não', 'se', 'como', 'mais', 'ao',
  ],
};

/**
 * Returns `true` when a pre-built stopword list is available for the given
 * locale code (case-insensitive, uses the first two characters).
 */
export function hasCommonStopwords(locale: string): boolean {
  if (!locale) return false;
  const key = locale.slice(0, 2).toLowerCase();
  return key in COMMON_STOPWORDS;
}
