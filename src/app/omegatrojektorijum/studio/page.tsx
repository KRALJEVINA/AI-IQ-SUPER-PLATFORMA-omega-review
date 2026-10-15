import type { Metadata } from 'next';
import FilmRecorder from './recorder';

export const metadata: Metadata = { title: 'SPAJA filmski studio', description: 'Snimi kameru i mikrofon i preuzmi lokalni video.' };

export default function StudioPage() {
  return <FilmRecorder />;
}
