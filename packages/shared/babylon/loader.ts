// ========================================
// GLB / GLTF Loader with Parenting
// ========================================

import {
  Scene,
  TransformNode,
  SceneLoader,
  AbstractMesh,
  type ISceneLoaderProgressEvent,
} from "@babylonjs/core";
import { GLTFFileLoader } from "@babylonjs/loaders";
import { fetchModelUrl } from "../model-cache";

export interface LoadGltfOptions {
  scene: Scene;
  url: string;
  modelId: string;
  useBlob?: boolean;
  forceExtension?: string;
  compileMaterials?: boolean;
  onProgress?: (event: ISceneLoaderProgressEvent) => void;
  /** If provided, this node is used as the root instead of creating a new one. */
  modelRoot?: TransformNode;
}

export interface LoadGltfResult {
  modelRoot: TransformNode;
  meshes: AbstractMesh[];
  sourceUrl: string;
}

/**
 * Load a GLB/GLTF file into the scene, parent it under a TransformNode,
 * and return the root node + meshes.
 *
 * When `modelRoot` is provided, that node is used as the parent and returned.
 * Otherwise a new TransformNode is created.
 *
 * The caller is responsible for revoking blob URLs (when useBlob is true).
 */
export async function loadGltf(options: LoadGltfOptions): Promise<LoadGltfResult> {
  const {
    scene,
    url,
    modelId,
    useBlob = true,
    forceExtension,
    compileMaterials = false,
    onProgress,
    modelRoot: providedRoot,
  } = options;

  const modelFileUrl = await fetchModelUrl(url, useBlob);

  const loaderObserver = SceneLoader.OnPluginActivatedObservable.add((loader) => {
    if (loader.name === "gltf" && compileMaterials === false) {
      (loader as GLTFFileLoader).compileMaterials = false;
    }
  });

  const pluginExtension =
    forceExtension ?? (url.includes(".glb") ? ".glb" : url.includes(".gltf") ? ".gltf" : undefined);

  let result: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>>;
  try {
    result = await SceneLoader.ImportMeshAsync(
      "", // mesh names (empty = all)
      "", // scene root (empty = use rootUrl)
      modelFileUrl,
      scene,
      onProgress,
      pluginExtension,
    );
  } finally {
    SceneLoader.OnPluginActivatedObservable.remove(loaderObserver);
  }

  // Parent every top-level transform node and mesh to a per-model root
  // so nothing leaks into the world root.
  const modelRoot = providedRoot ?? new TransformNode(`model_${modelId}`, scene);

  const gltfRoot = result.transformNodes.find((tn) => tn.name === "__root__");
  if (gltfRoot) {
    gltfRoot.parent = modelRoot;
  }

  // Some exporters emit meshes/transformNodes outside __root__;
  // collect any orphans under the model root as well.
  result.transformNodes.forEach((tn) => {
    if (tn !== gltfRoot && tn !== modelRoot && !tn.parent) {
      tn.parent = modelRoot;
    }
  });
  result.meshes.forEach((mesh) => {
    if (mesh !== modelRoot && !mesh.parent) {
      mesh.parent = modelRoot;
    }
  });

  return { modelRoot, meshes: result.meshes, sourceUrl: modelFileUrl };
}
