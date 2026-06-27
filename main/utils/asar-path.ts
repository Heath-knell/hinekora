import { normalize } from "node:path";

function isAsarVirtualPath(path: string): boolean {
  const normalized = normalize(path).replaceAll("\\", "/");

  return (
    normalized.includes("/app.asar/") &&
    !normalized.includes("/app.asar.unpacked/")
  );
}

export { isAsarVirtualPath };
