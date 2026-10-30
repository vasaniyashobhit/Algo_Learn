import { authMessages } from './auth.messages.js';
import { codeforcesMessages } from './codeforces.messages.js';
import { commonMessages } from './common.messages.js';
import { problemsMessages } from './problems.messages.js';
import { stuckMessages } from './stuck.messages.js';

export const messages = {
  ...commonMessages,
  ...authMessages,
  ...codeforcesMessages,
  ...problemsMessages,
  ...stuckMessages,
};
