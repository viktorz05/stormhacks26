/** Where the FastAPI backend lives. Override with NEXT_PUBLIC_BACKEND_URL. */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export interface VerifyRequest {
  /** JPEG frame, Base64 without the `data:` prefix. */
  image: string;
  mimeType: "image/jpeg";
  /** What the user has to show the camera, e.g. "toothbrush". */
  target: string;
}

export interface VerifyResponse {
  verified: boolean;
  /** Short explanation from Gemini, shown to the user. */
  reason?: string;
}

/**
 * Ask the backend to have Gemini check the frame for `target`.
 * Contract: POST {BACKEND_URL}/api/verify-wake  body: VerifyRequest
 * -> VerifyResponse
 */
export async function verifyWakeUp(
  image: string,
  target: string,
  signal?: AbortSignal,
): Promise<VerifyResponse> {
  const body: VerifyRequest = { image, mimeType: "image/jpeg", target };
  const res = await fetch(`${BACKEND_URL}/api/verify-wake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    throw new Error(`Verification failed (${res.status})`);
  }
  return (await res.json()) as VerifyResponse;
}
