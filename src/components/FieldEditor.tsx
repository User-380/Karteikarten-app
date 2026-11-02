import { useRef, useState, type ClipboardEvent } from 'react';
import { addMedia } from '../lib/db';
import { prepareImage } from '../lib/image';
import { CardContent } from './CardContent';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}

/** Textfeld mit Knöpfen für Formeln/Bilder und Live-Vorschau. */
export function FieldEditor({ id, label, value, onChange, autoFocus }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  /** Text an der Cursor-Position einfügen; `cursorOffset` = Cursor danach relativ zum Einfügebeginn */
  function insert(text: string, cursorOffset = text.length) {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + cursorOffset;
    });
  }

  function wrapMath(open: string, close: string) {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    insert(open + selected + close, open.length + selected.length);
  }

  async function addImages(files: Iterable<File>) {
    setBusy(true);
    try {
      let text = '';
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        const id = await addMedia(await prepareImage(f));
        text += `\n![](media:${id})\n`;
      }
      if (text) insert(text);
    } catch (err) {
      alert(`Bild konnte nicht eingefügt werden: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function onPaste(e: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      void addImages(files);
    }
  }

  return (
    <div className="field-editor">
      <label htmlFor={id}>{label}</label>
      <div className="toolbar">
        <button type="button" className="btn-small" onClick={() => wrapMath('$', '$')} title="Formel im Text">
          $x$
        </button>
        <button type="button" className="btn-small" onClick={() => wrapMath('\n$$\n', '\n$$\n')} title="Formel als eigene Zeile">
          $$ Block
        </button>
        <button type="button" className="btn-small" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? 'Lädt …' : '🖼 Bild'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addImages(Array.from(e.target.files));
            e.target.value = '';
          }}
        />
      </div>
      <textarea
        id={id}
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        spellCheck={false}
      />
      {value.trim() && (
        <div className="preview">
          <div className="preview-label muted small">Vorschau</div>
          <CardContent text={value} />
        </div>
      )}
    </div>
  );
}
