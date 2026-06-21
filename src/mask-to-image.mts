import p from 'path';
import fs from 'fs';
import os from 'os';
import sharp from 'sharp';

sharp.concurrency(os.cpus().length);

function getArg(arg: string): string | null
{
	const index = process.argv.indexOf(arg);
	if(index === -1) return null;

	const value = process.argv[index + 1];
	if(!value || value.startsWith('--')) return null;

	return value;
}

function resolve(path: string): string
{
	if(!p.isAbsolute(path))
	{
		if(typeof module !== 'undefined')
			path = p.resolve(module?.parent?.path ?? '', '../', path);
		else
			path = p.resolve(import.meta?.dirname ?? '', '../', path);
	}

	return p.normalize(path);
}

const dataset = resolve(getArg('--dataset') || '');
const size = parseInt(getArg('--size') || '512', 10);
const dilateValue = parseInt(getArg('--dilate') || '2', 10);
const threshold = parseInt(getArg('--threshold') || '0', 10); // 128 half

const panel = p.join(dataset, 'degraded');
const mask = p.join(dataset, 'mask');

if(!dataset || !fs.existsSync(panel) || !fs.existsSync(mask))
{
	console.log(`
	Usage:
	  npm run prepare && node ./dist/mask-to-image.mjs --dataset ./datasets/opencomic-ai-panels --size 512 --dilate 2

	Arguments:
	  --dataset: Path to the dataset directory containing 'degraded' and 'mask' subdirectories (must exist).
	  --size: Size to resize the images to (default: 512).
	  --dilate: Value for dilating the mask (default: 2).
	`);

	process.exit(1);
}

const outputClean = p.join(dataset, 'esrgan', 'clean');
const outputDegraded = p.join(dataset, 'esrgan', 'degraded');

if(!fs.existsSync(outputClean))
	fs.mkdirSync(outputClean, {recursive: true});

if(!fs.existsSync(outputDegraded))
	fs.mkdirSync(outputDegraded, {recursive: true});

const panels = [];
const masks: Record<string, string[]> = {};

const files = fs.readdirSync(panel);
const masksFiles = fs.readdirSync(mask);

function getKey(file: string): string
{
	return p.parse(file).name.split('-').slice(0, 2).join('-');
}

for(const file of masksFiles)
{
	const path = p.join(mask, file);

	const key = getKey(file);
	const maskPaths = masks[key] ?? (masks[key] = []);
	maskPaths.push(path);
}

for(const file of files)
{
	const path = p.join(panel, file);
	const key = getKey(file);

	let canvas = sharp({
		create: {
			width: size,
			height: size,
			channels: 3,
			background: {r: 0, g: 0, b: 0}
		}
	});

	const composite = [];
	let i = 0;

	const drawed = new Uint8Array(size * size).fill(0);

	for(const maskPath of masks[key] || [])
	{
		const alpha = await sharp(maskPath).resize({
			width: size,
			height: size,
			// kernel: sharp.kernel.lanczos3,
			fit: 'fill'
		})/*.dilate(1)*/.raw().toBuffer();

		// Dialte correctly
		const negate = await sharp(maskPath).resize({
			width: size,
			height: size,
			// kernel: sharp.kernel.lanczos3,
			fit: 'fill'
		}).negate().raw().toBuffer();

		const _dilate = await sharp(negate, {
			raw: {
				width: size,
				height: size,
				channels: 3,
			}
		}).dilate(dilateValue).raw().toBuffer();

		const dilate = await sharp(_dilate, {
			raw: {
				width: size,
				height: size,
				channels: 3,
			}
		}).negate().raw().toBuffer();

		/*
		await sharp(dilate, {
			raw: {
				width: size,
				height: size,
				channels: 3,
			}
		}).toFile(p.join(outputClean, `${key}-dilate-${i}.png`));
		*/

		const rgba = Buffer.alloc(size * size * 4);

		for(let i = 0, j = 0; i < alpha.length; i++, j += 4)
		{
			rgba[j] = 255;
			rgba[j + 1] = 255;
			rgba[j + 2] = 255;
			rgba[j + 3] = drawed[i] > 0 ? Math.round(alpha[i * 3] * (1 - (drawed[i] / 255))) : alpha[i * 3];
		}

		for(let i = 0; i < drawed.length; i++)
		{
			drawed[i] = Math.max(drawed[i], dilate[i * 3]);
		}

		const layer = await sharp(rgba, {
			raw: {
				width: size,
				height: size,
				channels: 4,
			}
		}).png().toBuffer();

		// await sharp(layer).toFile(p.join(outputClean, `${key}-mask-${i}.png`));

		composite.push({
			input: layer,
			left: 0,
			top: 0
		});

		i++;
	}

	const composited = await canvas.composite(composite).raw().toBuffer();

	canvas = sharp(composited, {
		raw: {
			width: size,
			height: size,
			channels: 4,
		}
	});

	//if(threshold)
	//	canvas = canvas.threshold(threshold);

	await canvas.jpeg({quality: 100}).toFile(p.join(outputClean, file));

	await sharp(path).resize({
		width: size,
		height: size,
		kernel: sharp.kernel.lanczos3,
		fit: 'fill'
	}).jpeg({quality: 100}).toFile(p.join(outputDegraded, file));

}