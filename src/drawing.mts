import {Options} from './types.mjs';
import resolve from './resolve.mjs';
import coords, {CubicBezierOptions} from './coords.mjs';
import _options from './options.mjs';
import rand from './rand.mjs';
import cloneDeep from 'lodash.clonedeep';
import krita from './krita.mjs';

import lineart from './drawing/lineart.mjs';
import colorizeMask from './drawing/colorize-mask.mjs';
import paint from './drawing/paint.mjs';
import dots from './drawing/dots.mjs';
import lines from './drawing/lines.mjs';
import halftone from './drawing/halftone.mjs';
import texture from './drawing/texture.mjs';
import gradient from './drawing/gradient.mjs'

import output from './degradation/output.mjs';
import sharp from './degradation/sharp.mjs';

import {Drawings, Area, Layers} from './types.mjs';

let imageOptions: any = null;

async function addGroupLayer(name: string): Promise<void> {

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:group:'+name,
		type: 'grouplayer',
	})}`);

}

async function addLayers(area: Area, layerTypes: Record<string, boolean>, groupLayer: string): Promise<void> {

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:lineart:'+area,
		type: 'paintlayer',
		inside: {
			name: 'opencomic:group:'+groupLayer,
		},
	})}`);

	await krita.send('action:add_new_colorize_mask');
	await krita.send('edit_layer:'+JSON.stringify({
		rename: 'opencomic:colorize-mask:'+area,
	}));

	/*
	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:colorizemask:'+area,
		type: 'colorizemask',
		inside: {
			name: 'opencomic:lineart:'+area,
		}
	})}`);
	*/

	if(layerTypes['lineart-texture'])
	{
		await krita.send(`add_layer:${JSON.stringify({
			name: 'opencomic:lineart-texture:'+area,
			type: 'paintlayer',
			inside: {
				name: 'opencomic:group:'+groupLayer,
			},
		})}`);
	}

	if(layerTypes['lineart-random'])
	{
		await krita.send(`add_layer:${JSON.stringify({
			name: 'opencomic:lineart-random:'+area,
			type: 'paintlayer',
			inside: {
				name: 'opencomic:group:'+groupLayer,
			},
		})}`);
	}

	/*
	krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:halftone:'+area,
		filter: 'halftone',
		inside: {
			name: 'opencomic:lineart:'+area,
		},
		properties: {
			mode: 'alpha',
			pattern: 'dot',
			size: 10,
		},
	})}`);
	*/

}

async function generateImage(image: number, setProgress: (image: number, degradedImage: number) => void): Promise<void> {

	krita.cleanLayerCache();
	_options.setCurrentImageRand(image);
	_options.resetValues();
	const options: Options = cloneDeep(_options.get()!);

	const groupLayer = 'general';

	const scale = options.base.scale ?? 1;

	imageOptions = {
		...options,
		_: cloneDeep(_options.get()!),
		scale,
		drawings: _options.randomize({_: cloneDeep(options.drawings)}, 1)._,
		base: _options.randomize(options.base),
		postProcessing: _options.randomize(options.postProcessing),
		currentImage: image,
		groupLayer,
	};

	imageOptions.base.size.width = imageOptions.base.size.width ?? imageOptions.base.size.size;
	imageOptions.base.size.height = imageOptions.base.size.height ?? imageOptions.base.size.size;

	const multiple = imageOptions.base.size.multiple ?? imageOptions.base.size._multiple;

	if(multiple)
	{
		imageOptions.base.size.width = Math.round((imageOptions.base.size.width * scale) / multiple) * multiple;
		imageOptions.base.size.height = Math.round((imageOptions.base.size.height * scale) / multiple) * multiple;
	}

	const {width, height} = imageOptions.base.size;

	await krita.document(width, height);

	const rgb = imageOptions.base.background;
	const gray = imageOptions.base.background.gray;

	await krita.fillBackgroundLayer({
		r: rgb.r ?? gray,
		g: rgb.g ?? gray,
		b: rgb.b ?? gray,
		a: 255,
	});

	const layerTypes: Record<string, boolean> = {};

	for(const drawing of imageOptions.drawings.list)
	{
		layerTypes[drawing.type] = true;
	}

	let layers: Layers = {};

	switch(imageOptions.drawings.type)
	{
		case '3layered':

			await addGroupLayer(groupLayer);
			await addLayers('up', layerTypes, groupLayer);
			await addLayers('middle', layerTypes, groupLayer);
			await addLayers('down', layerTypes, groupLayer);

			layers = {
				up: await processLayer('up', groupLayer),
				middle: await processLayer('middle', groupLayer),
				down: await processLayer('down', groupLayer),
			};

			break;

		case 'singlelayered':

			await addGroupLayer(groupLayer);
			await addLayers('all', layerTypes, groupLayer);

			layers = {
				all: await processLayer('all', groupLayer),
			};

			break;

	}

	// await processPostProcessing('up');

	// await processFinalProcessing('up');

	await processDegradations(layers, function(degradedImage: number) {

		setProgress(image, (image - 1) * imageOptions.degradedImagesPerCleanImage + degradedImage);

	});

	// process.exit(0);

	/*

	await postProcessingLayer('lineart');

	*/

}

async function processLayer(area: Area, groupLayer: string): Promise<any> {

	const randGenerator = imageOptions.currentImageRand!;

	/*await krita.send(`select_layer:${JSON.stringify({
		name: 'opencomic:lineart:'+layerName,
	})}`);*/

	const draws: Record<string, any> = {
		lineart: [],
		lineartTexture: [],
		lineartRandom: [],
		colorizeMask: [],
		paint: [],
		dots: [],
		circles: [],
		circlesWithDot: [],
		parallelLines: [],
		grid: [],
		halftone: [],
		texture: [],
		gradient: [],
	};

	const doneList: string[] = [];

	for(const drawing of imageOptions.drawings.list)
	{
		if(drawing.skipIf && doneList.some(v => drawing.skipIf.includes(v)))
			continue;

		const run = typeof drawing.prob !== 'undefined' ? rand.prob(drawing.prob, randGenerator) : true;

		if(!run)
			continue;

		switch(drawing.type)
		{
			case 'lineart':
				draws.lineart = await lineart.draw(imageOptions, drawing, area);
				break;

			case 'lineart-texture':
				draws.lineartTexture = await lineart.draw(imageOptions, drawing, area, 'lineart-texture');
				break;

			case 'lineart-random':
				draws.lineartRandom = await lineart.draw(imageOptions, drawing, area, 'lineart-random');
				break;

			case 'colorize-mask':
				draws.colorizeMask = await colorizeMask.colorize(imageOptions, drawing, area);
				break;

			case 'paint':
				draws.paint = await paint.draw(imageOptions, drawing, area, draws);
				break;

			case 'dots':
				draws.dots = await dots.draw(imageOptions, drawing, area, groupLayer, draws);
				break;

			case 'circles':
				draws.circles = await dots.circles(imageOptions, drawing, area, groupLayer, draws);
				break;

			case 'circles-with-dot':
				draws.circlesWithDot = await dots.circlesWithDot(imageOptions, drawing, area, groupLayer, draws);
				break;

			case 'parallel-lines':
				draws.parallelLines = await lines.parallel(imageOptions, drawing, area, groupLayer, draws);
				break;

			case 'grid':
				draws.grid = await lines.grid(imageOptions, drawing, area, groupLayer, draws);
				break;

			/*case 'halftone':
				draws.colorizeMask = await halftone.add(imageOptions, drawing, area);
				break;*/

			case 'texture':
				draws.texture = await texture.add(imageOptions, drawing);
				break;

			case 'gradient':
				draws.gradient = await gradient.add(imageOptions, drawing);
				break;
		}

		doneList.push(drawing.type);
	}

	return draws;
}

async function processDegradations(layers: Layers, setProgress: (degradedImage: number) => void): Promise<void> {

	const randGenerator = imageOptions.currentImageRand!;

	let areas: Area[] = [];

	switch(imageOptions.drawings.type)
	{
		case '3layered':

			areas = ['up', 'middle', 'down'];
			break;

		case 'singlelayered':

			areas = ['all'];
			break;

	}

	let cleanCache = null;
	let degradedCache = null;

	const promises = [];
	let imageDegradationDone = 0;
	const degradationsNum = imageOptions.degradations.length;

	for(let imageDegradation = 1; imageDegradation <= imageOptions.degradedImagesPerCleanImage; imageDegradation++)
	{	
		// output.saveClean(imageDegradation);

		for(const degradation of imageOptions.degradations)
		{
			const _layers: Layers = {
				all: {},
				up: {},
				middle: {},
				down: {},
			};

			const _configs: Record<string, any> = {};

			let clean: string | Buffer;
			let degraded: string | Buffer;

			let runAllInKrita = false;

			const runs: boolean[] = [];
			const _inKrita = degradation.inKrita || [];

			for(let i = 0, length = _inKrita.length; i < length; i++)
			{
				const inKrita = _inKrita[i];
				const run = rand.prob(inKrita.prob, randGenerator);

				runs.push(run);

				if(!inKrita.singleRun && run)
					runAllInKrita = true;
			}

			if(runAllInKrita || (cleanCache === null || degradedCache === null))
			{
				for(let i = 0, length = _inKrita.length; i < length; i++)
				{
					const inKrita = _inKrita[i];
					const config: Record<string, any> = {};

					switch(inKrita.type)
					{
						case 'halftone':

							config.halftone = await halftone.config(areas, imageOptions, inKrita);
							_options.setValues(config.halftone[areas[0]], 'inKrita.halftone');

							break;
					}

					_configs[inKrita.type] = config;
				}

				for(let i = 0, length = _inKrita.length; i < length; i++)
				{
					const inKrita = _inKrita[i];
					const config = _configs[inKrita.type];

					const run = runs[i];

					if(!run)
						continue;

					switch(inKrita.type)
					{
						case 'halftone':

							await halftone.removeAll();
							const _halftone = await halftone.addAllWithConfig(imageOptions, areas, config.halftone, false);

							break;
					}
				}

				// Force fully recomputed
				await krita.refreshProjection();

				clean = cleanCache = await output.clean(_layers);

				for(let i = 0, length = _inKrita.length; i < length; i++)
				{
					const inKrita = _inKrita[i];
					const config = _configs[inKrita.type];

					const run = runs[i];

					if(!run)
						continue;

					switch(inKrita.type)
					{
						case 'halftone':

							await halftone.removeAll();
							const _halftone = await halftone.addAllWithConfig(imageOptions, areas, config.halftone, true);

							for(const area in _halftone)
							{
								if(_halftone[area as Area])
									_layers[area as Area]!.halftone = _halftone[area as Area];
							}

							break;
					}
				}

				// Force fully recomputed
				await krita.refreshProjection();

				degraded = degradedCache = await output.degraded(_layers);
			}
			else
			{
				clean = cleanCache;
				degraded = degradedCache;
			}

			const promise = new Promise<void>(async function(resolve) {

				const degradationInNode: object[] = [];
				const doneInNode: string[] = [];

				const dInNode = cloneDeep(degradation.inNode || []);

				while(dInNode && dInNode.length > 0)
				{
					const inNode = dInNode.shift()!;
					const _inNode = _options.randomize(cloneDeep(inNode));

					if(inNode.skipIf && doneInNode.some(v => inNode.skipIf.includes(v)))
						continue;

					const run = rand.prob(inNode.prob, randGenerator);

					if(!run)
						continue;

					if(inNode.type === 'group')
					{
						dInNode.unshift(...inNode.list);
						continue;
					}

					degradationInNode.push(inNode);

					switch(inNode.type)
					{
						case 'resize':

							if(inNode.both) clean = await sharp.resize(imageOptions, _inNode, clean, false);
							degraded = await sharp.resize(imageOptions, _inNode, degraded, true);

							break;

						case 'resize-blur':

							if(inNode.both) clean = await sharp.resizeBlur(imageOptions, _inNode, clean, false);
							degraded = await sharp.resizeBlur(imageOptions, _inNode, degraded, true);

							break;

						case 'blur':

							if(inNode.both) clean = await sharp.blur(imageOptions, _inNode, clean, false);
							degraded = await sharp.blur(imageOptions, _inNode, degraded, true);

							break;

						case 'rotate':

							clean = await sharp.rotate(imageOptions, _inNode, clean);
							degraded = await sharp.rotate(imageOptions, _inNode, degraded);

							break;

						case 'jpeg':

							degraded = await sharp.jpeg(imageOptions, _inNode, degraded);

							break;

						case 'webp':

							degraded = await sharp.webp(imageOptions, _inNode, degraded);

							break;
					}

					doneInNode.push(inNode.type);
				}

				if(!degradation.checkSizes || await sharp.checkSizes(imageOptions, clean, degraded))
				{
					await output.saveClean(imageOptions, clean, degradation, imageDegradation);
					await output.saveDegraded(imageOptions, degraded, degradation, imageDegradation);
					await output.saveOptions(imageOptions, JSON.stringify({
						layers,
						_layers,
						degradationInNode,
						configs: _configs,
						options: imageOptions,
					}), degradation, imageDegradation);
				}

				imageDegradationDone++;
				setProgress(Math.round(imageDegradationDone / degradationsNum));

				resolve();

			});

			if(degradation.inNodePromiseAll)
				promises.push(promise);
			else
				await promise;
		}
	}

	await Promise.all(promises);

}

export default {
	generateImage,
	get imageOptions() {return ''},
}