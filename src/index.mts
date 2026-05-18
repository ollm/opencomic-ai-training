import p from 'path';
import fs from 'fs';
import cliProgress from 'cli-progress';
import {parseArgs, styleText} from 'node:util';
import canvas from '@napi-rs/canvas';
import zlib from 'zlib';

// import outline from './drawings/outline.mjs';
import resolve from './resolve.mjs';
import coords, {CubicBezierOptions} from './coords.mjs';
import _options from './options.mjs';
import krita from './krita.mjs';
import drawing from './drawing.mjs';

const ___dirname = typeof __dirname !== 'undefined' ? __dirname : import.meta.dirname;

function getArgValue(flag: string, defaultValue: any = null) {

	const index = process.argv.findIndex((a: string) => a.startsWith(flag));
	if(index === -1) return defaultValue;
	return process.argv[index + 1];

}

const file = getArgValue('--options', null);
const options = file ? _options.load(resolve(file)) : false;

const kritaPath = getArgValue('--krita', null);
const restartKritaEvery = getArgValue('--restart-krita-every', 20);

const printOptions = process.argv.includes('--print-options');
const printKritaFilters = process.argv.includes('--print-krita-filters');
const printKritaGradients = process.argv.includes('--print-krita-gradients');
// const printKritaResources = process.argv.includes('--print-krita-resources');

const help = process.argv.includes('--help') || process.argv.includes('-h');
const dev = process.argv.includes('--dev');

if(help || !file || !kritaPath || !options)
{

	console.log(`
Generate a dataset of clean and degraded images using Krita, based on a YAML configuration file.

Usage:
  npm run prepare && npm run generate -- --options ./options/opencomic-ai-upscale-3x.yml --krita ./krita-5.3.1-x86_64.AppImage

Arguments:
  --options <file>                    Path to the options file (YAML).
  --krita <path>                      Path to the Krita executable or AppImage (Krita 5.3.0 or later with the kra-remote plugin).
  --restart-krita-every <number>      Restart Krita every N images to avoid memory leaks (default: 20).
  --print-options                     Print the loaded options (Randomized) and exit.
  --print-krita-filters               Print the Krita plugin filters and exit.
  --print-krita-gradients             Print the Krita plugin gradients and exit.
  --help, -h                          Show this help message.
`);

	process.exit(0);
}

if(printOptions && options)
{
	console.log(options);
	console.log(JSON.stringify(options));
	process.exit(0);
}

console.log(`${styleText(['bold', 'greenBright'], 'Options detected:')} ${file}`);
console.log(`Generating ${styleText(['bold', 'cyanBright'], options.images.toString())} clean images, with ${styleText(['bold', 'cyanBright'], options.degradedImagesPerCleanImage.toString())} degraded images per clean image, for a total of ${styleText(['bold', 'cyanBright'], (options.images * options.degradedImagesPerCleanImage).toString())} final images.`);

console.log('');

// Progress Bar
const progressBar = new cliProgress.SingleBar({
	format: [
		// Title
		styleText(['bold', 'whiteBright'], 'Generating Images'),
		`| ${styleText(['bold', 'greenBright'], '{bar}')}`,
		`| ${styleText(['bold', 'greenBright'], '{percentage}%')}`,
		// Clean images
		`| ${styleText(['bold', 'greenBright'], '{value}')}/${styleText(['bold', 'cyanBright'], '{total}')} Clean Images`,
		// Degraded images
		`| ${styleText(['bold', 'yellowBright'], '{degradedImages}')}/${styleText(['bold', 'cyanBright'], '{totalDegradedImages}')} Final Images ${styleText(['dim'], '(Images × Degraded)')}`,
		// Speed, Elapsed, Remaining
		`| Speed: ${styleText(['bold', 'yellowBright'], '{speed}')}`,
		`| Elapsed: ${styleText(['bold', 'magentaBright'], '{duration_formatted}')}`,
		`| Remaining: ${styleText(['bold', 'redBright'], '{eta_formatted}')}`,
	].join(' '),
	barCompleteChar: '\u2588',
	barIncompleteChar: '\u2591',
	hideCursor: true,
});

const times: number[] = [
	// Date.now(),
];

let averageNum = 20;

function setProgress(image: number, degradedImage: number) {

	if(options === false) return;

	const _time = Date.now();
	times.push(_time);

	const len = times.length;

	progressBar.update(image, {
		totalDegradedImages: (options.images * options.degradedImagesPerCleanImage),
		degradedImages: degradedImage,
		speed: len > 1 ? `${(1000 / (((_time - times[0]) / (len - 1)))).toFixed(2)} img/s` : 'N/A',
	});

	if(times.length > averageNum) // Average 20 samples
		times.shift();

}

const execKrita = resolve(kritaPath);

async function generateImages() {

	if(options === false) return;

	try
	{
		await krita.init(execKrita);
		console.log(styleText(['bold', 'greenBright'], 'Connected to Krita plugin successfully.'));
	}
	catch(error)
	{
		console.error(styleText(['bold', 'redBright'], 'Failed to connect to Krita plugin! Make sure the Krita plugin is running and try again.'));
		process.exit(1);
	}

	await krita.getAllResources();

	if(printKritaFilters)
	{
		const properties = await krita.filterProperties({
			name: 'opencomic:gradient:filter',
			filter: 'gradientmap',
		});

		console.log(styleText(['bold', 'greenBright'], 'Krita plugin filters:'), properties);
		process.exit(0);
	}

	if(printKritaGradients)
	{
		console.log(styleText(['bold', 'greenBright'], 'Krita plugin gradients:'), krita.gradients);
		process.exit(0);
	}

	// Check for resume
	let resumeImage: boolean | number = false;

	const firstOutputClean = options.degradations[0].output.clean;

	if(options.resume && fs.existsSync(firstOutputClean))
	{
		const files = fs.readdirSync(firstOutputClean);

		const images = files.map(function(file) {

			const match = file.match(/^(\d+)/);
			return match ? +match[1] : -1;

		}).filter(image => image > 0);

		if(images.length > 0)
		{
			const maxImage = images.reduce((max, v) => v > max ? v : max, -Infinity);
			console.log(`${styleText(['bold', 'yellowBright'], 'Resuming from image:')} ${styleText(['bold', 'cyanBright'], maxImage.toString())}`);
			resumeImage = maxImage; // Resume from the last image number and regenerate that image
		}
		else
		{
			resumeImage = 0;
		}
	}

	console.log('');

	const startImage = resumeImage ? resumeImage : 1;

	// Start Progress Bar
	progressBar.start(options.images, 0, {
		speed: 'N/A',
	});

	averageNum = options.degradedImagesPerCleanImage * 10; // Increase average samples based on degraded images
	setProgress((startImage - 1), (startImage - 1) * options.degradedImagesPerCleanImage);

	for(let image = startImage; options.images >= image; image++)
	{
		if(execKrita)
			await krita.checkRestartKrita(execKrita, restartKritaEvery);

		try
		{
			const promise = new Promise<void>(async function(resolve, reject) {

				krita.setReject(reject);

				await drawing.generateImage(image, setProgress);

				resolve();

			});

			await promise;
		}
		catch
		{
			image--;
		}

		if(dev) // In dev mode, generate only 1 image and exit for testing
			process.exit(0);
	}

	progressBar.stop();
	process.exit(0);

}

generateImages();