/** URL de redirect para e-mails do Supabase Auth (compatível com HashRouter). */
export function getAuthRedirectUrl(route: string): string {
  return `${window.location.origin}/#${route}`;
}
