/**
 * Fails when a phase branch changes files outside its scope (scripts/scope/phases.json).
 *
 * Local:  node scripts/scope/check-scope.mjs
 *         (compares the current branch with origin/main)
 * CI:     SCOPE_BRANCH=<head branch> SCOPE_BASE=<base sha> node scripts/scope/check-scope.mjs
 *
 * Branches that are not phase branches (e.g. chore/*, docs/*) are reported and skipped:
 * they are maintainer changes reviewed by the owner.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const config = JSON.parse(readFileSync(new URL("./phases.json", import.meta.url), "utf8"));
const branch = process.env.SCOPE_BRANCH || git("rev-parse", "--abbrev-ref", "HEAD");
const base = process.env.SCOPE_BASE || git("merge-base", "origin/main", "HEAD");

const allowedForPhase = config.phases[branch];
if (!allowedForPhase) {
  console.log(`Branch "${branch}" is not a phase branch; no scope rules apply.`);
  process.exit(0);
}

function toRegExp(glob) {
  let source = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === "*" && glob[i + 1] === "*") {
      source += ".*";
      i++;
      if (glob[i + 1] === "/") i++;
    } else if (char === "*") {
      source += "[^/]*";
    } else {
      source += char.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

const matchesAny = (file, globs) => globs.some((glob) => toRegExp(glob).test(file));

const changed = git("diff", "--name-only", "--no-renames", `${base}...HEAD`)
  .split("\n")
  .filter(Boolean);

const protectedHits = changed.filter((file) => matchesAny(file, config.protected));
const outOfScope = changed.filter(
  (file) =>
    !matchesAny(file, config.protected) &&
    !matchesAny(file, [...config.alwaysAllowed, ...allowedForPhase]),
);

console.log(`Branch ${branch}: ${changed.length} changed file(s).`);

if (protectedHits.length === 0 && outOfScope.length === 0) {
  console.log("Scope check passed.");
  process.exit(0);
}

if (protectedHits.length > 0) {
  console.log("\nProtected files (never change these on a phase branch):");
  for (const file of protectedHits) console.log(`  - ${file}`);
}
if (outOfScope.length > 0) {
  console.log("\nOutside this phase's scope (see docs/roadmap/ and scripts/scope/phases.json):");
  for (const file of outOfScope) console.log(`  - ${file}`);
}
console.log(
  "\nRevert these changes, or stop and ask the owner if the phase really needs them (AGENTS.md > Protected rules).",
);
process.exit(1);
