import cloneDeep from 'lodash.clonedeep';

import _options from '../options.mjs';
import krita from '../krita.mjs';
import rand from '../rand.mjs';
import {sleep} from '../tools.mjs';

import colors from './colors.mjs';
import {lines} from './lineart.mjs';
import brush from './brush.mjs';

async function add(options: any, drawing: any): Promise<any> {

	const randGenerator = options.currentImageRand!;
	drawing = _options.randomize(cloneDeep(drawing));

	const type = rand.generate([0, 5], randGenerator);

	switch(type)
	{
		case 0:
			await kritaGradient(options, drawing);
			break;

		default:
			await brushGradient(options, drawing);
			break;
	}

	return {
		type: 'gradient',
	};

}

async function kritaGradient(options: any, drawing: any) {

	const randGenerator = options.currentImageRand!;
	let gradient = drawing.gradient;

	if(gradient === 'all')
		gradient = rand.generate(Object.keys(krita.gradients), randGenerator);

	await krita.editView({
		currentGradient: gradient,
	});

	const properties = {
		gradient,
	};

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:gradient',
		inside: {
			name: `opencomic:group:${options.groupLayer}`,
		},
		fill: 'gradient',
		properties: properties,
		opacity: drawing.opacity ?? 255,
	})}`);

}

async function brushGradient(options: any, drawing: any) {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;

	const size = options.base.size;

	const colorsGroup = colors.group(options, options.base.colors);
	const color = colorsGroup.color();

	const brushSize = rand.generate([100, 1000], randGenerator) as number;

	await brush.set(options, {
		color: color,
		backgroundColor: {
			r: 255,
			g: 255,
			b: 255,
			a: 255,
		},
		name: 'b) Airbrush Soft',
		size: brushSize,
	});

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:gradient',
		inside: {
			name: `opencomic:group:${options.groupLayer}`,
		},
		type: 'paintlayer',
		opacity: drawing.opacity ?? 255,
	})}`);

	await krita.send(`select_layer:${JSON.stringify({
		name: 'opencomic:gradient',
	})}`);

	await krita.send('action:fill_selection_background_color');

	const _width = size.width * scale;
	const _height = size.height * scale;

	await lines({
		layer: 'opencomic:gradient',
		width: _width,
		height: _height,
		x: 0,
		y: 0,
		endX: _width,
		endY: _height,
		cubicSmooth: randGenerator.range(0, 3) > 0 ? true : false,
		offsetArea: Math.round(Math.min(_width, _height) / 10),
		randGenerator,
		pointOffset: _width / 5,
		pointsMin: 1,
		pointsMax: 20,
		sublines: 0,
	});

}

// gradientmap

export default {
	add,
};
