import path from "node:path";
import fs from "node:fs";

const allowedRoots: string[] = [];

export function addAllowedRoot(root: string): void {
  const resolved = path.resolve(root);
  if (!allowedRoots.includes(resolved)) {
    allowedRoots.push(resolved);
  }
}

export function isPathSandboxed(targetPath: string): boolean {
  const resolved = path.resolve(targetPath).toLowerCase();
  return allowedRoots.some(
    (root) =>
      resolved.startsWith(root.toLowerCase() + path.sep) ||
      resolved === root.toLowerCase(),
  );
}

export function sandboxPath(userPath: string): string | null {
  const resolved = path.resolve(userPath);
  if (!isPathSandboxed(resolved)) return null;
  return resolved;
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export function isChildPath(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}
