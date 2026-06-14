import p from 'path';
import fs from 'fs';
import sharp from 'sharp';
import {flattenSVG} from 'flatten-svg';
import {createSVGWindow} from 'svgdom';

import potrace from './potrace.mjs';

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

const image = resolve(getArg('--image') || '');
const dir = resolve(getArg('--images-dir') || '');
const dest = resolve(getArg('--dest') || './labels');
const maxError = +(getArg('--max-error') || 1);
const minSize = +(getArg('--min-size') || 100);
const threshold = +(getArg('--threshold') || 0);

const images: string[] = [];

if(dir && process.argv.includes('--images-dir'))
{
	const files = fs.readdirSync(dir);

	for(const file of files)
	{
		const ext = p.extname(file).toLowerCase();

		if(ext === '.png' || ext === '.jpg' || ext === '.jpeg')
		{
			images.push(resolve(p.join(dir, file)));
		}
	}
}

if(image && process.argv.includes('--image'))
{
	images.push(image);
}

if(!dest || !images.length)
{
	console.log(`
	Generate a dataset of clean and degraded images using Krita, based on a YAML configuration file.

	Usage:
	  npm run prepare && node ./dist/mask-to-labels.mjs --images-dir ./fodler-with-mask --dest ./output-labels

	Arguments:
	  --image <file>                      Path to a single mask image (PNG, JPG, JPEG).
	  --images-dir <folder>               Path to a directory containing mask images (PNG, JPG, JPEG).
	  --dest <folder>                     Path to the output directory for label files (default: ./labels).
	  --max-error <number>                Maximum error for flattening SVG paths (default: 1).
	  --min-size <number>                 Minimum size of connected components to consider (default: 100).
	  --threshold <number>                Threshold for binarizing the mask (default: 0).
	`);

	process.exit(1);
}

if(!fs.existsSync(dest))
	fs.mkdirSync(dest, {recursive: true});

const total = images.length;

for(let i = 0; i < images.length; i++)
{
	const image = images[i];

	const {data, info} = await sharp(image).raw().toBuffer({resolveWithObject: true});
	const {width, height, channels} = info;

	const maskData = normalizeMask(data, width, height, channels);

	const components = getComponents(maskData, width, height);
	const labels: number[][] = [];

	for(const component of components)
	{
		const path = await potrace(component, width, height);
		const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="black" d="${path}"/></svg>`;
		const thisLabels: number[] = [];

		const window = createSVGWindow();
		window.document.documentElement.innerHTML = svg;
		const paths = flattenSVG(window.document.documentElement, {maxError});

		for(const line of paths)
		{
			for(const point of line.points)
			{
				const x = point[0] / width;
				const y = point[1] / height;

				if(Number.isFinite(x) && Number.isFinite(y))
					thisLabels.push(x, y);
			}
		}

		labels.push(thisLabels);
	}

	const yoloClassId = 0;
	const lines = labels.filter(label => label.length >= 6 && label.length % 2 === 0).map(label => `${yoloClassId} ${label.join(' ')}`);

	const name = p.basename(image, p.extname(image));
	fs.writeFileSync(p.join(dest, `${name}.txt`), lines.join('\n'));

	console.log(`Processed ${i + 1}/${total}: ${p.basename(image)} -> ${lines.length} labels`);

}

function normalizeMask(data: Buffer, width: number, height: number, channels: number): Uint8Array
{
	const mask = new Uint8Array(width * height);

	let alphaMask = false; // Check if the mask use white or transparent pixels

	if(channels >= 4)
	{
		for(let i = 0; i < width * height; i++)
		{
			const a = data[i * channels + 3];

			if(a < 255)
			{
				alphaMask = true;
				break;
			}
		}
	}

	for(let i = 0; i < width * height; i++)
	{
		const r = data[i * channels];
		const g = data[i * channels + 1];
		const b = data[i * channels + 2];
		const a = data[i * channels + 3];

		let value = 0;

		switch(channels)
		{
			case 1:
				value = r;
				break;
			case 2:
				value = r;
				break;
			case 3:
				value = (r + g + b) / 3;
				break;
			case 4:
				value = !alphaMask ? Math.ceil((r + g + b) / 3) : a;
				break;
			default:
				value = 2;
		}

		mask[i] = value > threshold ? 255 : 0;
	}

	return mask;
}

interface Component {
	size: number;
	pixels: number[];
}

// Extracted from https://github.com/ollm/opencomic-ai-bin/blob/6936ff2ee204dff4959c2409657166de4b2ac5bd/src/yolo/detect.mts#L348
function getComponents(mask: Uint8Array, width: number, height: number): Uint8Array[] {

	const totalPixels = width * height;
	const visited = new Uint8Array(totalPixels);
	const components: Component[] = [];

	for(let i = 0; i < totalPixels; i++)
	{
		if(mask[i] > 0 && !visited[i])
		{
			const component: Component = {size: 0, pixels: []};
			const queue = [i];

			visited[i] = 1;

			while(queue.length > 0)
			{
				const idx = queue.shift()!;
				component.pixels.push(idx);
				component.size++;

				const x = idx % width;
				const y = Math.floor(idx / width);

				// Check 4-connected neighbors
				const neighbors = [
					idx - width, // top
					idx + width, // bottom
					idx - 1,     // left
					idx + 1,     // right
				];

				for(const nIdx of neighbors)
				{
					if(nIdx >= 0 && nIdx < totalPixels && mask[nIdx] > 0 && !visited[nIdx] && Math.abs((nIdx % width) - x) <= 1)
					{
						visited[nIdx] = 1;
						queue.push(nIdx);
					}
				}
			}

			components.push(component);
		}
	}

	const filtered = components.filter(c => c.size >= minSize);

	const result = filtered.map(function(c) {

		const componentMask = new Uint8Array(totalPixels).fill(0);

		for(const idx of c.pixels)
		{
			componentMask[idx] = 255;
		}

		return componentMask;

	});

	return result;
}