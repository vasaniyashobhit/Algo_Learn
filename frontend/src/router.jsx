import { createBrowserRouter } from 'react-router';
import { authStore } from './lib/authStore.js';
import { routes } from './routes.jsx';

export const router = createBrowserRouter(routes);

// A rejected token (expired or invalid) sends the user to /login with a "session expired" note.
authStore.onExpire(() => {
  const from = window.location.pathname;
  router.navigate('/login', { replace: true, state: { reason: 'expired', from } });
});
