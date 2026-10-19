import type { Igrica } from './igrice';
import { TRANSFORMERS_ID } from './transformers/engine';

/** Native games must use the game tab; external URLs retain the browser's URL validation. */
export function buildGameLaunchHref(game: Pick<Igrica, 'id' | 'naziv' | 'link'>, fallbackUrl: string): string {
  if (game.id === TRANSFORMERS_ID) {
    return `/spaja-digitalni-brouvzer?igricaId=${encodeURIComponent(game.id)}`;
  }
  return `/spaja-digitalni-brouvzer?url=${encodeURIComponent(game.link ?? fallbackUrl)}&igra=${encodeURIComponent(game.naziv)}`;
}
