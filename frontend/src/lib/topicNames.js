// Short axis labels for long Codeforces tags; tables and tooltips keep the full name.
const SHORT = {
  'constructive algorithms': 'constructive',
  'data structures': 'data struct.',
  'divide and conquer': 'divide & conquer',
  'chinese remainder theorem': 'CRT',
  'expression parsing': 'parsing',
  'string suffix structures': 'suffix structs',
  'graph matchings': 'matchings',
  'meet-in-the-middle': 'meet in middle',
};

export const MAX_AXIS_LABEL = 16;

/** "constructive algorithms" → "constructive"; anything else over 16 characters gets an ellipsis. */
export const shortTopic = (topic = '') => {
  const short = SHORT[topic] ?? topic;
  return short.length > MAX_AXIS_LABEL ? `${short.slice(0, MAX_AXIS_LABEL - 1)}…` : short;
};
