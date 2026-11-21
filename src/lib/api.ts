export type ApiResult<T> = ({ ok: true } & T) | { ok: false; status: number; error: string; fields?: Record<string, string> }

/** JSON fetch that never throws: network failures come back as status 0. */
export async function requestJson<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) return { ok: false, status: res.status, error: typeof data.error === 'string' ? data.error : 'Something went wrong. Try again.', fields: data.fields as Record<string, string> | undefined }
    return { ok: true, ...(data as T) }
  } catch {
    return { ok: false, status: 0, error: 'You appear to be offline. Check your connection and try again.' }
  }
}

export const postJson = <T>(url: string, body: unknown) => requestJson<T>(url, { method: 'POST', body: JSON.stringify(body) })
