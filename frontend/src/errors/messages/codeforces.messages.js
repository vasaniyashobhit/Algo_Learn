const handleName = ({ handle }) => (handle ? `"${handle}"` : 'that handle');

export const codeforcesMessages = {
  CF_HANDLE_NOT_FOUND: {
    default: (params) => `We couldn't find ${handleName(params)} on Codeforces. Check the spelling and try again.`,
  },
  CF_HANDLE_TAKEN: {
    default: (params) => `${handleName(params)} is already linked to another AlgoLearn account.`,
  },
  CF_HANDLE_NOT_LINKED: {
    default: () => 'Link your Codeforces handle first. Your topic strengths come from your submissions.',
  },
  CF_UNAVAILABLE: {
    default: () =>
      "Codeforces isn't responding right now. Your saved data is still here; try again in a few minutes.",
    contexts: {
      sync: () => "Codeforces isn't responding, so we couldn't sync. Your last synced data is still shown.",
    },
  },
  SYNC_IN_PROGRESS: { default: () => 'A sync is already running. Your numbers will update when it finishes.' },
};
