# 3D Models

EcoCtrl supports interactive 3D building visualization through Babylon.js. Administrators upload glTF/glB models via the admin dashboard; the public web portal renders them with configurable camera angles, lighting and annotated hotspots.

## Upload pipeline

### Admin UI

The **Models** page in the admin dashboard provides:

- **ModelFileZone.tsx** — drag-and-drop upload area with format validation.
- **ModelViewer.tsx** — preview the model before publishing using Google Model Viewer.
- Scene configuration panel for camera preset, ambient light and hotspot placement.

### Supported formats

- **glTF 2.0** (`.gltf` + `.bin` + textures)
- **glB** (binary glTF, `.glb`) — preferred for single-file uploads

Other formats (FBX, OBJ, STL) are not supported directly. Convert to glB using Blender or online converters before upload.

## Data model

### `models`

Uploaded 3D model metadata.

| Column        | Type        | Notes                                     |
| ------------- | ----------- | ----------------------------------------- |
| `id`          | uuid PK     |                                           |
| `name`        | varchar     | Original filename.                        |
| `fileUrl`     | varchar     | Public URL: `/static/models/<filename>`.  |
| `fileSize`    | bigint      | Bytes.                                    |
| `mimeType`    | varchar     | `model/gltf+json` or `model/gltf-binary`. |
| `description` | text        | Optional.                                 |
| `createdAt`   | timestamptz |                                           |

### `dashboard_models`

Single-row scene configuration.

| Column                  | Type        | Notes                                                     |
| ----------------------- | ----------- | --------------------------------------------------------- |
| `id`                    | serial PK   |                                                           |
| `modelFileUrl`          | varchar     | Active model file URL.                                    |
| `cameraPreset`          | varchar     | Named camera angle (`Default_View_01`, `Top_View`, etc.). |
| `ambientLightIntensity` | real        | 0–1, default 0.85.                                        |
| `hotspots`              | jsonb       | Array of `{x, y, z, label, targetId}`.                    |
| `labels`                | jsonb       | Array of `{position: {x,y,z}, text, color}`.              |
| `updatedAt`             | timestamptz |                                                           |

## Web portal rendering

`apps/web/app/components/dashboard/building-view.tsx` loads the active model into a Babylon.js scene:

```ts
// Simplified flow
const config = await fetch("/api/public/model").then((r) => r.json());
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
await SceneLoader.ImportMeshAsync("", config.modelFileUrl, "", scene);
// Apply camera preset, ambient light, hotspots and labels from config
```

### Camera presets

Camera presets are named views stored in the model's glTF data or overridden in `dashboard_models.cameraPreset`. Common presets:

| Preset            | Description            |
| ----------------- | ---------------------- |
| `Default_View_01` | Front-facing overview. |
| `Top_View`        | Bird's eye view.       |
| `Side_View`       | Left-side elevation.   |

### Hotspots

Hotspots are clickable markers placed at 3D coordinates. When clicked, they can:

- Display a tooltip with the `label` text.
- Navigate to a specific floor or system page.
- Show real-time IoT data for the associated `targetId`.

### Labels

Labels are persistent text annotations floating at fixed 3D positions. They are useful for marking building sections, equipment rooms or energy zones.

## API

| Method | Path                   | Description                    |
| ------ | ---------------------- | ------------------------------ |
| GET    | `/api/public/model`    | Public scene config (no auth). |
| GET    | `/api/models`          | List uploaded models.          |
| POST   | `/api/models`          | Upload a new model.            |
| GET    | `/api/models/:id`      | Get model metadata.            |
| DELETE | `/api/models/:id`      | Delete model and file.         |
| GET    | `/api/dashboard-model` | Get full scene config.         |
| PUT    | `/api/dashboard-model` | Update scene config.           |

## File serving

Models are served as static files at `/static/models/<filename>`. Fastify's `fastify-static` plugin handles this:

```ts
await fastify.register(fastifyStatic, {
  root: "uploads/models",
  prefix: "/static/models/",
});
```

No authentication is required for `/static/models/*` — the web portal needs to load them directly in the browser.
