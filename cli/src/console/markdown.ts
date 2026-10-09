/**
 * Markdown to HTML for the console's reader — small, and safe by
 * construction: every character of the source is escaped first, and the only
 * markup in the result is what this file writes. A document cannot put a tag,
 * an attribute or a script into the console.
 *
 * Links to other Markdown files are resolved against the document's folder and
 * carry `data-doc` so the console can open them; http(s) and mailto links open
 * in a new tab; any other scheme is dropped and shown as text.
 */
import { posix } from 'path'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** The text, escaped, with inline code, bold, italics and links turned into markup. */
function inline(text: string, from: string): string {
  // code spans first, set aside so nothing inside them is touched
  const codes: string[] = []
  let s = text.replace(/`([^`]+)`/g, (_, c: string) => `\u0000${codes.push(`<code>${escape(c)}</code>`) - 1}\u0000`)
  s = escape(s)
  s = s.replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (_, label: string, href: string) => {
    const raw = href.replace(/&amp;/g, '&')
    if (/^(https?:|mailto:)/i.test(raw)) return `<a href="${escape(raw)}" target="_blank" rel="noopener noreferrer">${label}</a>`
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return label
    const [file, anchor] = raw.split('#') as [string, string | undefined]
    if (file.endsWith('.md')) {
      const doc = posix.normalize(posix.join(posix.dirname(from), file))
      return `<a href="#" data-doc="${escape(doc)}"${anchor ? ` data-anchor="${escape(anchor)}"` : ''}>${label}</a>`
    }
    return label
  })
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]!)
}

const slug = (s: string) => s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')

/** The body of a document as HTML; frontmatter is not content and is left out. */
export function renderMarkdown(source: string, from: string): string {
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
  const lines = body.split(/\r?\n/)
  const out: string[] = []
  let i = 0
  const para: string[] = []
  const flush = () => { if (para.length) { out.push(`<p>${inline(para.join(' '), from)}</p>`); para.length = 0 } }

  while (i < lines.length) {
    const line = lines[i]!
    const fence = /^```\s*([\w-]*)/.exec(line)
    if (fence) {
      flush()
      const code: string[] = []
      for (i++; i < lines.length && !/^```/.test(lines[i]!); i++) code.push(lines[i]!)
      i++
      out.push(`<pre><code${fence[1] ? ` data-lang="${escape(fence[1])}"` : ''}>${escape(code.join('\n'))}\n</code></pre>`)
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      const n = heading[1]!.length
      out.push(`<h${n} id="${escape(slug(heading[2]!))}">${inline(heading[2]!, from)}</h${n}>`)
      i++
      continue
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { flush(); out.push('<hr>'); i++; continue }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1]!)) {
      flush()
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const head = cells(line)
      out.push('<table><thead><tr>' + head.map((c) => `<th>${inline(c, from)}</th>`).join('') + '</tr></thead><tbody>')
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]!); i++) {
        out.push('<tr>' + cells(lines[i]!).map((c) => `<td>${inline(c, from)}</td>`).join('') + '</tr>')
      }
      out.push('</tbody></table>')
      continue
    }
    const item = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(line)
    if (item) {
      flush()
      const ordered = /\d/.test(item[2]!)
      out.push(ordered ? '<ol>' : '<ul>')
      for (; i < lines.length; i++) {
        const m = /^(\s*)([-*+]|\d+\.)\s+(.*)$/.exec(lines[i]!)
        if (!m) break
        out.push(`<li>${inline(m[3]!.replace(/^\[([ xX])\]\s+/, (_, c: string) => (c.trim() ? '☑ ' : '☐ ')), from)}</li>`)
      }
      out.push(ordered ? '</ol>' : '</ul>')
      continue
    }
    if (/^>\s?/.test(line)) {
      flush()
      const quote: string[] = []
      for (; i < lines.length && /^>\s?/.test(lines[i]!); i++) quote.push(lines[i]!.replace(/^>\s?/, ''))
      out.push(`<blockquote>${inline(quote.join(' '), from)}</blockquote>`)
      continue
    }
    if (!line.trim()) { flush(); i++; continue }
    para.push(line.trim())
    i++
  }
  flush()
  return out.join('\n')
}
