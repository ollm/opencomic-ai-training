import krita from '../krita.mjs';
import coords from '../coords.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import merge from 'lodash.merge';
import rand from '../rand.mjs';
import calcArea from './area.mjs';
import {PATTERNS, SHAPES, INTERPOLATIONS, property} from '../filter.mjs';

import {Drawings, Area} from '../types.mjs';


type Config = {
	applyIn: 'without' | 'both' | 'degraded',
	config: any,
	modes: ('intensity' | 'alpha' | 'channels')[],
}

function config(areas: Area[], options: any, drawing: Record<string, any>): Record<Area, Config> {

	const randGenerator = options.currentImageRand!;

	const colors = options.base.colors;

	const colored = colors.colored.active ? colors.colored : false;
	const colorTone = colors.colorTone.active ? colors.colorTone : false;

	if(colored || colorTone)
	{
		if(drawing.colored)
			drawing = merge(cloneDeep(drawing), cloneDeep(drawing.colored));
	}

	const result: Record<Area, any> = {
		all: null,
		up: null,
		middle: null,
		down: null,
	};

	const sameInAllLayers = rand.generate(drawing.sameInAllLayers, randGenerator);
	let prevDrawing = null;

	for(const area of areas)
	{
		const _drawing = prevDrawing = (prevDrawing && sameInAllLayers) ? prevDrawing : _options.randomize(cloneDeep(drawing));

		const applyIn = rand.generate(_drawing.applyIn, randGenerator);
		const config = applyIn === 'both' ? _drawing.both : (applyIn === 'without' ? (_drawing.both ?? _drawing.degraded) : _drawing.degraded);
		const modes = config.mode === 'both' ? ['intensity', 'alpha'] : [config.mode];

		result[area] = {
			applyIn,
			config,
			modes,
		};
	}

	return result;

}

async function add(options: any, drawing: any, area: Area, isDegraded: boolean = false): Promise<any> {
	
	const halftone = options.base.halftone;

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	drawing = _options.randomize(cloneDeep(drawing));

	const applyIn = rand.generate(drawing.applyIn, randGenerator);
	const config = applyIn === 'both' ? drawing.both : drawing.degraded;
	const modes = config.mode === 'both' ? ['intensity', 'alpha'] : [config.mode];

	if(applyIn !== 'without' && (isDegraded || applyIn === 'both'))
	{
		for(const mode of modes)
		{
			const properties = {
				mode,
				...property('pattern', PATTERNS[config.pattern] ?? PATTERNS.lineal),
				...property('shape', SHAPES[config.shape] ?? SHAPES.dot),
				...property('interpolation', INTERPOLATIONS[config.interpolation] ?? INTERPOLATIONS.sinusoidal),
				...property('size_mode', 1),
				...property('size_x', config.size * scale),
				...property('size_y', config.size * scale),
				...property('rotation', (!isDegraded) ? (halftone?.clean?.angle ?? halftone.angle) : halftone.angle),
			};

			await krita.send(`add_layer:${JSON.stringify({
				name: 'opencomic:halftone:'+area+':'+mode,
				filter: 'halftone',
				inside: {
					name: 'opencomic:draw:'+area,
				},
				properties: properties,
				visible: true,
			})}`);
		}
	}

	return {
		type: 'halftone',
		applyIn,
	};

}

async function addWithConfig(options: any, {applyIn, config, modes}: Config, area: Area, isDegraded: boolean = false): Promise<any> {

	if(applyIn !== 'without' && (isDegraded || applyIn === 'both'))
	{
		const scale = options.base.scale ?? 1;

		const halftone = options.base.halftone;
		const colors = options.base.colors;

		const colored = colors.colored.active ? colors.colored : false;
		const colorTone = colors.colorTone.active ? colors.colorTone : false;

		let backgroundOpacity = 100;

		const layerName = (await krita.getLayer({name: 'opencomic:texture:pattern'}) || await krita.getLayer({name: 'opencomic:gradient'})) ? `opencomic:group:${options.groupLayer}` : `opencomic:draw:${area}`;

		if(colored || colorTone)
		{
			await krita.send(`remove_layer:${JSON.stringify({
				name: `${layerName}:clone`,
			})}`);

			await krita.send(`add_layer:${JSON.stringify({
				name: `${layerName}:clone`,
				clone: {
					name: layerName,
				},
				below: {
					name: layerName,
				},
			})}`);

			backgroundOpacity = 0;
		}

		for(const mode of modes)
		{
			let properties = {
				mode,
				...property('pattern', PATTERNS[config.pattern] ?? PATTERNS.lineal),
				...property('shape', SHAPES[config.shape] ?? SHAPES.dot),
				...property('interpolation', INTERPOLATIONS[config.interpolation] ?? INTERPOLATIONS.sinusoidal),
				...property('size_mode', 1),
				...property('size_x', config.size * scale),
				...property('size_y', config.size * scale),
				...property('rotation', (!isDegraded) ? (halftone?.clean?.angle ?? halftone.angle) : halftone.angle),
				...property('background_opacity', backgroundOpacity, ''),
			};

			await krita.send(`add_layer:${JSON.stringify({
				name: `opencomic:halftone:${area}:${mode}`,
				filter: 'halftone',
				inside: {
					name: layerName,
				},
				properties: properties,
				visible: true,
			})}`);
		}
	}

	return {
		type: 'halftone',
		applyIn,
	};

}

async function addAllWithConfig(options: any, areas: Area[], config: Record<Area, Config>, isDegraded: boolean = false): Promise<Record<Area, any>> {

	const result: Record<Area, any> = {
		all: null,
		up: null,
		middle: null,
		down: null,
	};

	for(const area of areas)
	{
		result[area] = await addWithConfig(options, config[area], area, isDegraded);
	}

	return result;
}

async function addAll(options: any, drawing: Drawings, isDegraded: boolean = false): Promise<Record<Area, any>> {

	const areas: Area[] = ['up', 'middle', 'down'];
	const result: Record<Area, any> = {
		all: null,
		up: null,
		middle: null,
		down: null,
	};

	for(const area of areas)
	{
		result[area] = await add(options, drawing, area, isDegraded);
	}

	return result;
}

async function edit(name: string, properties: Record<string, any>, visible: boolean = true): Promise<void> {

	await krita.send(`edit_layer:${JSON.stringify({
		name,
		properties,
		visible,
	})}`);

	return;

}

async function randLayers(options: any, drawing: Record<string, any>): Promise<Record<Area, any>> {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	drawing = _options.randomize(cloneDeep(drawing));

	const halftone = options.base.halftone;

	const areas: Area[] = ['up', 'middle', 'down'];
	const result: Record<Area, any> = {
		all: null,
		up: null,
		middle: null,
		down: null,
	};

	for(const area of areas)
	{
		const applyIn = rand.generate(drawing.applyIn, randGenerator);
		const config = applyIn === 'both' ? drawing.both : drawing.degraded;
		const modes = config.mode === 'both' ? ['intensity', 'alpha'] : [config.mode];

		if(applyIn !== 'without')
		{
			if(config.mode !== 'both')
				await edit(`opencomic:halftone:${area}:${config.mode === 'intensity' ? 'alpha' : 'intensity'}`, {}, false);

			for(const mode of modes)
			{
				const properties = {
					mode,
					...property('pattern', PATTERNS[config.pattern] ?? PATTERNS.lineal),
					...property('shape', SHAPES[config.shape] ?? SHAPES.dot),
					...property('interpolation', INTERPOLATIONS[config.interpolation] ?? INTERPOLATIONS.sinusoidal),
					...property('size_mode', 1),
					...property('size_x', config.size * scale),
					...property('size_y', config.size * scale),
					...property('rotation', halftone.angle),
				};

				await edit(`opencomic:halftone:${area}:${mode}`, properties, (applyIn === 'both'));
			}
		}
		else
		{
			await edit(`opencomic:halftone:${area}:intensity`, {}, false);
			await edit(`opencomic:halftone:${area}:alpha`, {}, false);
		}

		result[area] = {
			type: 'halftone',
			applyIn,
			modes,
		};
	}

	return result;
}

async function removeAll(): Promise<void> {

	const areas: Area[] = ['all', 'up', 'middle', 'down'];

	const layers: any[] = [];

	for(const area of areas)
	{
		layers.push({
			name: `opencomic:halftone:${area}:intensity`,
		});

		layers.push({
			name: `opencomic:halftone:${area}:alpha`,
		});

		layers.push({
			name: `opencomic:halftone:${area}:independent_channels`,
		});

		layers.push({
			name: `opencomic:draw:${area}:clone`,
		});
	}

	await krita.send(`remove_layers:${JSON.stringify(layers)}`);

	return;

}

export default {
	config,
	add,
	addAll,
	addAllWithConfig,
	edit,
	randLayers,
	removeAll,
}
