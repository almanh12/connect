/**
 * User-generated content: prefer React rendering (react-markdown) over raw HTML.
 * Never use dangerouslySetInnerHTML with unsanitized user input.
 * For plain text snippets, strip angle brackets to reduce accidental HTML injection in rare edge cases.
 */
export function escapeHtmlLike(text: string, maxLen = 50_000): string {
  const t = text.length > maxLen ? text.slice(0, maxLen) : text;
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
