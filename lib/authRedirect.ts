/** URL de redirect para e-mails do Supabase Auth (compatível com HashRouter). */
export function getAuthRedirectUrl(route: string): string {
  const path = route.startsWith('/') ? route : `/${route}`;
  return `${window.location.origin}/#${path}`;
}
