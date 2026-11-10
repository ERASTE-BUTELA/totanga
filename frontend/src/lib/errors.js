export const USER_FACING_ERROR_MESSAGE =
  "Le contenu ne peut pas être affiché pour le moment. Réessayez plus tard."

export function userFacingError() {
  return new Error(USER_FACING_ERROR_MESSAGE)
}
