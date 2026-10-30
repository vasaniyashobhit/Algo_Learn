import { File as NodeFile } from 'node:buffer';

/**
 * jsdom's FormData and File cannot be streamed by undici, so an upload through MSW's XHR
 * interceptor hangs forever. Tests use Node's own FormData and File instead (the browser's
 * real ones work, so app code is unchanged). Node's FormData is reached through a Response,
 * because jsdom replaces the global.
 */
export const installNodeFormData = async () => {
  const form = await new Response('a=1', { headers: { 'content-type': 'application/x-www-form-urlencoded' } }).formData();
  globalThis.FormData = form.constructor;
  globalThis.File = NodeFile;
};
