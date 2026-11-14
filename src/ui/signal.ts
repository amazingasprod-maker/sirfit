// Fin de repos : deux bips et une vibration, comme dans Sir_Fit.

let ctx: AudioContext | null = null;

/**
 * À appeler dans un geste de l'utilisateur (la coche d'une série) : un
 * navigateur mobile refuse de jouer un son que personne n'a demandé.
 */
export function preparerAudio(): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function note(c: AudioContext, depart: number, frequence: number): void {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(0.0001, depart);
  gain.gain.exponentialRampToValueAtTime(0.28, depart + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, depart + 0.22);
  osc.connect(gain).connect(c.destination);
  osc.start(depart);
  osc.stop(depart + 0.24);
}

export function bip(): void {
  if (!ctx || ctx.state !== 'running') return;
  const t = ctx.currentTime;
  note(ctx, t, 880);
  note(ctx, t + 0.28, 1175);
}

export function vibrer(motif: number | number[] = [180, 90, 180]): void {
  try {
    navigator.vibrate?.(motif);
  } catch {
    // pas de vibreur : rien à faire
  }
}
