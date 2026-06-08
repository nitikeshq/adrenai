import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderHomebrewFormula } from "./homebrew-formula-lib.mjs";

const options = Object.fromEntries(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);
const formula = renderHomebrewFormula(options);

if (options.output) {
  await writeFile(resolve(options.output), formula, "utf8");
  console.log(`Generated Homebrew formula: ${options.output}`);
} else {
  process.stdout.write(formula);
}
