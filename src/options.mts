import fs from 'fs';
import YAML from 'yaml'

import rand from './rand.mjs';
import resolve from './resolve.mjs';
import krita from './krita.mjs';

import {Options} from './types.mjs';

let options: Options | undefined = undefined;

function loadFile(path: string) {

	const filePath = resolve(path);

	if(fs.existsSync(filePath))
	{
		const fileData = YAML.parse(fs.readFileSync(filePath, 'utf-8'));
		return fileData;
	}
	else
	{
		throw new Error(`Options file not found: ${filePath}`);
	}

}

function loadFiles(object: Record<string, any>): any {

	if(Array.isArray(object))
	{
		const newObject = [];

		for(let value of object)
		{
			if(value?.file)
			{
				const fileData = loadFile(value.file);

				if(Array.isArray(fileData))
				{
					value = loadFiles(fileData);
				}
				else
				{
					value = {...fileData, ...value};

					if(value.file) delete value.file;
					value = [loadFiles(value)];
				}

				newObject.push(...value);
			}
			else
			{
				newObject.push(loadFiles(value));
			}
		}

		return newObject;
	}

	for(const key in object)
	{
		if(key === 'file')
		{
			const fileData = loadFile(object.file);

			if(Array.isArray(fileData))
				object = fileData;
			else
				object = {...fileData, ...object};

			if(object.file) delete object.file;
			object = loadFiles(object);
		}
		else if(typeof object[key] === 'object' && object[key] !== null)
		{
			object[key] = loadFiles(object[key]);
		}
	}

	return object;
}

function load(file: string) {

	let data: Options = YAML.parse(fs.readFileSync(file, 'utf-8'));
	data = loadFiles(data) as Options;

	const seed = data.seed;
	const randGenerator = rand.randByKey('options', seed);

	data.mainRand = randGenerator;

	// Prepare output directories
	for(const degradation of data.degradations)
	{
		degradation.output.clean = resolve(degradation.output.clean);
		if(!fs.existsSync(degradation.output.clean)) fs.mkdirSync(degradation.output.clean, {recursive: true});

		degradation.output.degraded = resolve(degradation.output.degraded);
		if(!fs.existsSync(degradation.output.degraded)) fs.mkdirSync(degradation.output.degraded, {recursive: true});

		if(degradation.output.options)
		{
			degradation.output.options = resolve(degradation.output.options);
			if(!fs.existsSync(degradation.output.options)) fs.mkdirSync(degradation.output.options, {recursive: true});
		}
	}

	/* Due this in every image
	data.base.halftone.angle = rand.generate(data.base.halftone.angle, randGenerator);
	data.base.size.width = rand.generate(data.base.size.width, randGenerator);
	data.base.size.width = rand.generate(data.base.size.width, randGenerator);
	data.base.size.height = rand.generate(data.base.size.height, randGenerator);	data.base.colored.prob = rand.prob(data.base.colored.prob, randGenerator);

	/*for(const key in data.drawings)
	{
		if(data.drawings[key].file)
			data.drawings[key] = {...YAML.parse(fs.readFileSync(resolve(data.drawings[key].file), 'utf-8')), ...data.drawings[key]}

		const drawing = data.drawings[key];
		drawing.amount = rand.generate(drawing.amount, randGenerator);
	}

	for(const postProcessing of data.postProcessing)
	{
		postProcessing.prob = rand.prob(postProcessing.prob, randGenerator);

		if(postProcessing.size) postProcessing.size = rand.generate(postProcessing.size, randGenerator);
		if(postProcessing.gray) postProcessing.gray = rand.generate(postProcessing.gray, randGenerator);
		if(postProcessing.scale) postProcessing.scale = rand.generate(postProcessing.scale, randGenerator);
	}

	for(const degradation of data.degradations)
	{
		degradation.prob = rand.prob(degradation.prob, randGenerator);

		if(degradation.quality) degradation.quality = rand.generate(degradation.quality, randGenerator);
		if(degradation.blur) degradation.blur = rand.generate(degradation.blur, randGenerator);
	}*/

	options = data;
	return options;

}

function setCurrentImageRand(image: number) {

	if(!options) return;

	//const seed = options.mainRand!.range(0, 200000000);
	const seed = image * 1009 + options.seed;
	const randGenerator = rand.randByKey('image-'+image, seed);

	options.imageSeed = seed;
	options.currentImageRand = randGenerator;

}

const BRUSHES_WITH_STRANGE_PATTERNS = [
	'w) Texture Normal Map',
	'v) Experimental Webs',
];

// TODO: Check all again with pressure active
const BRUSHES_WITH_PIXELATED_EDGES = [
	'b) Basic-3 Flow',
	'b) Basic-4 Flow Opacity',
	'e) Marker Chisel Smooth',
	'e) Marker Details',
	'e) Marker Dry',
	'e) Marker Plain (mypaint)',
	'i) Wet Knife',
	'i) Wet Paint Plus',
	't) Shapes Square',
	'u) Pixel Art',
	'u) Pixel Art Fill',
	'v) Sketching-1 Chrome Thin',
	'v) Sketching-2 Chrome Large',
];

const BRUSHES_WITH_PIXELATED_EDGES_IN_SMALL_SIZE = [
	...BRUSHES_WITH_PIXELATED_EDGES,
	/* // Fixed with BRUSHES_MIN_SIZE
	'c) Penclil-1 Hard',
	'c) Penclil-2',
	'c) Pencil-3 Large 4B',
	'd) Ink-1 Precision',
	'd) Ink-7 Brush Rough',
	'h) Charcoal Pencil Large',
	'h) Charcoal pencil large',
	'h) Charcoal Pencil Medium',
	'h) Charcoal Pencil Thin',
	*/
];

function randomize(object: any, depth: number = -1, currentDepth: number = 0): any {

	if(!options) return;

	const scale = options.base.scale || 1;
	const randGenerator = options.currentImageRand!;

	for(const key in object)
	{
		const value: any = object[key];

		if(key === 'skipIf')
			continue;

		if(key === 'prob')
		{
			object[key] = rand.prob(value, randGenerator);
		}
		else if(typeof value === 'object')
		{
			if(Array.isArray(value) && (typeof value[0] === 'number' || typeof value[0] === 'string' || value[0] === null || typeof value[0]?.weight !== 'undefined'))
			{
				object[key] = rand.generate(value, randGenerator);
				if(depth === -1 || depth > currentDepth) object[key] = randomize(object[key], depth, currentDepth + 1);
			}
			else if(Array.isArray(value) && typeof value[0]?.if !== 'undefined')
			{
				object[key] = ifValue(value);
				object[key] = rand.generate(object[key], randGenerator);
				// if(depth === -1 || depth > currentDepth) object[key] = randomize(object[key], depth, currentDepth + 1);
			}
			else if(Array.isArray(value) && typeof value[0]?.prob !== 'undefined')
			{
				object[key] = rand.probFilter(value, randGenerator);
				if(depth === -1 || depth > currentDepth) object[key] = randomize(object[key], depth, currentDepth + 1);
			}
			else if(!Array.isArray(value) && (typeof value?.weight !== 'undefined' || typeof value?.prob !== 'undefined'))
			{
				object[key] = rand.generate(value, randGenerator);
			}
			else if(value !== null)
			{
				let categories = false;

				if(key === 'brush' && !value.name)
					categories = value.category;

				if(depth === -1 || depth > currentDepth) object[key] = randomize(value, depth, currentDepth + 1);

				if(key === 'brush' && !value.name)
				{
					let disableBrushesWithPixelatedEdges = options.base.disableBrushesWithPixelatedEdges || false;
					let disableBrushesWithPixelatedEdgesInSmallSize = options.base.disableBrushesWithPixelatedEdgesInSmallSize || false;

					if('disableBrushesWithPixelatedEdges' in value)
						disableBrushesWithPixelatedEdges = value.disableBrushesWithPixelatedEdges;

					if('disableBrushesWithPixelatedEdgesInSmallSize' in value)
						disableBrushesWithPixelatedEdgesInSmallSize = value.disableBrushesWithPixelatedEdgesInSmallSize;

					const avoid = [
						...BRUSHES_WITH_STRANGE_PATTERNS,
						...(disableBrushesWithPixelatedEdges ? BRUSHES_WITH_PIXELATED_EDGES : []),
						...(disableBrushesWithPixelatedEdgesInSmallSize ? BRUSHES_WITH_PIXELATED_EDGES_IN_SMALL_SIZE : []),
					];

					if(value.amount && categories)
					{
						const name = [];

						for(let i = 0; i < value.amount; i++)
						{
							const category = categories ? rand.generate(categories, randGenerator) : false;
							const presets = krita.presets;
							const values = [];

							for(const pname in presets)
							{
								const preset = presets[pname];

								if((!category || preset.category === category) && !avoid.includes(preset.name) && preset.name)
									values.push(preset.name);
							}

							if(values.length)
								name.push(rand.generate(values, randGenerator));
						}

						object[key].name = !name.length ? ['b) Airbrush Soft'] : name;
					}
					else
					{
						const presets = krita.presets;
						const values = [];

						for(const name in presets)
						{
							const preset = presets[name];

							if((!value.category || preset.category === value.category) && !avoid.includes(preset.name) && preset.name)
								values.push(preset.name);
						}

						if(!values.length)
							values.push('b) Airbrush Soft');

						object[key].name = rand.generate(values, randGenerator);
					}
				}
			}
		}
	}

	return object;

}

type Operator = '==' | '===' | '!=' | '!==' | '<' | '>' | '<=' | '>=' | 'typeof';

type OperatorFn = (l: any, r: any) => boolean;

interface IfOption<T = unknown> {
	if: string;
	value: T;
}

function ifValue(options: any[]) {

	if(!options || options.length === 0)
		return null;

	const operators: Record<Operator, OperatorFn> = {
		'==':	function(l, r) {return l == r},
		'===':	function(l, r) {return l === r},
		'!=':	function(l, r) {return l != r},
		'!==':	function(l, r) {return l !== r},
		'<':	function(l, r) {return l < r},
		'>':	function(l, r) {return l > r},
		'<=':	function(l, r) {return l <= r},
		'>=':	function(l, r) {return l >= r},
		'typeof':	function(l, r) {return typeof l == r}
	}

	for(const option of options)
	{
		const condition = option.if;

		if(condition === 'default')
			return option.value;

		const [key, operator, rvalue] = condition.split(' ') as [string, Operator, string];
		const lvalue = values.get(key) || null;

		const match = operators[operator](lvalue, rvalue);

		if(match)
			return option.value;
	}

	return null;

}

let values = new Map<string, any>();

function setValues(object: any, baseKey: string = '') {

	for(const key in object)
	{
		const _baseKey = (baseKey ? baseKey+'.' : '')+key.toString();

		if(typeof object[key] === 'object' && object[key] !== null)
			setValues(object[key], _baseKey);
		else
			values.set(_baseKey, object[key]);
	}

}

function resetValues() {

	values = new Map<string, any>();

}

export default {
	load,
	setCurrentImageRand,
	randomize,
	setValues,
	resetValues,
	get: function(){return options},
	get values() {return values},
}
