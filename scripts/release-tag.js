const { execSync } = require("child_process");

const pkg = require("../apps/admin/package.json");
const tag = `v${pkg.version}`;

// Check if tag already exists on remote
const existing = execSync(`git ls-remote --tags origin "refs/tags/${tag}" || true`, {
  encoding: "utf-8",
  stdio: ["pipe", "pipe", "ignore"],
});

if (existing.includes(tag)) {
  console.log(`Tag ${tag} already exists on remote, skipping`);
  console.log(JSON.stringify({ packages: [], releases: [] }));
  process.exit(0);
}

execSync(`git tag ${tag}`);
execSync(`git push origin ${tag}`);
console.log(`Created and pushed tag ${tag}`);
console.log(JSON.stringify({ packages: [], releases: [] }));
