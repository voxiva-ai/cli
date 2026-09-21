/**
 * Bridge for Voxiva Voice → CLI composer.
 * Voice app / STT pushes transcript chunks here; the TUI lands them at the caret.
 */

export type VoiceSink = (chunk: string) => void;

let sink: VoiceSink | null = null;
let listening = false;

export function setVoiceSink(next: VoiceSink | null): void {
  sink = next;
}

export function setVoiceListening(on: boolean): void {
  listening = on;
}

export function isVoiceListening(): boolean {
  return listening;
}

/** Push a partial or final transcript into the active TUI composer. */
export function pushVoiceTranscript(chunk: string): void {
  if (!listening || !chunk || !sink) return;
  sink(chunk);
}
