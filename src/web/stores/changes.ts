import { useSyncExternalStore } from "react";

interface ChangeState {
  changedFiles: Set<string>;
}

const state: ChangeState = {
  changedFiles: new Set(),
};

const listeners = new Set<() => void>();

function emitChange(): void {
  for (const l of listeners) l();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ChangeState {
  return state;
}

export function useChangeStore(): ChangeState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function addFileChange(filePath: string): void {
  state.changedFiles.add(filePath);
  emitChange();
  try {
    localStorage.setItem(
      "pi-cy-file-changes",
      JSON.stringify(Array.from(state.changedFiles)),
    );
  } catch { /* ignore */ }
}

export function removeFileChange(filePath: string): void {
  state.changedFiles.delete(filePath);
  emitChange();
  try {
    localStorage.setItem(
      "pi-cy-file-changes",
      JSON.stringify(Array.from(state.changedFiles)),
    );
  } catch { /* ignore */ }
}

export function clearChanges(): void {
  state.changedFiles.clear();
  emitChange();
  try {
    localStorage.removeItem("pi-cy-file-changes");
  } catch { /* ignore */ }
}

export function hasFileChanged(filePath: string): boolean {
  return state.changedFiles.has(filePath);
}

export function loadChanges(): void {
  try {
    const stored = localStorage.getItem("pi-cy-file-changes");
    if (stored) {
      const files: string[] = JSON.parse(stored);
      state.changedFiles = new Set(files);
      emitChange();
    }
  } catch { /* ignore */ }
}

if (typeof window !== "undefined") {
  window.addEventListener("pi-cy-file-changed", (e: Event) => {
    const filePath = (e as CustomEvent).detail;
    if (filePath) addFileChange(filePath);
  });
}
