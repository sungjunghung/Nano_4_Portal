const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string) ?? '').replace(/\/$/, '')

export async function fetchData<T>(
  mockFn: () => T | Promise<T>,
  apiFn: () => Promise<T>,
): Promise<T> {
  return USE_MOCK ? Promise.resolve().then(() => mockFn()) : apiFn()
}
