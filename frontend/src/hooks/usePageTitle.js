import { useEffect } from 'react';

export const APP_NAME = 'AlgoLearn';

export const formatTitle = (title) => (title ? `${title} · ${APP_NAME}` : APP_NAME);

/** Sets the browser tab title, e.g. "Log in · AlgoLearn". */
export const usePageTitle = (title) => {
  useEffect(() => {
    document.title = formatTitle(title);
  }, [title]);
};
