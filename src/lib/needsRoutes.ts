/** Public marketing needs UI lives under `/needs`; authenticated donor portal under `/donor/needs`. */
export function isPublicNeedsPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/needs') return true;
  return pathname.startsWith('/needs/');
}

export function needsBrowsePath(isPublic: boolean): string {
  return isPublic ? '/needs' : '/donor/needs';
}

export function needsDetailPath(id: string | number, isPublic: boolean): string {
  const s = String(id);
  return isPublic ? `/needs/${s}` : `/donor/needs/${s}`;
}

export function needsDonatePath(isPublic: boolean): string {
  return isPublic ? '/login' : '/donor/donate';
}
