export const problemsMessages = {
  PROBLEM_NOT_FOUND: {
    default: ({ problemId }) =>
      problemId
        ? `We don't have problem ${problemId}. Check the contest number and letter.`
        : "We don't have that problem. Check the contest number and letter.",
  },
  PRACTICE_ITEM_EXISTS: { default: () => 'That problem is already in your practice list.' },
};
