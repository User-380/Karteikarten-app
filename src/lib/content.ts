/**
 * Zerlegt den Text einer Karte in Bausteine:
 *  - normaler Text
 *  - Formel im Text: $ … $
 *  - abgesetzte Formel: $$ … $$
 *  - Bild: ![Beschreibung](media:ID)
 * Ein Dollarzeichen ohne Formel schreibt man als \$.
 */
export type Segment =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; display: boolean }
  | { type: 'image'; id: string; alt: string };

const TOKEN = /\$\$([\s\S]+?)\$\$|\$((?:\\.|[^$\\\n])+?)\$|!\[([^\]]*)\]\(media:([A-Za-z0-9-]+)\)/g;

export function parseContent(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  // \$ vorübergehend durch ein Platzhalterzeichen ersetzen
  const PH = '\u0000';
  const src = text.replace(/\\\$/g, PH);
  const pushText = (s: string) => {
    if (!s) return;
    const value = s.split(PH).join('$');
    const prev = out[out.length - 1];
    if (prev && prev.type === 'text') prev.value += value;
    else out.push({ type: 'text', value });
  };
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(src))) {
    pushText(src.slice(last, m.index));
    if (m[1] !== undefined) out.push({ type: 'math', value: m[1].split(PH).join('\\$').trim(), display: true });
    else if (m[2] !== undefined) out.push({ type: 'math', value: m[2].split(PH).join('\\$'), display: false });
    else out.push({ type: 'image', alt: m[3], id: m[4] });
    last = TOKEN.lastIndex;
  }
  pushText(src.slice(last));
  return out;
}

/** Kurzfassung für Listen: Formeln bleiben als LaTeX, Bilder werden zu [Bild]. */
export function plainPreview(text: string, max = 120): string {
  const s = text
    .replace(/!\[[^\]]*\]\(media:[A-Za-z0-9-]+\)/g, '[Bild]')
    .replace(/\s+/g, ' ')
    .trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}
