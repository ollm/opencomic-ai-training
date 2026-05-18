# opencomic-ai-training

Ethical dataset generation pipeline for OpenComic AI models.

This repository contains the scripts and configuration files used to generate paired training datasets with Krita. The generated pairs are used to train OpenComic AI models for artifact removal, descreening, and upscaling.

## About

OpenComic AI models are trained with ethically generated images created procedurally/randomly in Krita.

This repository focuses on dataset generation. For model training, the project has been used with [`the-database/traiNNer-redux`](https://github.com/the-database/traiNNer-redux) and the training options in [`options/train`](options/train), but you can use any training framework that supports paired datasets.

## Requirements

- Linux (Tested on Ubuntu)
- Windows and macOS (Untested, may require adjustments)
- Krita 5.3.0 or newer (AppImage works)
- [`ollm/kra-remote`](https://github.com/ollm/kra-remote) plugin installed in Krita
- Node.js + npm

## Quick Start

```bash
npm install
npm run prepare && npm run generate -- --options ./options/opencomic-ai-upscale-2x.yml --krita ./krita-5.3.0-prealpha-96e6ffea4e-x86_64.AppImage
```

## CLI Reference

Generate a dataset of clean and degraded images using Krita and an options file.

```bash
npm run prepare && npm run generate -- --options <file> --krita <path>
```

#### Arguments

```bash
  --options <file>                    Path to the options file (YAML).
  --krita <path>                      Path to the Krita executable or AppImage (Krita 5.3.0 or later with the kra-remote plugin).
  --restart-krita-every <number>      Restart Krita every N images to avoid memory leaks (default: 20).
  --print-options                     Print the loaded options (Randomized) and exit.
  --print-krita-filters               Print the Krita plugin filters and exit.
  --print-krita-gradients             Print the Krita plugin gradients and exit.
  --help, -h                          Show help.
```

## Configuration Files

Dataset generation presets are stored in [`options`](options).

Main presets:

- `opencomic-ai-artifact-removal.yml`
- `opencomic-ai-descreen-hard.yml`
- `opencomic-ai-descreen-hard-any-angle.yml`
- `opencomic-ai-descreen-moire-only.yml`
- `opencomic-ai-upscale-2x.yml`
- `opencomic-ai-upscale-3x.yml`
- `opencomic-ai-upscale-4x-new.yml`

Shared building blocks are available under:

- [`options/common`](options/common)
- [`options/drawings`](options/drawings)
- [`options/halftone`](options/halftone)
- [`options/textures`](options/textures)

## Generated Dataset Structure

Each generated dataset follows the paired format:

```text
datasets/<dataset-name>/
  clean/
  degraded/
  options/
```

- `clean`: Ground-truth images.
- `degraded`: Input images with synthetic degradations.
- `options`: Resolved options used for reproducibility.

## Validate Dataset Structure

Use `fix-images.mjs` to verify that all paired images in a dataset have the expected scale and matching files.

```bash
node fix-images.mjs

Check dataset consistency between clean and degraded images

Usage:
  node fix-images.mjs --dataset opencomic-ai-upscale-2x --scale 2

Arguments:
  --dataset   Dataset name (required)
  --scale     Scale factor (optional, auto-detected from dataset name)
  --print     Print mismatched rows
  --delete    Delete unmatched images
```

## Training

Training options used with traiNNer-redux are available in [`options/train`](options/train).

Typical workflow:

1. Generate paired datasets with this repository.
2. Point your training framework to the generated `clean` and `degraded` folders or use [`options/train`](options/train) options.
3. Train from scratch or continue from a pretrained model.

## Models Info

### Artifact Removal

| Model | Type | Pretrained From | Image Pairs | Iterations |
|------|------|-----------------|------------:|-----------:|
| `opencomic-ai-artifact-removal-compact` | Compact | - | 400,000 | 450,000 |
| `opencomic-ai-artifact-removal-lite` | ESRGAN Lite | - | 400,000 | 1,000,000 |
| `opencomic-ai-artifact-removal` | ESRGAN | - | 400,000 | 1,000,000 |

### Descreen

| Model | Type | Pretrained From | Image Pairs | Iterations |
|------|------|-----------------|------------:|-----------:|
| `opencomic-ai-descreen-hard-compact` | Compact | `opencomic-ai-artifact-removal-compact` | 120,000 | 450,000 |
| `opencomic-ai-descreen-hard-lite` | ESRGAN Lite | `opencomic-ai-artifact-removal-lite` | 120,000 | 1,000,000 |
| `opencomic-ai-descreen-hard` | ESRGAN | `opencomic-ai-artifact-removal` | 120,000 | 1,000,000 |

### Upscale

| Model | Type | Pretrained From | Image Pairs | Iterations |
|------|------|-----------------|------------:|-----------:|
| `opencomic-ai-upscale-2x-compact` | Compact | `opencomic-ai-artifact-removal-compact` | 25,000 | 450,000 |
| `opencomic-ai-upscale-2x-lite` | ESRGAN Lite | `opencomic-ai-artifact-removal-lite` | 25,000 | 1,000,000 |
| `opencomic-ai-upscale-2x` | ESRGAN | `opencomic-ai-artifact-removal` | 25,000 | 1,000,000 |
| `opencomic-ai-upscale-3x-compact` | Compact | `opencomic-ai-upscale-2x-compact` | 100,000 | 450,000 |
| `opencomic-ai-upscale-3x-lite` | ESRGAN Lite | `opencomic-ai-upscale-2x-lite` | 100,000 | 500,000 |
| `opencomic-ai-upscale-3x` | ESRGAN | `opencomic-ai-upscale-2x` | 100,000 | 500,000 |
| `opencomic-ai-upscale-4x-compact` | Compact | `opencomic-ai-upscale-2x-compact` | 100,000 | 450,000 |
| `opencomic-ai-upscale-4x-lite` | ESRGAN Lite | `opencomic-ai-upscale-2x-lite` | 100,000 | 500,000 |
| `opencomic-ai-upscale-4x` | ESRGAN | `opencomic-ai-upscale-2x` | 100,000 | 500,000 |

## Acknowledgements

- Krita team
- kra-remote plugin by [NMaghfurUsman](https://github.com/NMaghfurUsman)
- traiNNer-redux by [the-database](https://github.com/the-database)

## License

MIT. See [LICENSE](LICENSE).