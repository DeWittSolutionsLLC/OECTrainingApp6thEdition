const PREFIX = 'oec_progress_';

export function saveProgress(mode, data) {
  try {
    localStorage.setItem(PREFIX + mode, JSON.stringify(data));
  } catch (_) {}
}

export function loadProgress(mode) {
  try {
    const raw = localStorage.getItem(PREFIX + mode);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearProgress(mode) {
  localStorage.removeItem(PREFIX + mode);
}
