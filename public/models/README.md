# 3D models (optional)

Drop **both** files here to replace the photo couple with fully animated 3D characters:

```
public/models/groom.glb
public/models/bride.glb
```

No code changes are needed. The site detects them at build time. If either file is missing or invalid, the site keeps showing your photo cutout.

## Requirements

| | |
|---|---|
| Format | Binary glTF (`.glb`), one character per file, rigged (skinned) |
| Orientation | Facing **+Z**, Y-up (Mixamo / Blender glTF export default). Otherwise set `rotationY` in `src/config/assets.js` |
| Scale | Any. The site rescales to `heightMeters` (1.76 m groom, 1.65 m bride) |
| Size | Ideally under 8 MB each. Compress with `npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress webp` (Meshopt is supported) |
| Textures | 1024–2048 px, WebP or JPEG |

## Animation clips (named inside each GLB)

| Clip | Used when |
|---|---|
| `Idle` | Standing (default) |
| `LookAtPartner` | The "A new chapter begins…" close-up, where they turn to each other |
| `Smile` | Layered on top during the close-up and finale (additive) |
| `WeddingPose` | Invitation sections and the night finale |
| `Walk`, `WalkSlow` | Optional; supported by the loader for future use |

Names are matched case-insensitively, and prefixes like `Armature|Idle` are fine.
Missing clips fall back to `Idle`.

## How to get them made

These need a real 3D step. They can't be generated reliably from one photo inside this project:

1. **Image-to-3D / avatar tools.** Create each person from front, side and full-length photos.
   Options include Avaturn, Meshy, Tripo, Rodin or Character Creator Headshot. Export as GLB or FBX.
2. **Rigging + animation.** Upload to [Mixamo](https://www.mixamo.com) (free) for auto-rigging, then download
   `Idle`, `Walking` and a "talking/looking" clip. Combine them in Blender as named actions and export as GLB.
3. **Or hire a 3D artist.** Search "stylised wedding couple 3D character GLB" on Fiverr or ArtStation and share this file
   as the spec.
