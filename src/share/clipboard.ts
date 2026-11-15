// Copy text, and say honestly whether it worked. The caller shows the text for manual copying when it did not.
// Never throws: browsers can refuse (no permission, insecure page, old browser).
export interface ClipboardEnv {
  writeText?: (text: string) => Promise<void>;
  /** The old document.execCommand("copy") route; returns true on success. */
  legacy?: (text: string) => boolean;
}

function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

export function defaultClipboardEnv(): ClipboardEnv {
  return {
    writeText: typeof navigator !== 'undefined' && navigator.clipboard ? (t) => navigator.clipboard.writeText(t) : undefined,
    legacy: typeof document !== 'undefined' ? legacyCopy : undefined,
  };
}

export async function copyText(text: string, env: ClipboardEnv = defaultClipboardEnv()): Promise<boolean> {
  try {
    if (env.writeText) {
      await env.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy route
  }
  try {
    return env.legacy ? env.legacy(text) : false;
  } catch {
    return false;
  }
}
