import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ["index.html","styles.css","app.js","core.js"]) await cp(join(root, file), join(dist, file));
console.log("Static build complete: dist/");
