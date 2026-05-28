# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## OpenComic AI v2.0

### New

##### Artifact Removal

- Add small blur and resize after compression to better detect artifacts [`d837c71`](https://github.com/ollm/opencomic-ai-training/commit/d837c717152c6f50fd5dc27b24672e830e1b42e9)
- Add AVIF and JXL compression [`95ce60b`](https://github.com/ollm/opencomic-ai-training/commit/95ce60b2183a1b1c9dca3b3bb8bad926cc13d639)

##### Descreen

- Add circles and circles with a dot inside to avoid descreen them (Like eyes) [`17bddcc`](https://github.com/ollm/opencomic-ai-training/commit/17bddcc36f9bbeb7527d5004bdf91f273b32174a)
- Add parallel lines and grids to avoid descreen them [`33b5d43`](https://github.com/ollm/opencomic-ai-training/commit/33b5d4374e34bf53c9db2767934cedc7918108ec)
- Fix descreening causing some edges or very dark images with halftone to brighten [`435fbf9`](https://github.com/ollm/opencomic-ai-training/commit/435fbf9517858f490279c4c67d2875756b9034de)

##### Upscale

- Disable independent channels halftone in not colored to avoid black and white upscales from becoming colored [`880c18e`](https://github.com/ollm/opencomic-ai-training/commit/880c18eb76270c1247821411d7f267ec37259bb9)

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