/**
 * Mini-Router über den Teil der URL nach dem „#“ (z. B. #/deck/123).
 * Vorteil: funktioniert offline und auf jedem einfachen Webserver.
 */
import { useEffect, useState } from 'react';

function current(): string[] {
  return location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string): void {
  location.hash = path.startsWith('#') ? path : `#${path}`;
}

/** Wert eines Parameters hinter „?“ im Hash, z. B. #/card/new?deck=abc */
export function hashParam(name: string): string | null {
  const q = location.hash.split('?')[1];
  return q ? new URLSearchParams(q).get(name) : null;
}
