import fs from 'fs';
import canvas from '@napi-rs/canvas';
import zlib from 'zlib';
import {spawn} from 'child_process';
import isEqual from 'lodash.isequal';

import resolve from './resolve.mjs';
import {sleep} from './tools.mjs';

import {PresetCategory, Color} from './types.mjs';

let webSocket: WebSocket | null = null;

export const BRUSHES_MAX_SIZE: Record<string, number> = {
	'c) Pencil-6 Quick Shade': 500,
	'f) Bristles-1 Details': 40,
	'f) Bristles-2 Flat Rough': 100,
	'f) Bristles-3 Large Smooth': 300,
	'f) Bristles-4 Glaze': 300,
	'f) Bristles-5 Flat': 40,
	'f) Charcoal Rock Soft': 100,
	'g) Dry Bristles': 300,
	'g) Dry Bristles Eroded': 100,
	'h) Chalk Grainy': 150,
	'j) WaterC Special Blobs': 500,
	'j) WaterC Special Splats': 500,
	'j) Watercolor Texture': 200,
	'j) Waterpaint Hard Edges': 300,
	't) Shapes Mecha': 200,
	't) Shapes Rounded': 200,
	't) Shapes Spikes': 200,
	'v) Texture Impressionism': 500,
	'y) Texture Big': 400,
	'y) Texture Crackles': 100,
	'y) Texture Hair': 100,
	'y) Texture Large Splat': 200,
	'y) Texture Noise': 100,
	'y) Texture Random Particles': 100,
	'z) Stamp Bokeh': 100,
	'z) Stamp Floor': 200,
	'z) Stamp Grass': 150,
	'z) Stamp Grass Patch': 100,
	'z) Stamp Herbals': 100,
	'z) Stamp Mountains Distant': 300,
	'z) Stamp Sparkles': 100,
	'z) Stamp Stylised Tree': 100,
	'z) Stamp Vegetal': 40,
};

export const BRUSHES_MIN_SIZE: Record<string, number> = {
	'c) Penclil-1 Hard': 3,
	'c) Penclil-2': 5,
	'c) Pencil-3 Large 4B': 5,
	'd) Ink-1 Precision': 5,
	'd) Ink-7 Brush Rough': 5,
	'h) Charcoal Pencil Large': 5,
	'h) Charcoal pencil large': 5,
	'h) Charcoal Pencil Medium': 5,
	'h) Charcoal Pencil Thin': 5,
};

/*

a) Eraser Circle eraser a
a) Eraser Small eraser a
a) Eraser Soft eraser a
b) Airbrush Soft airbrush b
b) Basic-1 basic b
b) Basic-2 Opacity basic b
b) Basic-3 Flow basic b
b) Basic-4 Flow Opacity basic b
b) Basic-5 Size basic b
b) Basic-5 Size Opacity basic b
b) Basic-6 Details basic b
c) Pencil 1 Sketch (mypaint) pencil c
c) Pencil 2b (mypaint) pencil c
c) Pencil-1 Hard pencil c
c) Pencil-2 pencil c
c) Pencil-3 Large 4B pencil c
c) Pencil-4 Soft pencil c
c) Pencil-5 Tilted pencil c
c) Pencil-6 Quick Shade pencil c
d) Ink pen (mypaint) ink d
d) Ink-1 Precision ink d
d) Ink-2 Fineliner ink d
d) Ink-3 Gpen ink d
d) Ink-4 Pen Rough ink d
d) Ink-7 Brush Rough ink d
d) Ink-8 Sumi-e ink d
e) Marker Chisel Smooth marker e
e) Marker Details marker e
e) Marker Dry marker e
e) Marker Medium (mypaint) marker e
e) Marker Plain (mypaint) marker e
f) Bristles-1 Details bristles f
f) Bristles-2 Flat Rough bristles f
f) Bristles-3 Large Smooth bristles f
f) Bristles-4 Glaze bristles f
f) Bristles-5 Flat bristles f
f) Charcoal Rock Soft charcoal f
f) Dry Roller dry f
g) Dry Bristles dry g
g) Dry Bristles Eroded dry g
g) Dry Brushing dry g
g) Dry Textured Creases dry g
h) Chalk Details chalk h
h) Chalk Grainy chalk h
h) Chalk Soft chalk h
h) Charcoal Pencil Medium charcoal h
h) Charcoal Pencil Thin charcoal h
h) Charcoal pencil large charcoal h
i) Wet Bristles wet i
i) Wet Bristles Rough wet i
i) Wet Circle wet i
i) Wet Knife wet i
i) Wet Knife Plus (mypaint) wet i
i) Wet Paint wet i
i) Wet Paint Details wet i
i) Wet Paint Plus (mypaint) wet i
i) Wet Smear wet i
i) Wet Textured Soft wet i
j) WaterC Basic Lines-Dry watercolor j
j) WaterC Basic Lines-Wet watercolor j
j) WaterC Basic Lines-Wet-Pattern watercolor j
j) WaterC Basic Round-Fringe 02 watercolor j
j) WaterC Basic Round-Grain watercolor j
j) WaterC Basic Round-Grunge watercolor j
j) WaterC Flat Big-Grain Tilt watercolor j
j) WaterC Flat Decay Tilt watercolor j
j) WaterC Special Blobs watercolor j
j) WaterC Special Splats watercolor j
j) WaterC Spread watercolor j
j) WaterC Spread WideArea watercolor j
j) WaterC Spread-Pattern watercolor j
j) WaterC Water-Pattern watercolor j
j) Watercolor Fringe watercolor j
j) Watercolor Texture watercolor j
j) Waterpaint Hard Edges watercolor j
j) Waterpaint Soft Edges watercolor j
k) Blender Basic blender k
k) Blender Blur blender k
k) Blender Knife Edge blender k
k) Blender Pixelize blender k
k) Blender Rake blender k
k) Blender Smear blender k
k) Blender Textured Soft blender k
l) Adjust Color adjustment l
l) Adjust Dodge adjustment l
l) Adjust Lighten adjustment l
l) Adjust Multiply adjustment l
l) Adjust Overlay Burn adjustment l
t) Shapes Fill shapes t
t) Shapes Mecha shapes t
t) Shapes Rounded shapes t
t) Shapes Spikes shapes t
t) Shapes Square shapes t
u) Pixel Art pixel-art u
u) Pixel Art Dithering pixel-art u
u) Pixel Art Fill pixel-art u
v) Clone Tool clone-distort v
v) Distort Grow clone-distort v
v) Distort Move clone-distort v
v) Distort Shrink clone-distort v
v) Experimental Webs sketching v
v) Sketching-1 Chrome Thin sketching v
v) Sketching-2 Chrome Large sketching v
v) Sketching-3 Leaky sketching v
v) Texture Impressionism texture v
v) Texture Pointillism texture v
w) Texture Normal Map texture w
x) Filter Blur filter x
x) Filter Sharpen filter x
y) Screentone Moire screentone y
y) Screentone Pressure screentone y
y) Screentones Regular screentone y
y) Texture Big texture y
y) Texture Crackles texture y
y) Texture Hair texture y
y) Texture Large Splat texture y
y) Texture Noise texture y
y) Texture Random Particles texture y
y) Texture Reptile texture y
y) Texture Snow Pile texture y
y) Texture Spines texture y
y) Texture Splat texture y
y) Texture Spray texture y
y) Texture Starfield texture y
y) Texture Wood Fiber texture y
z) Stamp Bokeh stamp z
z) Stamp Floor stamp z
z) Stamp Grass stamp z
z) Stamp Grass Patch stamp z
z) Stamp Hearts stamp z
z) Stamp Herbals stamp z
z) Stamp Leaves stamp z
z) Stamp Mountains Distant stamp z
z) Stamp Shoujo Bubbles stamp z
z) Stamp Sparkles stamp z
z) Stamp Stylised Tree stamp z
z) Stamp Vegetal stamp z
z) Stamp Water stamp z


*/

function getPromise() {

	let resolve!: () => void;
	let reject!: (error: any) => void;

	const promise = new Promise<void>(function(_resolve, _reject) {

		resolve = _resolve;
		reject = _reject;

	});

	return {promise, resolve, reject};

}

interface PromisesList {
	[id: string]: {
		promise: Promise<any>;
		resolve: (data: any) => void;
		reject: (error: any) => void;
	};
}

let promises: PromisesList = {};

function setPromise(id: string): Promise<any> {

	const {promise, resolve, reject} = getPromise();

	promises[id] = {
		promise,
		resolve,
		reject,
	};

	return promise;

}

function gzip(string: string): Promise<string> {

	return new Promise(function(resolve, reject) {

		zlib.gzip(string, function(error, buffer) {

			if(error)
				return reject(error);

			resolve(buffer.toString('base64'));

		});

	});

}

function parseObject(data: [], start: number = 0): object {

	let _data = data.slice(start).join(':');

	_data = _data.replace(/"/g, '\\"');
	_data = _data.replace(/'/g, '"');
	_data = _data.replace(/:\s*False([,}])/g, ':false$1');
	_data = _data.replace(/:\s*True([,}])/g, ':true$1');

	return JSON.parse(_data);

}

let proc: any;

async function execKrita(binary: string = '') {

	const args: string[] = [];

	return new Promise<void>((resolve, reject) => {

		proc = spawn(binary, args);

		proc.stderr.on('data', (data: any) => {

			data = data.toString();

			if(/QML ToolTipBase: cannot find any window to open popup in/iu.test(data))
				resolve();

		});

		proc.on('error', (error: any) => {

			// reject(error);

			proc = null;

		});

		proc.on('close', (code: any) => {

			if(!killingKrita && rejectPromise)
				rejectPromise(code);

			proc = null;

		});

	});

}

async function init(_execKrita: string = ''): Promise<void> {

	promises = {};
	webSocket = null;

	try
	{
		if(_execKrita)
		{
			await execKrita(_execKrita);
			await sleep(1000);
		}

		await connect();
		if(_execKrita) await initDocument(100, 100);
		await _send(`edit_layer:${JSON.stringify({
			index: 0,
			visible: true,
		})}`);
		await waitForDone();
	}
	catch(error)
	{
		throw error;
	}

	return;

}

let rejectPromise: (error: any) => void;

function setReject(reject: (error: any) => void): void {

	rejectPromise = reject;

}

let checkRestartKritaCurrent = 0, killingKrita = false;

async function checkRestartKrita(_execKrita: string = '', restartKritaEvery: number = 5): Promise<void> {

	checkRestartKritaCurrent++;

	if(restartKritaEvery > 0 && (checkRestartKritaCurrent > restartKritaEvery || proc === null))
	{
		checkRestartKritaCurrent = 0;

		if(webSocket)
		{
			webSocket.close();
			webSocket = null;
		}

		if(proc)
		{
			killingKrita = true;
			proc.kill();
			proc = null;
		}

		await sleep(2000);
		killingKrita = false;
		await init(_execKrita);
	}

}

async function connect(): Promise<void> {

	const {promise, resolve, reject} = getPromise();

	webSocket = new WebSocket('ws://127.0.1.1:49120');

	webSocket.addEventListener('open', async function() {

		if(!webSocket)
			return;

		resolve();

	});

	webSocket.addEventListener('message', (msg) => {

		const string = msg.data.toString();
		const splitData = string.split(':');
		const key = splitData[0];

		if(promises[key])
		{
			let data: string | object = '';

			switch(key)
			{
				case 'layer_image':

					const size = splitData[1].split(',');

					data = {
						width: +size[0],
						height: +size[1],
						image: splitData[2],
					};

					break;

				case 'filter_properties':

					data = {
						filter: splitData[1],
						properties: parseObject(splitData, 2),
					};

					break;

				case 'layers':
				case 'resources':
				case 'filters':
				case 'view':

					data = parseObject(splitData, 1);

					break;

				case 'done':
				case 'doc_done':

					data = splitData[1];

					break;

				default:

					data = splitData[1];
					// console.log(splitData);

					break;
			}

			promises[key].resolve(data);
			delete promises[key];
		}
		else
		{
			console.log('No promise found for Krita plugin WebSocket message key:', key, string);
		}

	});

	webSocket.addEventListener('error', function(error) {

		// reject(error);

	});

	webSocket.addEventListener('close', function() {

		// reject('Krita plugin WebSocket closed');

	});

	return promise;

}

function send(data: string): void {

	if(!webSocket)
		return;

	webSocket.send(data);

}

function _send(data: string): Promise<any> {

	const promise = setPromise('done');
	send(data);

	return promise;

}

async function removeAllLayers(): Promise<any> {

	const _layers = await layers();
	const __layers: any[] = [];

	for(const key in _layers)
	{
		const layer = _layers[key];

		if(layer.index === 0)
			continue;

		__layers.push({
			name: layer.name,
		});
	}

	await _send(`remove_layers:${JSON.stringify(__layers)}`);

	return;

}

async function document(width: number, height: number, name: string = 'OpenComic Procedural Image Generation'): Promise<any> {

	/*const avoidSaveMessage = resolve(`./avoid-save-message.kra`);

	if(fs.existsSync(avoidSaveMessage))
		fs.unlinkSync(avoidSaveMessage);

	await _send(`save_as:${JSON.stringify({
		filename: avoidSaveMessage,
	})}`);

	await sleep(1000);

	await _send(`new_document:${JSON.stringify({
		width,
		height,
		name,
		closeCurrent: true, // this produces a save message, change new document logic in future
	})}`);

	await sleep(1000);*/

	await removeAllLayers();

	await _send(`resize:${JSON.stringify({
		width,
		height,
	})}`);

	return;

}

async function initDocument(width: number, height: number, name: string = 'OpenComic Procedural Image Generation'): Promise<any> {

	await _send(`new_document:${JSON.stringify({
		width,
		height,
		name,
		// closeCurrent: true, // this produces a save message, change new document logic in future
	})}`);

}

async function _canvas(): Promise<any> {

	const promise = setPromise('canvas_image');
	send(`get_canvas_image:`);

	return promise;

}

async function layers(): Promise<any> {

	const promise = setPromise('layers');
	send(`get_layers_list:`);

	return promise;

}

async function getLayer(layer: any, _layers?: any): Promise<any> {

	_layers = _layers ?? await layers();

	for(const key in _layers)
	{
		const _layer = _layers[key];

		if((layer.name && _layer.name === layer.name) || (layer.index !== undefined && _layer.index === layer.index))
			return _layer;

		if(_layer.children)
		{
			const childLayer = await getLayer(layer, _layer.children);

			if(childLayer)
				return childLayer;
		}

	}

	return false;

}

interface Layer {
	index?: number;
	name?: string;
	includeMask?: boolean;
	width?: number;
	height?: number;
}

async function layer(layer: Layer = {}): Promise<any> {

	const promise = setPromise('layer_image');
	send(`get_layer_image:${JSON.stringify(layer)}`);

	return promise;

}

type ResourceType = 'pattern' | 'gradient' | 'brush' | 'preset' | 'preset_xml' | 'palette' | 'workspace';

interface resourcesOptions {
	type?: ResourceType;
}

async function resources(resources: resourcesOptions): Promise<any> {

	const promise = setPromise('resources');
	send(`get_resources:${JSON.stringify(resources)}`);

	return promise;

}

async function filterProperties(data: object): Promise<any> {

	const promise = setPromise('filter_properties');
	send(`get_filter_properties:${JSON.stringify(data)}`);

	return promise;

}

interface LayerPixels {
	data: Uint8ClampedArray;
	width: number;
	height: number;
}

const layersCache = new Map<string | number, LayerPixels>();

async function layerCache(_layer: Layer = {}): Promise<LayerPixels> {

	const key = _layer.name ?? _layer.index ?? 0;

	if(layersCache.has(key))
		return layersCache.get(key)!;

	const node = await layer(_layer);
	const width = node.width;
	const height = node.height;

	const _canvas = canvas.createCanvas(width, height);
	const ctx = _canvas.getContext('2d');
	const img = await canvas.loadImage('data:image/png;base64,'+node.image);
	ctx.drawImage(img, 0, 0);

	const pixels = ctx.getImageData(0, 0, _canvas.width, _canvas.height);

	const layerPixels: LayerPixels = {
		data: pixels.data,
		width,
		height,
	};

	layersCache.set(key, layerPixels);
	return layerPixels;

}

async function cleanLayerCache() {

	layersCache.clear();

}

interface selectByColorOptions {
	layer?: Layer;
	r?: number;
	g?: number;
	b?: number;
	a?: number;
	blur?: number;
	onlyAlpha?: boolean;
}

async function selectByColor({layer = {}, r = 255, g = 255, b = 255, a = 255, blur = 0, onlyAlpha = false}: selectByColorOptions = {}): Promise<any> {

	const pixels = await layerCache(layer);

	const width = pixels.width;
	const height = pixels.height;

	const selection = Array(width * height).fill(0);
	const blurrySelection = Array(width * height * 4).fill(255);

	const select = {
		x: 0,
		y: 0,
		endX: 0,
		endY: 0,
		width: 0,
		height: 0,
	};

	if(blur)
	{
		for(let i = 0, len = pixels.data.length; i < len; i += 4)
		{
			const _r = pixels.data[i];
			const _g = pixels.data[i + 1];
			const _b = pixels.data[i + 2];
			const _a = pixels.data[i + 3];

			if((_r === r && _g === g && _b === b && _a === a) || (onlyAlpha && _a > 0))
			{
				blurrySelection[i] = 0;
				blurrySelection[i + 1] = 0;
				blurrySelection[i + 2] = 0;
				blurrySelection[i + 3] = 255;

				const x = Math.floor((i / 4) % width);
				const y = Math.floor((i / 4) / width);

				if(x < select.x || select.x === 0)
					select.x = x;
				else if(x > select.endX || select.endX === 0)
					select.endX = x;

				if(y < select.y || select.y === 0)
					select.y = y;
				else if(y > select.endY || select.endY === 0)
					select.endY = y;
			}
		}

		const blurryCanvas = canvas.createCanvas(width, height);
		const blurryCtx = blurryCanvas.getContext('2d');
		const blurryImageData = blurryCtx.createImageData(width, height);
		blurryImageData.data.set(Uint8ClampedArray.from(blurrySelection));
		blurryCtx.putImageData(blurryImageData, 0, 0);
		blurryCtx.filter = 'blur('+blur+'px)';
		blurryCtx.drawImage(blurryCanvas, 0, 0);

		const finalBlurryImageData = blurryCtx.getImageData(0, 0, blurryCanvas.width, blurryCanvas.height);

		for(let i = 0, len = finalBlurryImageData.data.length; i < len; i += 4)
		{
			const _a = finalBlurryImageData.data[i];
			selection[i / 4] = 255 - _a;
		}
	}
	else
	{
		for(let i = 0, len = pixels.data.length; i < len; i += 4)
		{
			const _r = pixels.data[i];
			const _g = pixels.data[i + 1];
			const _b = pixels.data[i + 2];
			const _a = pixels.data[i + 3];

			if((_r === r && _g === g && _b === b && _a === a) || (onlyAlpha && _a > 0))
			{
				selection[i / 4] = 255;

				const x = Math.floor((i / 4) % width);
				const y = Math.floor((i / 4) / width);

				if(x < select.x || select.x === 0)
					select.x = x;
				else if(x > select.endX || select.endX === 0)
					select.endX = x;

				if(y < select.y || select.y === 0)
					select.y = y;
				else if(y > select.endY || select.endY === 0)
					select.endY = y;
			}
		}
	}

	const _selection = await gzip(JSON.stringify(selection));

	await _send(`selection:${_selection}`);

	select.width = select.endX - select.x;
	select.height = select.endY - select.y;

	return select;

}

let resourcesData: {[key: string]: any} = {};

let categoriesRegex: {[key in PresetCategory]: RegExp} = {
	eraser: /\)\s*Eraser/,
	airbrush: /\)\s*Airbrush/i,
	basic: /\)\s*Basic/i,
	pencil: /\)\s*Pencil/,
	ink: /\)\s*Ink/i,
	marker: /\)\s*Marker/i,
	bristles: /\)\s*Bristles/i,
	dry: /\)\s*Dry/i,
	charcoal: /\)\s*Charcoal/i,
	chalk: /\)\s*Chalk/i,
	wet: /\)\s*Wet/i,
	watercolor: /\)\s*(WaterC|Watercolor|Waterpaint)/i,
	blender: /\)\s*Blender/i,
	adjustment: /\)\s*Adjust/i,
	rgba: /\)\s*RGBA/i,
	shapes: /\)\s*Shapes?/i,
	'pixel-art': /\)\s*Pixel[-\s]*Art/i,
	'clone-distort': /\)\s*(Clone|Distort)/i,
	sketching: /\)\s*(Sketching|Experimental)/i,
	texture: /\)\s*Texture/i,
	filter: /\)\s*Filter/i,
	screentone: /\)\s*Screentone/i,
	stamp: /\)\s*Stamp/i,
};

function parseResources(data: any, type: ResourceType): any {

	for(const key in data)
	{
		const item = data[key];
		let name = item.name;

		if(type === 'preset' && item.filename)
		{
			const letter = name.split(')')[0];

			const category = Object.keys(categoriesRegex).find((cat) => {
				return categoriesRegex[cat as PresetCategory].test(name);
			}) as PresetCategory || false;

			if(!category)
				console.log(name, category);

			data[name] = {
				...item,
				category,
				letter,
			};
		}
	}

	return data;

}

async function getAllResources(): Promise<any> {

	resourcesData.patterns = await resources({type: 'pattern'});
	resourcesData.gradients = await resources({type: 'gradient'});
	// resourcesData.brush = await resources({type: 'brush'});
	resourcesData.presets = parseResources(await resources({type: 'preset'}), 'preset');
	// resourcesData.preset_xml = await resources({type: 'preset_xml'});
	resourcesData.palettes = await resources({type: 'palette'});

	return;

}

async function getFilters() {

	const promise = setPromise('filters');
	send(`get_filters:`);

	return promise;

}

async function hideBackgroundLayer(hide: boolean = true): Promise<void> {

	await _send(`edit_layer:${JSON.stringify({
		index: 0,
		visible: !hide,
	})}`);

	return;

}

async function fillBackgroundLayer(color: Color): Promise<void> {

	await _send(`edit_view:${JSON.stringify({
		backgroundColor: color,
	})}`);

	await _send(`select_layer:${JSON.stringify({
		index: 0,
	})}`);

	await _send(`edit_layer:${JSON.stringify({
		index: 0,
		locked: false,
	})}`);

	await _send('action:fill_selection_background_color');

	return;

}

async function waitForDone(): Promise<void> {

	const promise = setPromise('doc_done');
	send(`doc_wait_for_done:`);

	return promise;

}

async function refreshProjection(): Promise<void> {

	await _send(`refresh_projection`);

	return;

}

let currentBrushPreset = 'b) Airbrush Soft';

async function editView(data: Record<string, any>): Promise<void> {

	const checkKeys: string[] = [
		'foregroundColor',
		'backgroundColor',
		'brushSize',
		'patternSize',
		'paintingOpacity',
		'paintingFlow',
		'disablePressure',
		'currentPattern',
		'currentBrushPreset',
		'currentGradient',
		'currentBlendingMode',
	];

	if('currentBrushPreset' in data && (typeof data.currentBrushPreset === 'object' || !data.currentBrushPreset))
		throw new Error('currentBrushPreset cannot be an object or empty', data.currentBrushPreset);

	currentBrushPreset = data.currentBrushPreset ?? currentBrushPreset;

	if(data.brushSize)
	{
		const minSize = BRUSHES_MIN_SIZE[currentBrushPreset] ?? 0.01;
		const maxSize = BRUSHES_MAX_SIZE[currentBrushPreset] ?? 1000;

		data.brushSize = Math.max(minSize, Math.min(maxSize, data.brushSize));
	}

	for(let i = 0; i < 10; i++)
	{
		await _send(`edit_view:${JSON.stringify(data)}`);

		const promise = setPromise('view');
		send(`get_view:`);

		const viewData = await promise;

		let allOk = true;

		for(const key of checkKeys)
		{
			if(key in data)
			{
				let value1 = data[key];
				let value2 = viewData[key];

				if(typeof value1 === 'number')
					value1 = Math.round(value1 * 100) / 100;

				if(typeof value2 === 'number')
					value2 = Math.round(value2 * 100) / 100;

				if(!isEqual(value1, value2))
				{
					allOk = false;
					break;
				}
			}
		}

		if(allOk)
			break;

		await sleep(100);
	}

	return;

}

export default {
	get webSocket() {return webSocket},
	init,
	setReject,
	checkRestartKrita,
	connect,
	send: _send,
	document,
	initDocument,
	canvas: _canvas,
	layers,
	getLayer,
	layer,
	resources,
	filterProperties,
	selectByColor,
	cleanLayerCache,
	getAllResources,
	getFilters,
	waitForDone,
	refreshProjection,
	editView,
	sleep,
	hideBackgroundLayer,
	fillBackgroundLayer,
	get patterns() {return resourcesData.patterns},
	get presets() {return resourcesData.presets},
	get palettes() {return resourcesData.palettes},
	get gradients() {return resourcesData.gradients},
};