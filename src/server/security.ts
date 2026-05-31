import path from "node:path";
import os from "node:os";

const ALLOWED_ROOTS = [path.join(os.homedir(), ".pi")];

let currentProjectDir = "";

export function setProjectDir(dir: string): void {
  currentProjectDir = path.resolve(dir);
}

export function getProjectDir(): string {
  return currentProjectDir;
}

export function isPathAllowed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath).toLowerCase();
  const sep = path.sep;
  return (
    ALLOWED_ROOTS.some(
      (root) =>
        resolved.startsWith(root.toLowerCase() + sep) ||
        resolved === root.toLowerCase(),
    ) ||
    (!!currentProjectDir &&
      (resolved.startsWith(currentProjectDir.toLowerCase() + sep) ||
        resolved === currentProjectDir.toLowerCase()))
  );
}

export function safePath(userPath: string | undefined): string | null {
  if (!userPath) return null;
  const resolved = path.resolve(userPath);
  if (!isPathAllowed(resolved)) return null;
  return resolved;
}
