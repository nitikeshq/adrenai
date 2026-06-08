import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = [
  "site/index.html",
  "site/styles.css",
  "site/script.js",
  "site/assets/favicon.svg",
  "site/assets/adrenai-product-hunt-cover.png",
];
await Promise.all(required.map((path) => access(resolve(path))));

const html = await readFile(resolve("site/index.html"), "utf8");
for (const text of ["One setup.", "Every coding agent.", "npx adrenai", "Offline-first"]) {
  if (!html.includes(text)) throw new Error(`Launch site is missing required copy: ${text}`);
}
for (const placeholder of ["https://github.com/", "TODO", "PLACEHOLDER"]) {
  if (html.includes(placeholder)) throw new Error(`Launch site contains placeholder: ${placeholder}`);
}
for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#?]+)"/g)) {
  await access(resolve("site", match[1]));
}

console.log(`Launch site validated (${required.length} required assets).`);
