/**
 * Server component that injects a JSON-LD `<script>` tag.
 *
 * `<` is escaped to `<` in the serialized JSON so a value containing
 * `</script>` can't break out of the script element — the standard Next.js
 * JSON-LD safety measure. The data is built upstream from typed `schema-dts`
 * builders (see `@/lib/seo/jsonld`), so this component stays presentation-only.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
