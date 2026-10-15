'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'opening' | 'preview' | 'recording' | 'stopping';

export default function FilmRecorder() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('Uključi kameru i mikrofon kada budeš spreman.');
  const [result, setResult] = useState<{ url: string; extension: string } | null>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const resultUrl = useRef<string | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (recorder.current?.state !== 'inactive') recorder.current?.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
    };
  }, []);

  async function openCamera() {
    if (busy.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('Snimanje nije podržano. Otvori stranicu preko HTTPS-a u pregledaču koji podržava kameru i MediaRecorder.');
      return;
    }
    busy.current = true;
    setPhase('opening');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media;
      if (preview.current) preview.current.srcObject = media;
      setPhase('preview');
      setMessage('Pregled je spreman. Klikni „Počni snimanje”.');
    } catch {
      if (mounted.current) { setPhase('idle'); setMessage('Kamera ili mikrofon nisu dostupni. Proveri dozvolu pregledača i da li ih druga aplikacija koristi.'); }
    } finally { busy.current = false; }
  }

  function startRecording() {
    if (!stream.current || recorder.current?.state === 'recording') return;
    const chunks: Blob[] = [];
    try {
      const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      const active = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      recorder.current = active;
      active.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      active.onstop = () => {
        if (!mounted.current) return;
        if (chunks.length) {
          const type = active.mimeType || chunks[0].type || 'video/webm';
          if (resultUrl.current) URL.revokeObjectURL(resultUrl.current);
          const url = URL.createObjectURL(new Blob(chunks, { type }));
          resultUrl.current = url;
          setResult({ url, extension: type.includes('mp4') ? 'mp4' : 'webm' });
          setMessage('Snimak je spreman. Preuzmi ga pre zatvaranja stranice.');
        } else { setMessage('Pregledač nije vratio snimak. Pokušaj ponovo.'); }
        stream.current?.getTracks().forEach(track => track.stop());
        stream.current = null;
        if (preview.current) preview.current.srcObject = null;
        setPhase('idle');
      };
      active.onerror = () => {
        if (mounted.current) setMessage('Snimanje je prekinuto greškom pregledača. Sačuvaj dostupan snimak i pokušaj ponovo.');
        if (active.state !== 'inactive') active.stop();
      };
      active.start(1000);
      setPhase('recording');
      setMessage('Snimanje je u toku. Video ostaje u memoriji ovog uređaja.');
    } catch { setPhase('preview'); setMessage('Snimanje nije moglo da počne. Pokušaj ponovo ili koristi drugi pregledač.'); }
  }

  function stop() {
    if (recorder.current?.state === 'recording') {
      setPhase('stopping');
      recorder.current.stop();
    } else if (phase === 'preview') {
      stream.current?.getTracks().forEach(track => track.stop());
      stream.current = null;
      if (preview.current) preview.current.srcObject = null;
      setPhase('idle');
      setMessage('Kamera i mikrofon su isključeni.');
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <Link href="/omegatrojektorijum" className="text-cyan-300 underline">Nazad na OMEGATROJEKTORIJUM</Link>
      <h1 className="text-3xl font-bold">SPAJA filmski studio</h1>
      <p className="text-slate-300">Prvi film iz kamere i mikrofona. Snimak se ne šalje na server. Preuzimanje čuva video na tvom uređaju; format određuje podrška pregledača.</p>
      <p className="text-sm text-slate-400">Za početak snimaj kratke kadrove: snimak koristi memoriju uređaja. Sačuvaj ga pre odlaska sa stranice.</p>
      <video ref={preview} autoPlay playsInline muted aria-label="Pregled kamere bez zvuka" className="aspect-video w-full rounded-xl bg-black" />
      <p role="status" aria-live="polite">{message}</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border border-slate-500 px-4 py-3 disabled:opacity-40" disabled={phase !== 'idle'} onClick={openCamera}>Uključi kameru i mikrofon</button>
        <button type="button" className="rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40" disabled={phase !== 'preview'} onClick={startRecording}>Počni snimanje</button>
        <button type="button" className="rounded-lg border border-red-400 px-4 py-3 disabled:opacity-40" disabled={phase !== 'recording' && phase !== 'preview'} onClick={stop}>{phase === 'preview' ? 'Isključi kameru' : 'Zaustavi snimanje'}</button>
      </div>
      {result ? <section aria-label="Gotov snimak" className="space-y-4">
        <h2 className="text-xl font-semibold">Tvoj snimak</h2>
        <video src={result.url} controls playsInline aria-label="Reprodukcija snimka" className="w-full rounded-xl bg-black" />
        <a href={result.url} download={`SPAJA-prvi-film.${result.extension}`} className="inline-block rounded-lg bg-cyan-300 px-4 py-3 font-semibold text-slate-950">Preuzmi snimak (.{result.extension})</a>
      </section> : null}
    </div>
  );
}
