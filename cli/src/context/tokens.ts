/**
 * Shared text handling for keyword scoring and the hash embedding provider.
 * Both must see the same terms, otherwise the two signals disagree about what
 * a question is about.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while', 'of', 'at', 'by', 'for',
  'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'once',
  'here', 'there', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
  'just', 'should', 'now', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'doing', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'its',
  'they', 'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am',
  'as', 'until', 'because', 'would', 'could', 'may', 'might', 'shall', 'one', 'also', 'get', 'got',
])

/** Light suffix stripping so "decided" and "decide" count as the same term. */
export function stem(word: string): string {
  if (word.length <= 4) return word
  for (const suffix of ['ations', 'ation', 'ings', 'ing', 'ies', 'ness', 'ed', 'es', 's']) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      const base = word.slice(0, -suffix.length)
      return suffix === 'ies' ? base + 'y' : base
    }
  }
  return word
}

export function terms(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem)
}

export function termFrequencies(text: string): Map<string, number> {
  const freq = new Map<string, number>()
  for (const t of terms(text)) freq.set(t, (freq.get(t) ?? 0) + 1)
  return freq
}

/** The budget unit. A rough, model-independent estimate: four characters per token. */
export const TOKEN_ESTIMATOR = 'chars/4'

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Inverse document frequency over the passages of a set: a term found in most
 * passages ("document", in a documentation set) says little about relevance,
 * a term found in few says a lot.
 */
export function inverseDocumentFrequency(passages: Iterable<string>): (term: string) => number {
  const df = new Map<string, number>()
  let n = 0
  for (const text of passages) {
    n++
    for (const t of new Set(terms(text))) df.set(t, (df.get(t) ?? 0) + 1)
  }
  return (term: string) => Math.log((n + 1) / ((df.get(term) ?? 0) + 1)) + 1
}

/**
 * Keyword relevance of a passage to a question: the IDF-weighted share of the
 * question's distinct terms that appear in the passage, with a small bonus
 * when the whole question appears in the document title.
 */
export function keywordScore(
  questionTerms: string[],
  passageText: string,
  titleText = '',
  tags: string[] = [],
  idf: (term: string) => number = () => 1
): number {
  const distinct = [...new Set(questionTerms)]
  if (distinct.length === 0) return 0
  const haystack = new Set(terms(passageText))
  const titleTerms = new Set(terms(titleText))
  const tagTerms = new Set(tags.flatMap((t) => terms(t)))
  let hit = 0
  let total = 0
  for (const t of distinct) {
    const weight = idf(t)
    total += weight
    if (haystack.has(t) || titleTerms.has(t) || tagTerms.has(t)) hit += weight
  }
  let score = total === 0 ? 0 : hit / total
  if (hit > 0 && distinct.every((t) => titleTerms.has(t))) score = Math.min(1, score + 0.2)
  return score
}
