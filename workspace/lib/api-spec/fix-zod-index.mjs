import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, "..", "api-zod", "src", "index.ts");
writeFileSync(target, 'export * from "./generated/api";\n');
