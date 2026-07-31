type UserLike = { id: string; is_anonymous?: boolean } | null | undefined;

/**
 * Whether an auth transition is a guest→account upgrade whose local data
 * (chat session, progress, journal drafts) should be merged server-side.
 *
 * The listener previously read the prior user from a stale closure (always
 * null), so email magic-link upgrades — where the listener is the only hook —
 * never merged. Google/Apple flows call merge explicitly, which is why only
 * the magic-link path lost data.
 */
export function shouldMerge(prevUser: UserLike, nextUser: UserLike): boolean {
  if (!nextUser || nextUser.is_anonymous) return false;
  // A fresh sign-in with no prior user still deserves a merge attempt: a
  // guest who never tapped "continue as guest" may still hold local chat and
  // progress under no auth user at all.
  if (!prevUser) return true;
  if (prevUser.is_anonymous) return true;
  // Same signed-in account re-authenticating — nothing to merge.
  return prevUser.id !== nextUser.id;
}
