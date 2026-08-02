/**
 * Extract the first JSON object from an LLM reply — tolerates ```json fences
 * or stray prose around the object. Throws if no object is found.
 */
export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object found in reply');
  return JSON.parse(text.slice(start, end + 1));
}
