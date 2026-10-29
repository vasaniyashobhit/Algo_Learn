/** "22%", or "under 1%" for a tag that is present but rare. */
export const formatShare = (share) => {
  const percent = Math.round(share * 100);
  return share > 0 && percent === 0 ? 'under 1%' : `${percent}%`;
};

const levelText = (rating, ratingKnown) => (ratingKnown ? 'at your level' : `rated around ${rating}`);

/**
 * Short explanation built from the data, e.g.
 * "You've solved 4 of 11 dp problems; dp shows up in 22% of problems at your level".
 */
export const topicReason = ({ topic, stat, share, rating, ratingKnown }) => {
  const level = `${topic} shows up in ${formatShare(share)} of problems ${levelText(rating, ratingKnown)}`;
  if (!stat?.attempted) return `New topic for you: ${level}`;
  return `You've solved ${stat.solved} of ${stat.attempted} ${topic} problems; ${level}`;
};
