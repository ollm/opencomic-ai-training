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
const type = getArg('--type') || 'normal';
const dilateValue = parseInt(getArg('--dilate') || '2', 10);
const erodeValue = parseInt(getArg('--erode') || '0', 10);
const threshold = parseInt(getArg('--threshold') || '0', 10); // 128 half
const start = parseInt(getArg('--start') || '0', 10);

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

async function dilateErode(type: 'dilate' | 'erode', image: Buffer, value: number): Promise<Buffer>
{
	const bk = sharp({
		create: {
			width: size + 6,
			height: size + 6,
			channels: 3,
			background: {r: 255, g: 255, b: 255}
		}
	});

	const negate = await sharp(image).negate().png().toBuffer();

	const composited = await bk.composite([{
		input: negate,
		left: 3,
		top: 3,
	}]).png().toBuffer();

	let doe: sharp.Sharp | Buffer = sharp(composited);

	if(type === 'dilate')
		doe = doe.dilate(value);
	else
		doe = doe.erode(value);

	doe = await doe.png().toBuffer();

	// await sharp(doe).toFile(p.join(outputClean, `doe-${Math.random()}.png`));

	const final = await sharp(doe).extract({
		left: 3,
		top: 3,
		width: size,
		height: size,
	}).removeAlpha().negate().png().toBuffer();

	return final;
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

function getNumber(file: string): number
{
	return parseInt(p.parse(file).name.split('-')[0]);
}

for(const file of masksFiles)
{
	const path = p.join(mask, file);

	const key = getKey(file);
	const maskPaths = masks[key] ?? (masks[key] = []);
	maskPaths.push(path);
}

const BORDER = type === 'border' || type === 'border-pixelated';
const CHANNELS = type === 'channels' || type === 'channels-pixelated' || type === 'channels-inverted' || type === 'channels-inverted-pixelated';
const PIXELATED = type === 'border-pixelated' || type === 'channels-pixelated' || type === 'channels-inverted-pixelated';
const INVERTED = type === 'channels-inverted' || type === 'channels-inverted-pixelated';

for(const file of files)
{
	if(start > 0)
	{
		const number = getNumber(file);

		if(number < start)
			continue;
	}

	const path = p.join(panel, file);
	const key = getKey(file);

	const filePng = p.parse(file).name + '.png';

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

		let rgba = Buffer.alloc(size * size * 4);

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

		if(BORDER)
		{
			for(let i = 0, j = 0; i < rgba.length; i++, j += 4)
			{
				const color = rgba[j + 3];

				rgba[j] = color;
				rgba[j + 1] = color;
				rgba[j + 2] = color;
				rgba[j + 3] = 255;
			}

			const layer = await sharp(rgba, {
				raw: {
					width: size,
					height: size,
					channels: 4,
				}
			}).removeAlpha().png().toBuffer();

			// await sharp(layer).toFile(p.join(outputClean, `${key}-layer-${i}.png`));

			const erode = await dilateErode('erode', layer, erodeValue || dilateValue);

			// await sharp(erode).toFile(p.join(outputClean, `${key}-erode-${i}.png`));

			const border = await sharp(layer).composite([{
				input: erode,
				blend: 'difference',
			}]).raw().toBuffer();

			for(let i = 0, j = 0; i < border.length; i++, j += 4)
			{
				const color = border[j];

				border[j] = 255;
				border[j + 1] = 255;
				border[j + 2] = 255;
				border[j + 3] = color;
			}

			rgba = border as Buffer<ArrayBuffer>;
		}

		let layer = await sharp(rgba, {
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

	if(BORDER)
	{
		let green = await canvas.raw().toBuffer();

		for(let i = 0, j = 0; i < green.length; i++, j += 4)
		{
			const color = green[j];

			green[j] = 0;
			green[j + 1] = 255;
			green[j + 2] = 0;
			green[j + 3] = type === 'border-pixelated' ? (color > 127 ? 255 : 0) : color;
		}

		let degraded = sharp(path).resize({
			width: size,
			height: size,
			kernel: sharp.kernel.lanczos3,
			fit: 'fill'
		});

		degraded.grayscale().toColourspace('srgb');

		/*await sharp(green, {raw: {
			width: size,
			height: size,
			channels: 4,
		}}).toFile(p.join(outputClean, `${key}-green-${i}.png`));*/

		canvas = sharp(await degraded.png().toBuffer()).composite([{
			input: green,
			raw: {
				width: size,
				height: size,
				channels: 4,
			},
		}]).toColourspace('srgb');
	}
	else if(CHANNELS)
	{
		let degraded = sharp(path).resize({
			width: size,
			height: size,
			kernel: sharp.kernel.lanczos3,
			fit: 'fill'
		});

		const grayscale = await degraded.grayscale().raw().toBuffer();
		const raw = Buffer.alloc(size * size * 4);

		for(let i = 0, j = 0; i < grayscale.length; i++, j += 4)
		{
			const value = grayscale[i];

			raw[j] = value;
			raw[j + 1] = 0; // G = 0
			raw[j + 2] = value;
			raw[j + 3] = 255;
		}

		let green = await canvas.raw().toBuffer();

		for(let i = 0, j = 0; j < green.length; i++, j += 4)
		{
			const color = INVERTED ? 255 - green[j] : green[j];
			raw[j + 1] = PIXELATED ? (color > 127 ? 255 : 0) : color;
		}

		canvas = sharp(raw, {
			raw: {
				width: size,
				height: size,
				channels: 4,
			},
		}).removeAlpha().toColourspace('srgb');
	}

	await canvas.png().toFile(p.join(outputClean, filePng));

	// Degraded
	let degraded = sharp(path).resize({
		width: size,
		height: size,
		kernel: sharp.kernel.lanczos3,
		fit: 'fill'
	});

	if(BORDER || type === 'grayscale')
	{
		degraded.grayscale().toColourspace('srgb');
	}
	else if(CHANNELS)
	{
		degraded.grayscale().recomb([
			[1, 0, 0],
			[0, 0, 0], // G = 0
			[0, 0, 1],
		]);
	}

	await degraded.png().toFile(p.join(outputDegraded, filePng));

	// process.exit(1);

}