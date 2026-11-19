import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

function getArg(name, fallback = null)
{
	const index = process.argv.indexOf(name);
	if(index === -1) return fallback;

	const value = process.argv[index + 1];
	if(!value || value.startsWith('--'))
		throw new Error(`Missing value for ${name}`);

	return value;
}

function numberArg(name, fallback, min, max = Infinity)
{
	const value = Number(getArg(name, fallback));

	if(!Number.isFinite(value) || value < min || value > max)
		throw new Error(`Invalid value for ${name}: ${value}`);

	return value;
}

function imageFiles(directory)
{
	return fs.readdir(directory, {withFileTypes: true}).then(entries => {
		const files = new Map();
		const extensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.tif', '.tiff', '.webp']);

		for(const entry of entries)
		{
			if(!entry.isFile() || entry.name.startsWith('.'))
				continue;

			const extension = path.extname(entry.name).toLowerCase();

			if(!extensions.has(extension))
				continue;

			const stem = path.basename(entry.name, path.extname(entry.name));

			if(files.has(stem))
				throw new Error(`Multiple images with the same name "${stem}" in ${directory}`);

			files.set(stem, path.join(directory, entry.name));
		}

		return files;
	});
}

function samplePositions(width, height, maxShift, maxSamples, name)
{
	const innerWidth = width - maxShift * 2;
	const innerHeight = height - maxShift * 2;
	const count = Math.min(maxSamples, innerWidth * innerHeight);
	const positions = new Int32Array(count);
	let seed = 2166136261;

	for(let i = 0; i < name.length; i++)
		seed = Math.imul(seed ^ name.charCodeAt(i), 16777619) >>> 0;

	if(seed === 0)
		seed = 1;

	if(count === innerWidth * innerHeight)
	{
		for(let y = maxShift, i = 0; y < height - maxShift; y++)
		{
			for(let x = maxShift; x < width - maxShift; x++)
				positions[i++] = y * width + x;
		}

		return positions;
	}

	for(let i = 0; i < count; i++)
	{
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		const x = maxShift + Math.floor(seed / 0x100000000 * innerWidth);
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		const y = maxShift + Math.floor(seed / 0x100000000 * innerHeight);
		positions[i] = y * width + x;
	}

	return positions;
}

function correlation(clean, degraded, width, dx, dy, positions)
{
	let sumClean = 0;
	let sumDegraded = 0;
	let sumCleanSquared = 0;
	let sumDegradedSquared = 0;
	let sumProduct = 0;
	const count = positions.length;

	for(let i = 0; i < count; i++)
	{
		const cleanValue = clean[positions[i]];
		const degradedValue = degraded[positions[i] + dy * width + dx];

		sumClean += cleanValue;
		sumDegraded += degradedValue;
		sumCleanSquared += cleanValue * cleanValue;
		sumDegradedSquared += degradedValue * degradedValue;
		sumProduct += cleanValue * degradedValue;
	}

	const covariance = sumProduct - sumClean * sumDegraded / count;
	const varianceClean = sumCleanSquared - sumClean * sumClean / count;
	const varianceDegraded = sumDegradedSquared - sumDegraded * sumDegraded / count;

	if(varianceClean <= 0 || varianceDegraded <= 0)
		return -1;

	return covariance / Math.sqrt(varianceClean * varianceDegraded);
}

async function loadForAlignment(file)
{
	return sharp(file)
		.rotate()
		.greyscale()
		.blur(1.2)
		.raw()
		.toBuffer({resolveWithObject: true});
}

const help = process.argv.includes('--help') || process.argv.includes('-h');
const dataset = getArg('--dataset');

if(help || !dataset)
{
	console.log(`
Detect small translations between clean and degraded image pairs.

Usage:
  node check-desaligned.mjs --dataset opencomic-ai-artifact-removal-fixed

Arguments:
  --dataset       Dataset folder under ./datasets (required)
  --clean         Clean folder name (default: clean)
  --degraded      Degraded folder name (default: degraded)
  --only          Check one filename or image basename (optional)
  --max-shift     Maximum translation to search in pixels (default: 1)
  --max-samples   Approximate pixel samples per image (default: 20000)
  --min-improvement
                  Minimum correlation gain over zero-shift to report (default: 0.01)
  --min-correlation
                  Minimum best-shift correlation to report (default: 0.5)
  --help          Show this help

The script only reads images and reports possible misalignment; it does not modify them.
`);

	if(!help)
		process.exitCode = 1;
}
else
{
	const cleanFolder = getArg('--clean', 'clean');
	const degradedFolder = getArg('--degraded', 'degraded');
	const maxShift = Math.floor(numberArg('--max-shift', 1, 1, 32));
	const maxSamples = Math.floor(numberArg('--max-samples', 20000, 100));
	const minImprovement = numberArg('--min-improvement', 0.01, 0, 2);
	const minCorrelation = numberArg('--min-correlation', 0.5, -1, 1);
	const datasetsPath = path.resolve(import.meta.dirname, 'datasets');
	const datasetPath = path.resolve(datasetsPath, dataset);

	if(datasetPath === datasetsPath || !datasetPath.startsWith(datasetsPath + path.sep))
		throw new Error(`Dataset must be inside ${datasetsPath}`);

	const cleanPath = path.resolve(datasetPath, cleanFolder);
	const degradedPath = path.resolve(datasetPath, degradedFolder);

	if(!cleanPath.startsWith(datasetPath + path.sep) || !degradedPath.startsWith(datasetPath + path.sep))
		throw new Error('Image folders must be inside the dataset directory');

	const [cleanFiles, degradedFiles] = await Promise.all([
		imageFiles(cleanPath),
		imageFiles(degradedPath),
	]);

	const names = [...new Set([...cleanFiles.keys(), ...degradedFiles.keys()])].sort();
	const only = getArg('--only');
	const onlyName = only ? path.basename(only, path.extname(only)) : null;
	const selectedNames = onlyName ? names.filter(name => name === onlyName) : names;
	let checked = 0;
	let misaligned = 0;
	let unpaired = 0;
	let sizeMismatch = 0;
	let failed = 0;

	if(onlyName && selectedNames.length === 0)
		throw new Error(`Image not found in either folder: ${only}`);

	console.log(`Dataset: ${dataset}`);
	console.log(`Clean: ${cleanPath}`);
	console.log(`Degraded: ${degradedPath}`);
	console.log(`Pairs: ${selectedNames.length}, search range: ±${maxShift}px\n`);

	for(let index = 0; index < selectedNames.length; index++)
	{
		const name = selectedNames[index];
		const cleanFile = cleanFiles.get(name);
		const degradedFile = degradedFiles.get(name);

		if(!cleanFile || !degradedFile)
		{
			console.log(`Unpaired: ${name} (missing ${cleanFile ? 'degraded' : 'clean'} image)`);
			unpaired++;
			continue;
		}

		try
		{
			const [cleanImage, degradedImage] = await Promise.all([
				loadForAlignment(cleanFile),
				loadForAlignment(degradedFile),
			]);

			const width = cleanImage.info.width;
			const height = cleanImage.info.height;
			checked++;

			if(width !== degradedImage.info.width || height !== degradedImage.info.height)
			{
				console.log(`Size mismatch: ${name} (clean: ${width}x${height}, degraded: ${degradedImage.info.width}x${degradedImage.info.height})`);
				sizeMismatch++;
				continue;
			}

			if(width <= maxShift * 2 || height <= maxShift * 2)
			{
				console.log(`Too small to check: ${name} (${width}x${height})`);
				continue;
			}

			const positions = samplePositions(width, height, maxShift, maxSamples, name);
			let best = {dx: 0, dy: 0, score: -Infinity};
			let zeroScore = -Infinity;

			for(let dy = -maxShift; dy <= maxShift; dy++)
			{
				for(let dx = -maxShift; dx <= maxShift; dx++)
				{
					const score = correlation(cleanImage.data, degradedImage.data, width, dx, dy, positions);

					if(dx === 0 && dy === 0)
						zeroScore = score;

					if(score > best.score)
						best = {dx, dy, score};
				}
			}

			const improvement = best.score - zeroScore;

			if((best.dx !== 0 || best.dy !== 0) && best.score >= minCorrelation && improvement >= minImprovement)
			{
				console.log(
					`Possible misalignment: ${name} (degraded offset ${best.dx >= 0 ? '+' : ''}${best.dx}px, ${best.dy >= 0 ? '+' : ''}${best.dy}px; ` +
					`correlation ${best.score.toFixed(4)} vs ${zeroScore.toFixed(4)} at zero shift)`,
				);
				misaligned++;
			}
		}
		catch(error)
		{
			console.error(`Failed to check ${name}:`, error);
			failed++;
		}

		if(!onlyName && (index + 1) % 500 === 0)
			console.log(`Progress: ${index + 1} / ${selectedNames.length}`);
	}

	console.log(
		`\nChecked: ${checked} | Possible misalignments: ${misaligned} | ` +
		`Unpaired: ${unpaired} | Size mismatches: ${sizeMismatch} | Failed: ${failed}`,
	);

	if(failed > 0)
		process.exitCode = 1;
}
