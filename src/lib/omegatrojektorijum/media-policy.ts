export const OMEGA_STUDIO_PATH = '/omegatrojektorijum/studio';

/** Camera/microphone are opt-in on this page only; unrelated routes keep their policy. */
export function applyOmegaStudioMediaPolicy(headers: Headers, pathname: string) {
  if (pathname !== OMEGA_STUDIO_PATH && pathname !== `${OMEGA_STUDIO_PATH}/`) return;
  headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()');
  const csp = headers.get('Content-Security-Policy');
  if (csp) headers.set('Content-Security-Policy', `${csp}; media-src 'self' blob:`);
}
