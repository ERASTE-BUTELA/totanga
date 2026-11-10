export const LOGIN_REFUSED = "Identifiant ou mot de passe incorrect."
export const LOGIN_LOCKED = "Trop de tentatives de connexion. Réessayez plus tard."
export const LOGIN_FAILED = "La connexion n'a pas abouti. Réessayez."
export const SESSION_EXPIRED = "Votre session a expiré. Connectez-vous à nouveau."

export function loginError(status) {
  if (status === 401) return LOGIN_REFUSED
  if (status === 429) return LOGIN_LOCKED
  return LOGIN_FAILED
}
