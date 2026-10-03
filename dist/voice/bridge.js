/**
 * Bridge for Voxiva Voice → CLI composer.
 * Voice app / STT pushes transcript chunks here; the TUI lands them at the caret.
 */
let sink = null;
let listening = false;
export function setVoiceSink(next) {
    sink = next;
}
export function setVoiceListening(on) {
    listening = on;
}
export function isVoiceListening() {
    return listening;
}
/** Push a partial or final transcript into the active TUI composer. */
export function pushVoiceTranscript(chunk) {
    if (!listening || !chunk || !sink)
        return;
    sink(chunk);
}
