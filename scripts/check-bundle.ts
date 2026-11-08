// F7.9: fail if anything in the browser bundle (.next/static) mentions the Anthropic key or SDK config.
// Run after `next build`. Also checks for the actual key value when it's set in the environment.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = ".next/static";
if (!existsSync(root)) {
  console.error("No .next/static folder: run `npm run build` first.");
  process.exit(1);
}

const patterns: RegExp[] = [/ANTHROPIC_API_KEY/, /sk-ant-[A-Za-z0-9_-]{10,}/, /api\.anthropic\.com/];
const key = process.env.ANTHROPIC_API_KEY;
if (key && key.length > 10) patterns.push(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|css|html|json|txt|map)$/.test(name)) files.push(path);
  }
};
walk(root);

const hits = files.flatMap((file) => {
  const text = readFileSync(file, "utf8");
  return patterns.filter((p) => p.test(text)).map((p) => `${file}: matches ${p.source.slice(0, 30)}`);
});

if (hits.length) {
  console.error("Secrets or server-only AI code found in the client bundle:\n" + hits.join("\n"));
  process.exit(1);
}
console.log(`Client bundle clean: ${files.length} files checked.`);
