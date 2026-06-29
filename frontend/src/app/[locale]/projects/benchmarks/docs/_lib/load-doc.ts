import fs from "node:fs";
import path from "node:path";

/**
 * Read a docs/*.md file from the repo root at request time.
 *
 * The frontend's working directory at runtime is `<repo>/frontend`, so docs
 * live one level up at `<repo>/docs`. We use fs.readFileSync inside a Server
 * Component — Next renders this at build time for static export, no node
 * runtime cost in the served HTML.
 */
export function loadDocMarkdown(filename: string): string {
  const repoRoot = path.resolve(process.cwd(), "..");
  const docPath = path.join(repoRoot, "docs", filename);
  try {
    return fs.readFileSync(docPath, "utf-8");
  } catch (e) {
    return `# Documentation unavailable\n\nCould not read \`docs/${filename}\` at build time. ${(e as Error).message}`;
  }
}
