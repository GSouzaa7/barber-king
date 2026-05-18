/** URL de redirect para e-mails do Supabase Auth.
 * Usa rota intermediária SEM hash para compatibilidade com Supabase Auth.
 * A rota intermediária redireciona para o hash automaticamente.
 */
export function getAuthRedirectUrl(route: string): string {
  // Supabase rejeita URLs com hash — usamos /reset-password sem hash
  return `${window.location.origin}/reset-password`;
}
