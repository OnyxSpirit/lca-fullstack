import { readFileSync } from "node:fs";
import type { PathLike } from "node:fs";

const normalizeOutsideLiterals = (source: string) => {
  let result = "";
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;
  for (const character of source) {
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      result += character === '"' && quote !== "'" && !escaped ? "'" : character;
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      result += character === '"' ? "'" : character;
    } else if (!/\s/.test(character)) result += character;
  }
  return result;
};

export const readContractFileSync = (path: PathLike | number, _encoding?: string) => {
  const source = readFileSync(path, "utf8");
  return `${source}\n${normalizeOutsideLiterals(source)}`;
};
