import { readFile, readFileSync } from "node:fs";
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

const withNormalizedContract = (source: string) =>
  `${source}\n${normalizeOutsideLiterals(source)}`;

export const readContractFileSync = (
  path: PathLike | number,
  _encoding?: string,
) => withNormalizedContract(readFileSync(path, "utf8"));

export const readContractFile = (path: PathLike | number, _encoding?: string) =>
  new Promise<string>((resolve, reject) => {
    readFile(path, "utf8", (error, source) => {
      if (error) reject(error);
      else resolve(withNormalizedContract(source));
    });
  });
