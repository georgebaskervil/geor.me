#!/usr/bin/env bun

const ROOT = import.meta.dir + "/..";
const MIN_AGE_DAYS = 7;
const MIN_AGE_MS = MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
const CUTOFF_DATE = new Date(Date.now() - MIN_AGE_MS);

const RED = "\u001B[31m";
const YELLOW = "\u001B[33m";
const GREEN = "\u001B[32m";
const RESET = "\u001B[0m";

console.log(`\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`${GREEN}  🔒 BUN AGE GATE - SECURITY CHECK${RESET}`);
console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
console.log(`   Minimum age: ${MIN_AGE_DAYS} days`);
console.log(`   Cutoff date: ${CUTOFF_DATE.toISOString().split("T")[0]}`);
console.log(`${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n`);

async function getLockedPackages() {
  try {
    const lockfile = await Bun.file(`${ROOT}/bun.lock`).text();
    const packages = [];
    const workspacesMatch = lockfile.match(
      /"workspaces":\s*\{[\s\S]*?"":\s*\{([\s\S]*?)\n {2}\},/,
    );
    if (!workspacesMatch) {
      console.error(
        `${YELLOW}⚠️  Could not find workspaces in bun.lock${RESET}`,
      );
      return [];
    }

    const workspaceContent = workspacesMatch[1];
    const depsMatch = workspaceContent.match(
      /"dependencies":\s*\{([\s\S]*?)\n {6}\},/,
    );
    const developmentDepsMatch = workspaceContent.match(
      /"devDependencies":\s*\{([\s\S]*?)\n {6}\},/,
    );

    function parseDeps(content) {
      if (!content) return;
      for (const line of content.split("\n")) {
        const match = line.match(/^\s+"([^"]+)":\s*"([^"]+)",?\s*$/);
        if (match) {
          const [, name, versionSpec] = match;
          if (!versionSpec.startsWith("file:"))
            packages.push({ name, versionSpec });
        }
      }
    }

    parseDeps(depsMatch?.[1]);
    parseDeps(developmentDepsMatch?.[1]);
    return packages;
  } catch (error) {
    console.error(
      `${YELLOW}⚠️  Could not parse bun.lock: ${error.message}${RESET}`,
    );
    return [];
  }
}

async function checkPackageAge(name, versionSpec) {
  try {
    const cleanVersion = versionSpec.replace(/^[\^~>=<]+/, "");
    let targetVersion = cleanVersion;

    if (/^[\^~>=<]/.test(versionSpec)) {
      try {
        const proc = Bun.spawn(
          ["npm", "view", `${name}@${cleanVersion}`, "version", "--json"],
          {
            stdout: "pipe",
            stderr: "pipe",
            cwd: ROOT,
          },
        );
        const output = await new Response(proc.stdout).text();
        targetVersion = JSON.parse(output);
      } catch {}
    }

    const proc = Bun.spawn(["npm", "view", name, "time", "--json"], {
      stdout: "pipe",
      stderr: "pipe",
      cwd: ROOT,
    });
    const output = await new Response(proc.stdout).text();
    const timeData = JSON.parse(output);
    const published = new Date(timeData[targetVersion]);

    return {
      name,
      version: targetVersion,
      published,
      tooNew: published > CUTOFF_DATE,
    };
  } catch {
    return null;
  }
}

async function validate() {
  const packages = await getLockedPackages();
  if (packages.length === 0) {
    console.error(
      `${RED}❌ No packages found - cannot validate safety${RESET}`,
    );
    console.error("   Defaulting to BLOCK for security.\n");
    process.exit(1);
  }

  console.log(`   Checking ${packages.length} packages...\n`);
  const recentPackages = [];
  const batchSize = 5;

  for (let index = 0; index < packages.length; index += batchSize) {
    const batch = packages.slice(index, index + batchSize);
    const results = await Promise.all(
      batch.map((p) => checkPackageAge(p.name, p.versionSpec)),
    );
    for (const result of results)
      if (result?.tooNew) recentPackages.push(result);
    process.stdout.write(
      `   ${Math.min(index + batchSize, packages.length)}/${packages.length} checked...\r`,
    );
  }

  console.log("");

  if (recentPackages.length > 0) {
    console.error(`\n${RED}❌ BUN AGE GATE BLOCKED${RESET}`);
    console.error(
      `   ${recentPackages.length} package(s) are newer than ${MIN_AGE_DAYS} days:\n`,
    );
    for (const p of recentPackages) {
      const daysAgo = Math.floor(
        (Date.now() - p.published) / (24 * 60 * 60 * 1000),
      );
      console.error(`   ${RED}• ${p.name}@${p.version}${RESET}`);
      console.error(
        `     Published: ${p.published.toISOString().split("T")[0]} (${daysAgo} days ago)`,
      );
    }
    const unlockDate = new Date(
      Math.max(...recentPackages.map((p) => p.published.getTime())) +
        MIN_AGE_MS,
    );
    console.error(
      `\n${YELLOW}   ⏳ Available after: ${unlockDate.toISOString().split("T")[0]}${RESET}`,
    );
    console.error("\n   Operation BLOCKED.\n");
    process.exit(1);
  }

  console.log(
    `${GREEN}✅ All ${packages.length} packages meet the ${MIN_AGE_DAYS}-day minimum age.${RESET}\n`,
  );
}

validate().catch((error) => {
  console.error(`${RED}❌ Validation error: ${error.message}${RESET}`);
  console.error("   Defaulting to BLOCK for security.\n");
  process.exit(1);
});
