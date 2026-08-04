#!/usr/bin/env node
/**
 * Model downloader for NexGen DashCam ALPR.
 * Usage: node scripts/download-models.js --plat=detector --format=onnx
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MODELS_DIR = path.join(__dirname, "..", "assets", "models");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function downloadHF(repoId, filename, destDir) {
  ensureDir(destDir);
  const dest = path.join(destDir, filename);
  if (fs.existsSync(dest)) {
    console.log(`✅ Already downloaded: ${dest}`);
    return dest;
  }
  console.log(`📥 Downloading ${repoId}/${filename}...`);
  execSync(
    `python3 -c "from huggingface_hub import hf_hub_download; p = hf_hub_download(repo_id='${repoId}', filename='${filename}', local_dir='${destDir}'); print(p)"`,
    { stdio: "inherit" }
  );
  return dest;
}

async function main() {
  ensureDir(MODELS_DIR);
  console.log("🚀 NexGen DashCam — Model Downloader\n");

  const args = process.argv.slice(2);
  const all = args.includes("--all");

  if (all || args.some(a => a.startsWith("--plat"))) {
    console.log("\n📸 Plate Detector:");
    await downloadHF(
      "makhresearch/persian-license-plate-detector",
      "best.pt",
      path.join(MODELS_DIR, "pytorch")
    );
  }

  console.log("\n✨ Done. Models saved to:", MODELS_DIR);
}

main().catch(console.error);
