import krita from '../krita.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';

import {Area} from '../types.mjs';

type RandomFilterType = 'random-noise' | 'random-pick';

type Config = {
	applyIn: 'without' | 'both' | 'degraded',
	colorSpace?: 'GRAYA' | 'RGBA',
	properties: Record<string, number>,
}

function config(areas: Area[], options: any, drawing: Record<string, any>, type: RandomFilterType): Record<Area, Config> {

	const randGenerator = options.currentImageRand!;

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
		const applyIn = rand.generate(_drawing.applyIn, randGenerator) as Config['applyIn'];
		const settings = applyIn === 'both' ? _drawing.both : (applyIn === 'without' ? (_drawing.both ?? _drawing.degraded) : _drawing.degraded);
		const properties = _options.randomize(cloneDeep(settings));

		if(type === 'random-noise')
		{
			properties.seedThreshold = randGenerator.range(0, 2147483647);
			properties.seedRed = randGenerator.range(0, 2147483647);
			properties.seedGreen = randGenerator.range(0, 2147483647);
			properties.seedBlue = randGenerator.range(0, 2147483647);
		}
		else
		{
			properties.seedThreshold = randGenerator.range(0, 2147483647);
			properties.seedH = randGenerator.range(0, 2147483647);
			properties.seedV = randGenerator.range(0, 2147483647);
		}

		result[area] = {
			applyIn,
			colorSpace: type === 'random-noise' ? rand.generate(_drawing.colorSpace, randGenerator) : undefined,
			properties,
		};
	}

	return result;

}

async function addWithConfig(options: any, type: RandomFilterType, {applyIn, colorSpace, properties}: Config, area: Area, isDegraded: boolean = false): Promise<any> {

	if(applyIn !== 'without' && (isDegraded || applyIn === 'both'))
	{
		const layerName = (await krita.getLayer({name: 'opencomic:texture:pattern'}) || await krita.getLayer({name: 'opencomic:gradient'})) ? `opencomic:group:${options.groupLayer}` : `opencomic:group:draw:${area}`;

		if(colorSpace)
		{
			await krita.send(`set_layer_color_space:${JSON.stringify({
				name: layerName,
				colorModel: colorSpace,
			})}`);
		}

		await krita.send(`add_layer:${JSON.stringify({
			name: `opencomic:${type}:${area}`,
			filter: type === 'random-noise' ? 'noise' : 'randompick',
			inside: {
				name: layerName,
			},
			properties,
			visible: true,
		})}`);
	}

	return {
		type,
		applyIn,
		colorSpace,
		config: properties,
	};

}

async function addAllWithConfig(options: any, areas: Area[], type: RandomFilterType, config: Record<Area, Config>, isDegraded: boolean = false): Promise<Record<Area, any>> {

	const result: Record<Area, any> = {
		all: null,
		up: null,
		middle: null,
		down: null,
	};

	for(const area of areas)
	{
		result[area] = await addWithConfig(options, type, config[area], area, isDegraded);
	}

	return result;
}

async function removeAll(areas: Area[], type: RandomFilterType): Promise<void> {

	const layers = areas.map(area => ({
		name: `opencomic:${type}:${area}`,
	}));

	await krita.send(`remove_layers:${JSON.stringify(layers)}`);

}

export default {
	config,
	addAllWithConfig,
	removeAll,
}
