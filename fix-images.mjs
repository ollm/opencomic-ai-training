import sharp from 'sharp';
import fs from 'fs';
import p from 'path';

function getArg(arg)
{
	const index = process.argv.indexOf(arg);
	if(index === -1) return null;

	const value = process.argv[index + 1];
	if(!value || value.startsWith('--')) return null;

	return value;
}

const dataset = getArg('--dataset');
let scale = getArg('--scale');

if(!scale)
{
	if(dataset)
	{
		const match = dataset.match(/([0-9]+)x|x([0-9]+)/);
		scale = +(match?.[1] || match?.[2] || 1);
	}

	if(!scale || Number.isNaN(scale))
		scale = 1;
}

const PRINT = process.argv.includes('--print');
const DELETE = process.argv.includes('--delete');

if(!dataset)
{
	console.log(`
Check dataset consistency between clean and degraded images

Usage:
  node fix-images.mjs --dataset opencomic-ai-upscale-2x --scale 2

Arguments:
  --dataset   Dataset name (required)
  --scale     Scale factor (optional, auto-detected from dataset name)
  --print     Print mismatched rows
  --delete    Delete unmatched images
`);

	process.exit(0);
}

console.log('');

console.log([
	`Dataset : ${dataset}`,
	`Scale   : ${scale}`,
	`Print   : ${PRINT}`,
	`Delete  : ${DELETE}`
].join('\n')+'\n');

const folder = p.join('./datasets', dataset);
const path = p.join(import.meta.dirname, folder);

const filesC = fs.readdirSync(p.join(path, 'clean'));
const filesD = fs.readdirSync(p.join(path, 'degraded'));

if(!fs.existsSync(path))
	throw new Error('Path does not exist: ' + path);

const files = [...new Set([...filesC, ...filesD])];

let count = 0;
let all = 0;

for(const file of files)
{
	if(file.startsWith('.')) continue;

	const clean = p.join(path, 'clean', file);
	const degraded = p.join(path, 'degraded', file);

	let _delete = false;

	if(!fs.existsSync(clean) || !fs.existsSync(degraded))
	{
		_delete = true;
	}
	else
	{
		const size = await sharp(clean).metadata();
		const sizeD = await sharp(degraded).metadata();

		if(size.width !== sizeD.width * scale || size.height !== sizeD.height * scale)
		{
			if(PRINT)
				console.log(`Mismatched size: ${file} (clean: ${size.width}x${size.height}, degraded: ${sizeD.width}x${sizeD.height})`);

			_delete = true;
		}
	}

	if(_delete)
	{
		if(DELETE)
		{
			if(fs.existsSync(clean)) fs.unlinkSync(clean);
			if(fs.existsSync(degraded)) fs.unlinkSync(degraded);

			console.log(`Deleted: ${file}`);
		}

		count++;
	}


	all++;
}

console.log(`Total mismatched files: ${count} / ${all} (${((count / all) * 100).toFixed(2)}%)`);
console.log('');