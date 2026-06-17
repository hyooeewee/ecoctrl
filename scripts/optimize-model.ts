#!/usr/bin/env node
// ========================================
// GLB asset optimizer
// ========================================
//
// Reduces draw calls for large architectural GLBs by instancing repeated
// geometry and joining meshes that share the same material. Named nodes are
// preserved so label anchors keep working.
//
// Usage:
//   pnpm optimize-model -- input.glb output.glb
//   pnpm optimize-model -- --input-dir ./raw --output-dir ./optimized
//
// Options:
//   --texture-size N       Max width/height for newly encoded textures.
//                          Default: 2048. Only affects PNG/JPEG sources.
//   --texture-quality N    WebP quality (1-100) for base-color/emissive
//                          textures converted from PNG/JPEG. Default: 90.
//   --no-texture-compress  Keep every texture exactly as-is. Use this if you
//                          need a 100% pixel-perfect A/B comparison.
//   --draco                Enable Draco geometry compression. Disabled by
//                          default because some models use KHR_mesh_primitive
//                          restart, which gltf-transform's Draco encoder does
//                          not yet support.
//   --no-instancing        Do not convert repeated meshes to instances.
//   --no-join              Do not merge sibling meshes by material.
//
// Texture handling notes:
// - Already-compressed sources (WebP/AVIF/KTX2) are NEVER re-encoded. Re-
//   encoding a lossy format wipes fine surface detail (e.g. steel roofing).
// - PNG/JPEG base-color textures become lossy WebP at --texture-quality.
// - PNG/JPEG normal/ORM/occlusion textures become lossless WebP so material
//   detail is preserved.
// - If the input only contains WebP textures (common for exports from this
//   pipeline), the file-size drop comes almost entirely from mesh reduction.

import { NodeIO } from "@gltf-transform/core";
import {
  EXTMeshoptCompression,
  EXTTextureWebP,
  KHRDracoMeshCompression,
  KHRMeshQuantization,
} from "@gltf-transform/extensions";
import { dedup, draco, instance, join, textureCompress } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const DEFAULT_TEXTURE_SIZE = 2048;
const DEFAULT_TEXTURE_QUALITY = 90;

interface Stats {
  meshes: number;
  primitives: number;
  vertices: number;
  triangles: number;
  textures: number;
  materials: number;
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  if (args.length === 0) {
    return { mode: "help" as const };
  }

  let inputDir: string | undefined;
  let outputDir: string | undefined;
  let textureSize = DEFAULT_TEXTURE_SIZE;
  let textureQuality = DEFAULT_TEXTURE_QUALITY;
  let useDraco = false;
  let noInstancing = false;
  let noJoin = false;
  let noTextureCompress = false;
  let positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--input-dir":
        inputDir = args[++i];
        break;
      case "--output-dir":
        outputDir = args[++i];
        break;
      case "--texture-size":
        textureSize = Number(args[++i]) || DEFAULT_TEXTURE_SIZE;
        break;
      case "--texture-quality":
        textureQuality = Number(args[++i]);
        if (Number.isNaN(textureQuality) || textureQuality < 1 || textureQuality > 100) {
          textureQuality = DEFAULT_TEXTURE_QUALITY;
        }
        break;
      case "--draco":
        useDraco = true;
        break;
      case "--no-instancing":
        noInstancing = true;
        break;
      case "--no-join":
        noJoin = true;
        break;
      case "--no-texture-compress":
        noTextureCompress = true;
        break;
      default:
        if (!arg.startsWith("-")) {
          positional.push(arg);
        }
        break;
    }
  }

  if (inputDir && outputDir) {
    return {
      mode: "dir" as const,
      inputDir,
      outputDir,
      textureSize,
      textureQuality,
      useDraco,
      noInstancing,
      noJoin,
      noTextureCompress,
    };
  }

  if (positional.length >= 2) {
    const [input, output] = positional;
    return {
      mode: "file" as const,
      input,
      output,
      textureSize,
      textureQuality,
      useDraco,
      noInstancing,
      noJoin,
      noTextureCompress,
    };
  }

  return { mode: "help" as const };
}

function printHelp() {
  console.log(`Usage:
  pnpm optimize-model -- input.glb output.glb
  pnpm optimize-model -- --input-dir ./raw --output-dir ./optimized

Options:
  --texture-size N       Max texture width/height (default: ${DEFAULT_TEXTURE_SIZE})
  --texture-quality N    WebP quality for color textures, 1-100 (default: ${DEFAULT_TEXTURE_QUALITY})
  --no-texture-compress  Keep original textures unchanged
  --draco                Enable Draco compression (opt-in; some models use primitive restart, which Draco does not support)
  --no-instancing        Skip instancing of repeated meshes
  --no-join              Skip mesh joining`);
}

function getStats(document: Awaited<ReturnType<InstanceType<typeof NodeIO>["read"]>>): Stats {
  const meshes = document.getRoot().listMeshes().length;
  const primitives = document
    .getRoot()
    .listMeshes()
    .reduce((sum, m) => sum + m.listPrimitives().length, 0);
  const textures = document.getRoot().listTextures().length;
  const materials = document.getRoot().listMaterials().length;

  let vertices = 0;
  let triangles = 0;
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const position = prim.getAttribute("POSITION");
      if (position) {
        vertices += position.getCount();
      }
      const indices = prim.getIndices();
      if (indices) {
        triangles += indices.getCount() / 3;
      } else if (position) {
        triangles += position.getCount() / 3;
      }
    }
  }

  return { meshes, primitives, vertices, triangles, textures, materials };
}

interface CompressionModules {
  dracoEncoder: unknown;
  dracoDecoder: unknown;
  meshoptDecoder: unknown;
}

async function optimizeFile(
  inputPath: string,
  outputPath: string,
  options: {
    textureSize: number;
    textureQuality: number;
    useDraco: boolean;
    noInstancing: boolean;
    noJoin: boolean;
    noTextureCompress: boolean;
  },
  modules: CompressionModules,
) {
  const io = new NodeIO()
    .registerExtensions([
      EXTMeshoptCompression,
      EXTTextureWebP,
      KHRDracoMeshCompression,
      KHRMeshQuantization,
    ])
    .registerDependencies({
      "meshopt.decoder": modules.meshoptDecoder,
      "meshopt.encoder": MeshoptEncoder,
      "draco3d.decoder": modules.dracoDecoder,
      "draco3d.encoder": modules.dracoEncoder,
    });

  console.log(`\nOptimizing: ${inputPath}`);
  const document = await io.read(inputPath);
  const before = getStats(document);

  const transforms = [
    dedup(),
    !options.noInstancing && instance(),
    !options.noJoin && join({ keepNamed: true }),
    // Only re-encode uncompressed textures (png/jpeg). Already-compressed
    // textures like WebP are left untouched to avoid generational quality loss.
    !options.noTextureCompress &&
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [options.textureSize, options.textureSize],
        quality: options.textureQuality,
        formats: /image\/png|image\/jpe?g/,
        slots: /baseColorTexture|emissiveTexture/,
      }),
    !options.noTextureCompress &&
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [options.textureSize, options.textureSize],
        lossless: true,
        formats: /image\/png|image\/jpe?g/,
        slots: /normalTexture|metallicRoughnessTexture|occlusionTexture/,
      }),
    options.useDraco &&
      draco({
        encoder: modules.dracoEncoder,
        decoder: modules.dracoDecoder,
      }),
  ].filter(Boolean) as ((doc: typeof document) => typeof document | Promise<typeof document>)[];

  await document.transform(...transforms);

  const after = getStats(document);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  await io.write(outputPath, document);

  const beforeBytes = fs.statSync(inputPath).size;
  const afterBytes = fs.statSync(outputPath).size;

  console.log(`  meshes:     ${before.meshes} → ${after.meshes}`);
  console.log(`  primitives: ${before.primitives} → ${after.primitives}`);
  console.log(
    `  vertices:   ${before.vertices.toLocaleString()} → ${after.vertices.toLocaleString()}`,
  );
  console.log(
    `  triangles:  ${before.triangles.toLocaleString()} → ${after.triangles.toLocaleString()}`,
  );
  console.log(`  textures:   ${before.textures} → ${after.textures}`);
  console.log(`  materials:  ${before.materials} → ${after.materials}`);
  console.log(
    `  file size:  ${(beforeBytes / 1024 / 1024).toFixed(2)}MB → ${(afterBytes / 1024 / 1024).toFixed(2)}MB`,
  );
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.mode === "help") {
    printHelp();
    process.exit(0);
  }

  // Prepare compression modules once — creating Draco/Meshopt modules is expensive.
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const [dracoEncoder, dracoDecoder] = await Promise.all([
    draco3d.createEncoderModule(),
    draco3d.createDecoderModule(),
  ]);
  const modules: CompressionModules = {
    dracoEncoder,
    dracoDecoder,
    meshoptDecoder: MeshoptDecoder,
  };

  if (args.mode === "file") {
    await optimizeFile(
      args.input,
      args.output,
      {
        textureSize: args.textureSize,
        textureQuality: args.textureQuality,
        useDraco: args.useDraco,
        noInstancing: args.noInstancing,
        noJoin: args.noJoin,
        noTextureCompress: args.noTextureCompress,
      },
      modules,
    );
    return;
  }

  // Directory mode
  const files = fs
    .readdirSync(args.inputDir)
    .filter((name) => name.toLowerCase().endsWith(".glb"))
    .sort();

  if (files.length === 0) {
    console.warn(`No .glb files found in ${args.inputDir}`);
    process.exit(1);
  }

  for (const file of files) {
    const inputPath = path.join(args.inputDir, file);
    const outputPath = path.join(args.outputDir, file);
    await optimizeFile(
      inputPath,
      outputPath,
      {
        textureSize: args.textureSize,
        textureQuality: args.textureQuality,
        useDraco: args.useDraco,
        noInstancing: args.noInstancing,
        noJoin: args.noJoin,
        noTextureCompress: args.noTextureCompress,
      },
      modules,
    );
  }
}

main().catch((err) => {
  console.error("[optimize-model] failed:", err);
  process.exit(1);
});
