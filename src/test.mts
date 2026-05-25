import sharp from './degradation/sharp.mjs';
import fs from 'fs/promises';

const degradation = {
    kernel: 'bilinear',
    clean: {
        kernel: 'lanczos3',
    },
    scale: 0.22,
}

const image = await fs.readFile('datasets/opencomic-ai-upscale-3x-new/clean/0000000036-0004.jpg');

const buffer1 = await sharp.resize({}, degradation, image, true);
const buffer2 = await sharp.resize({}, degradation, image, false);

await fs.writeFile('degraded.png', buffer1);
await fs.writeFile('clean.png', buffer2);