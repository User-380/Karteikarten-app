/**
 * Bilder vor dem Speichern verkleinern, damit die Datenbank (und Backups)
 * klein bleiben. Große Fotos werden auf max. 1600 px verkleinert.
 */
const MAX_SIDE = 1600;
const KEEP_IF_SMALLER = 400 * 1024; // kleine Bilder unverändert lassen

export async function prepareImage(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Das ist keine Bilddatei.');
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Format nicht lesbar – Original verwenden
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= KEEP_IF_SMALLER) {
    bitmap.close();
    return file;
  }
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // transparente Skizzen bekommen weißen Hintergrund
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
  return blob && blob.size < file.size ? blob : file;
}
