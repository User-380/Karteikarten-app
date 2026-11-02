import katex from 'katex';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { parseContent } from '../lib/content';
import { db } from '../lib/db';

/** Zeigt den Text einer Kartenseite mit Formeln (KaTeX) und Bildern an. */
export function CardContent({ text }: { text: string }) {
  const segments = useMemo(() => parseContent(text), [text]);
  return (
    <div className="content">
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
        if (seg.type === 'image') return <MediaImage key={i} id={seg.id} alt={seg.alt} />;
        return <Math key={i} tex={seg.value} display={seg.display} />;
      })}
    </div>
  );
}

function Math({ tex, display }: { tex: string; display: boolean }) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false, // Tippfehler werden rot angezeigt statt die App zu stoppen
        strict: 'ignore',
        output: 'html',
      }),
    [tex, display],
  );
  return <span className={display ? 'math-display' : 'math-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
}

function MediaImage({ id, alt }: { id: string; alt: string }) {
  const item = useLiveQuery(() => db.media.get(id), [id], null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!item) return;
    const u = URL.createObjectURL(item.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [item]);
  if (item === undefined) return <span className="img-missing">[Bild fehlt]</span>;
  if (!url) return <span className="img-loading" />;
  return <img className="card-img" src={url} alt={alt || 'Bild'} />;
}
