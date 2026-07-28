/** How long an email-verification or password-reset token stays valid. */
export const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** bcrypt cost factor used for both signup and password-reset hashing. */
export const BCRYPT_SALT_ROUNDS = 10;
