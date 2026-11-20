/**
 * Serialize structured data for a `<script type="application/ld+json">` tag.
 *
 * `JSON.stringify` alone can emit `</script>` (from a product name, for
 * example), which ends the script element early and turns data into markup.
 * Escaping `<` as `\u003c` keeps the payload valid JSON while making that
 * impossible (SEC-4).
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
