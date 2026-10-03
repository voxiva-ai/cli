/**
 * Bridge for Voxiva Voice → CLI composer.
 * Voice app / STT pushes transcript chunks here; the TUI lands them at the caret.
 */
export type VoiceSink = (chunk: string) => void;
export declare function setVoiceSink(next: VoiceSink | null): void;
export declare function setVoiceListening(on: boolean): void;
export declare function isVoiceListening(): boolean;
/** Push a partial or final transcript into the active TUI composer. */
export declare function pushVoiceTranscript(chunk: string): void;
