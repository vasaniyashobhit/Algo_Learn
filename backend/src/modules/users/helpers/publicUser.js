const PUBLIC_FIELDS = ['email', 'name', 'cfRating', 'cfMaxRating', 'lastSyncedAt', 'createdAt', 'updatedAt'];

/**
 * The user as clients see it: an explicit whitelist, so passwordHash and internal
 * sync fields (syncLockedUntil, lastSubmissionId) can never leak.
 */
export const toPublicUser = (user) => ({
  id: String(user._id),
  ...Object.fromEntries(PUBLIC_FIELDS.map((field) => [field, user[field] ?? null])),
  cfHandle: user.cfHandle ?? null,
});
