import krita from '../krita.mjs';
import coords from '../coords.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import calcArea from './area.mjs';
import {sleep} from '../tools.mjs';
import brush from './brush.mjs';

import {Drawings, Area} from '../types.mjs';

async function colorize(options: any, drawing: any, area: Area): Promise<Drawings[]> {
	
	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	drawing = _options.randomize(cloneDeep(drawing));

	const {drawHeight, offsetArea, pointOffset, drawY, drawYEnd, middleWidth} = calcArea(area, options.base.size.height, options.base.size.width);

	await brush.set(options, {
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 255,
		},
		name: 'u) Pixel Art Fill',
		size: 10,
	});

	const drawings: Drawings[] = [];

	let color = 0;

	for(let i = 0; i < drawing.amount; i++)
	{
		color++;

		const r = Math.floor(color / 3 + 0.000) * 10;
		const g = Math.floor(color / 3 + 0.334) * 10;
		const b = Math.floor(color / 3 + 0.667) * 10;

		const x = randGenerator.range(0, options.base.size.width);
		const y = randGenerator.range(drawY, drawYEnd);

		drawings.push(await drawPointsAt(options, area, x, y, {r, g, b, a: 255}));
	}
	
	await brush.set(options, {
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0,
		},
	});

	if(area !== 'all')
	{
		drawings.push(await drawPointsAt(options, area, 0, drawY - offsetArea, {r: 0, g: 0, b: 0, a: 0}, options.base.size.width));
		drawings.push(await drawPointsAt(options, area, 0, drawYEnd + offsetArea, {r: 0, g: 0, b: 0, a: 0}, options.base.size.width));
	}

	await krita.send(`edit_layer:${JSON.stringify({
		name: 'opencomic:colorize-mask:'+area,
		useEdgeDetection: true,
		edgeDetectionSize: 4,
		cleanUpAmount: 70,
		updateMask: true,
	})}`);

	await krita.send(`select_layer:${JSON.stringify({
		name: 'opencomic:colorize-mask:'+area,
	})}`);

	await krita.send(`action:convert_to_paint_layer`);

	return drawings;

}

async function drawPointsAt(options: any,area: Area, x: number, y: number, color: {r: number; g: number; b: number; a: number;}, x2?: number, y2?: number): Promise<Drawings> {

	x = Math.floor(x);
	y = Math.floor(y);

	x2 = x2 !== undefined ? Math.floor(x2) : x + 10;
	y2 = y2 !== undefined ? Math.floor(y2) : y;

	const {r, g, b, a} = color;

	await brush.set(options, {
		color: {
			r: r,
			g: g,
			b: b,
			a: a,
		},
	});

	await krita.send(`draw_line:${JSON.stringify({
		name: 'opencomic:colorize-mask:'+area,
		lines: [
			{
				points: [x, y, x2, y2],
				pressureOne: 1.0,
				pressureTwo: 1.0,
			},
		],
	})}`);

	return {
		type: 'colorize-mask',
		points: [x, y, x2, y2],
		color: {r, g, b, a},
	};
}

export default {
	colorize,
}