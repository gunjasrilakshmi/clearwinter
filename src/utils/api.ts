export async function parseApiResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  const rawText = await res.text();

  if (!contentType.includes('application/json')) {
    const trimmed = rawText.trim();
    if (res.status === 404 || trimmed.startsWith('The page could not be found')) {
      throw new Error(
        'API endpoint not found (404). Make sure the full-stack server (`node server.ts`) is running rather than static-only hosting.',
      );
    }
    throw new Error(
      `Server returned an unexpected response (${res.status}). Please verify the backend server is running.`,
    );
  }

  let parsed: T & { error?: string };
  try {
    parsed = JSON.parse(rawText) as T & { error?: string };
  } catch {
    throw new Error(`Invalid JSON received from server (${res.status}).`);
  }

  if (!res.ok) {
    throw new Error(parsed.error || `Request failed with status ${res.status}.`);
  }

  return parsed;
}
