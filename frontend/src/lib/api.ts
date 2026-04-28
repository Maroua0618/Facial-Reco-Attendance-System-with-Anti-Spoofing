const FASTAPI_URL = (import.meta.env.VITE_FASTAPI_URL as string | undefined) ?? 'http://localhost:8000';

export interface EmbedResult {
  embedding: number[];
  dim: number;
}

export async function embedFace(image: Blob): Promise<EmbedResult> {
  const fd = new FormData();
  fd.append('image', image, 'frame.jpg');
  const r = await fetch(`${FASTAPI_URL}/embed`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`embed failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export interface RecognizeResult {
  ok: boolean;
  reason?: 'no_face' | 'spoof' | 'unknown';
  student_id?: string;
  confidence?: number;
  is_live: boolean;
  live_conf: number;
}

export async function recognizeFace(
  image: Blob,
  params: { session_id: string; group_id: string },
): Promise<RecognizeResult> {
  const fd = new FormData();
  fd.append('image', image, 'frame.jpg');
  fd.append('session_id', params.session_id);
  fd.append('group_id', params.group_id);
  const r = await fetch(`${FASTAPI_URL}/recognize`, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`recognize failed: ${r.status} ${await r.text()}`);
  return r.json();
}

export interface BackendHealth {
  ok: boolean;
  ts: number;
  face_service: { mock: boolean; loaded: boolean; error: string | null };
  anti_spoofing: { mock: boolean; loaded: boolean; error: string | null; threshold: number };
}

export async function backendHealth(): Promise<BackendHealth> {
  const r = await fetch(`${FASTAPI_URL}/healthz`);
  if (!r.ok) throw new Error(`healthz failed: ${r.status}`);
  return r.json();
}
