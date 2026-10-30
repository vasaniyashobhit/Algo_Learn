// Used when a failure has no known code: network, timeout, then HTTP status, then generic.
export const networkMessage = () => "Can't reach AlgoLearn. Check your internet connection and try again.";
export const timeoutMessage = () => 'AlgoLearn took too long to answer. Try again in a moment.';
export const genericMessage = () => 'Something went wrong. Try again in a moment.';

export const statusMessages = {
  400: () => "That request wasn't accepted. Check what you entered and try again.",
  401: () => 'Please log in to continue.',
  403: () => "You don't have access to this.",
  404: () => "We couldn't find that.",
  409: () => 'That conflicts with something that already exists.',
  413: () => 'That is too large to send.',
  415: () => "That file type isn't supported.",
  422: () => "We couldn't read that input.",
  429: () => 'Too many requests. Try again in a little while.',
  500: () => 'Something went wrong on our side. Try again in a moment.',
  502: () => 'A service AlgoLearn depends on is not responding. Try again in a minute.',
  503: () => 'AlgoLearn is busy or restarting. Try again in a minute.',
  504: () => 'AlgoLearn took too long to answer. Try again in a moment.',
};
