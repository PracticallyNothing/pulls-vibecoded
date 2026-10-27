// Builds the extension into dist/ (or dist-test/ with --test).
// --test also matches http://127.0.0.1 (the mock site) and uses a small limit.
import * as esbuild from "esbuild";
import fs from "node:fs";

const testBuild = process.argv.includes("--test");
const out = testBuild ? "dist-test" : "dist";

const matches = ["https://www.instagram.com/*"];
if (testBuild) matches.push("http://127.0.0.1/*");

const manifest = {
  manifest_version: 3,
  name: "Pulls",
  version: "0.1.0",
  description: "A daily budget of new posts and reels on Instagram.",
  permissions: ["storage"],
  content_scripts: [{ matches, js: ["content.js"], run_at: "document_start" }],
  browser_specific_settings: {
    gecko: {
      id: "pulls@practicallynothing",
      data_collection_permissions: { required: ["none"] },
    },
  },
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
fs.writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
await esbuild.build({
  entryPoints: ["src/content.js"],
  bundle: true,
  format: "iife",
  target: ["chrome120", "firefox120"],
  outfile: `${out}/content.js`,
  define: { __PULL_LIMIT__: testBuild ? "3" : "10" },
});
