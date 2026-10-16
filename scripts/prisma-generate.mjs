// Runs `prisma generate` only when the generated client is out of date.
//
// On Windows, VS Code's TypeScript server keeps handles open inside
// generated/prisma. Prisma regenerates by deleting and
// recreating that folder, which then fails with EPERM. Skipping generation when
// nothing changed means `npm run dev` / `build` normally never touch the folder.
// When the schema does change, generation is retried; if it still fails, restart
// the TS server ("TypeScript: Restart TS Server") and run `npm run db:generate`.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const output = "generated/prisma";
const stampFile = `${output}/.schema-hash`;
const force = process.argv.includes("--force");

function currentHash() {
  const prismaVersion = JSON.parse(
    readFileSync("node_modules/prisma/package.json", "utf8"),
  ).version;
  return createHash("sha256")
    .update(readFileSync("prisma/schema.prisma"))
    .update(prismaVersion)
    .digest("hex");
}

const hash = currentHash();
const upToDate =
  existsSync(`${output}/client.ts`) &&
  existsSync(`${output}/internal/class.ts`) &&
  existsSync(stampFile) &&
  readFileSync(stampFile, "utf8").trim() === hash;

if (upToDate && !force) {
  console.log("Prisma client is up to date; skipping generate.");
  process.exit(0);
}

const attempts = 4;
for (let attempt = 1; attempt <= attempts; attempt++) {
  const result = spawnSync("npx prisma generate", { encoding: "utf8", shell: true });
  const log = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.status === 0) {
    process.stdout.write(log);
    writeFileSync(stampFile, `${hash}\n`);
    process.exit(0);
  }
  if (!log.includes("EPERM") || attempt === attempts) {
    process.stderr.write(log);
    if (log.includes("EPERM")) {
      console.error(
        '\nThe editor is holding generated/prisma open. Run "TypeScript: Restart TS Server" ' +
          "in VS Code, then `npm run db:generate`.",
      );
    }
    process.exit(result.status ?? 1);
  }
  console.warn(`prisma generate hit EPERM (attempt ${attempt}/${attempts}); retrying…`);
  await sleep(1000 * attempt);
}
