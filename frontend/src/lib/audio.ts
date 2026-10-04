/** Sample rate of the PCM chunks emitted by useMicrophone. */
export const PCM_SAMPLE_RATE = 16_000;

/**
 * Base64-encode a raw PCM16 chunk. ElevenLabs Conversational AI expects mic
 * audio over its WebSocket as `{ "user_audio_chunk": "<base64 pcm16 16kHz>" }`.
 */
export function pcmToBase64(chunk: ArrayBuffer): string {
  const bytes = new Uint8Array(chunk);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
