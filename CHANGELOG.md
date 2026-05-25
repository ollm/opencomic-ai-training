# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## OpenComic AI v1.1

### New

- Add circles and circles with a dot inside to avoid descreen them (Like eyes) [`17bddcc`](https://github.com/ollm/OpenComic/commit/17bddcc36f9bbeb7527d5004bdf91f273b32174a)

## OpenComic AI v1.0

### Added

- Initial release with the first trained model set.

### Models

#### Artifact Removal

| Model | Type | Pretrained From | Image Pairs | Iterations |
| --- | --- | --- | ---: | ---: |
| `opencomic-ai-artifact-removal-compact` | Compact | - | 400,000 | 450,000 |
| `opencomic-ai-artifact-removal-lite` | ESRGAN Lite | - | 400,000 | 1,000,000 |
| `opencomic-ai-artifact-removal` | ESRGAN | - | 400,000 | 1,000,000 |

#### Descreen

| Model | Type | Pretrained From | Image Pairs | Iterations |
| --- | --- | --- | ---: | ---: |
| `opencomic-ai-descreen-hard-compact` | Compact | `artifact-removal-compact` | 120,000 | 450,000 |
| `opencomic-ai-descreen-hard-lite` | ESRGAN Lite | `artifact-removal-lite` | 120,000 | 1,000,000 |
| `opencomic-ai-descreen-hard` | ESRGAN | `artifact-removal` | 120,000 | 1,000,000 |

#### Upscale

| Model | Type | Pretrained From | Image Pairs | Iterations |
| --- | --- | --- | ---: | ---: |
| `opencomic-ai-upscale-2x-compact` | Compact | `artifact-removal-compact` | 25,000 | 450,000 |
| `opencomic-ai-upscale-2x-lite` | ESRGAN Lite | `artifact-removal-lite` | 25,000 | 1,000,000 |
| `opencomic-ai-upscale-2x` | ESRGAN | `artifact-removal` | 25,000 | 1,000,000 |
| `opencomic-ai-upscale-3x-compact` | Compact | `upscale-2x-compact` | 100,000 | 450,000 |
| `opencomic-ai-upscale-3x-lite` | ESRGAN Lite | `upscale-2x-lite` | 100,000 | 500,000 |
| `opencomic-ai-upscale-3x` | ESRGAN | `upscale-2x` | 100,000 | 500,000 |
| `opencomic-ai-upscale-4x-compact` | Compact | `upscale-2x-compact` | 100,000 | 450,000 |
| `opencomic-ai-upscale-4x-lite` | ESRGAN Lite | `upscale-2x-lite` | 100,000 | 500,000 |
| `opencomic-ai-upscale-4x` | ESRGAN | `upscale-2x` | 100,000 | 500,000 |