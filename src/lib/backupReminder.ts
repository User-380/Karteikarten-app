const KEY = 'lastBackupAt';

export function getLastBackup(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

export function setLastBackup(t = Date.now()): void {
  try {
    localStorage.setItem(KEY, String(t));
  } catch {
    /* egal */
  }
}
