#!/usr/bin/env node
// ========================================
// GLB asset optimizer
// ========================================
//
// Run against one or more GLB files, or an entire directory:
//
//   pnpm optimize-model -- input.glb output.glb
//   pnpm optimize-model -- --input-dir ./raw --output-dir ./optimized
//
// The pipeline preserves named nodes (needed for label anchors) while
// merging/deduplicating everything else, then Draco-compresses geometry
// and converts textures to WebP at the configured max size.

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

const DEFAULT_TEXTURE_SIZE = 1024;

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
  let useDraco = false;
  let noInstancing = false;
  let noJoin = false;
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
      case "--draco":
        useDraco = true;
        break;
      case "--no-instancing":
        noInstancing = true;
        break;
      case "--no-join":
        noJoin = true;
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
      useDraco,
      noInstancing,
      noJoin,
    };
  }

  if (positional.length >= 2) {
    const [input, output] = positional;
    return { mode: "file" as const, input, output, textureSize, useDraco, noInstancing, noJoin };
  }

  return { mode: "help" as const };
}

function printHelp() {
  console.log(`Usage:
  pnpm optimize-model -- input.glb output.glb
  pnpm optimize-model -- --input-dir ./raw --output-dir ./optimized

Options:
  --texture-size N   Max texture width/height (default: ${DEFAULT_TEXTURE_SIZE})
  --draco            Enable Draco compression (opt-in; some models use primitive restart, which Draco does not support)
  --no-instancing    Skip instancing of repeated meshes
  --no-join          Skip mesh joining`);
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
  options: { textureSize: number; useDraco: boolean; noInstancing: boolean; noJoin: boolean },
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
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [options.textureSize, options.textureSize],
      slots: /.*/,
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
        useDraco: args.useDraco,
        noInstancing: args.noInstancing,
        noJoin: args.noJoin,
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
        useDraco: args.useDraco,
        noInstancing: args.noInstancing,
        noJoin: args.noJoin,
      },
      modules,
    );
  }
}

main().catch((err) => {
  console.error("[optimize-model] failed:", err);
  process.exit(1);
});
