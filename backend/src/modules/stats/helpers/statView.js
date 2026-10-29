/** Public shape of a topic stat (no `_id`/`userId`); `tags` lists the key's tag(s). */
export const toTopicStatView = (doc) => ({
  topicKey: doc.topicKey,
  kind: doc.kind,
  tags: doc.topicKey.split('+'),
  attempted: doc.attempted ?? 0,
  solved: doc.solved ?? 0,
  failed: doc.failed ?? 0,
  strength: doc.strength ?? 0,
  comfortRating: doc.comfortRating ?? null,
  avgSolvedRating: doc.avgSolvedRating ?? null,
  maxSolvedRating: doc.maxSolvedRating ?? null,
  lastActivityAt: doc.lastActivityAt ?? null,
});
