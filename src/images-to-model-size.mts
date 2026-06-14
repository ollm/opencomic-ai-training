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

const input = resolve(getArg('--input') || '');
const output = resolve(getArg('--output') || '');
const size = parseInt(getArg('--size') || '256', 10);

if(!input || !output || !process.argv.includes('--input') || !process.argv.includes('--output') || !fs.existsSync(input) || !fs.existsSync(output))
{
	console.log(`


	`);

	process.exit(1);
}

const images = fs.readdirSync(input);

for(const image of images)
{
	const path = p.join(input, image);

	if(!image.endsWith('.jpg') && !image.endsWith('.jpeg') && !image.endsWith('.png'))
		continue;

	await sharp(path).resize({
		width: size,
		height: size,
		kernel: sharp.kernel.lanczos3,
		fit: 'fill'
	}).jpeg({quality: 100}).toFile(p.join(output, image));
}