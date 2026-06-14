import sharp from 'sharp';
import krita from '../krita.mjs';
import _panels from '../panels.mjs';
import coords from '../coords.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import calcArea from './area.mjs';
import {sleep} from '../tools.mjs';
import brush from './brush.mjs';

import {Drawings, Area, Point} from '../types.mjs';

async function colorize(options: any, drawing: any, area: Area): Promise<Drawings[]> {
	
	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	drawing = _options.randomize(cloneDeep(drawing));

	const {drawHeight, offsetArea, pointOffset, drawY, drawYEnd, drawX, drawXEnd, middleWidth} = calcArea(area, options.base.size.height, options.base.size.width);

	let centerX = (drawXEnd - drawX) / 2 + drawX;
	let centerY = (drawYEnd - drawY) / 2 + drawY;

	if(area.startsWith('panel-'))
	{
		const p = parseInt(area.split('-')[1]);	
		const polygons = _panels.current;
		const polygon = polygons?.[p];

		if(polygon)
		{
			const len = polygon.length;

			centerX = polygon.reduce((sum: number, point: Point) => sum + point.x, 0) / len;
			centerY = polygon.reduce((sum: number, point: Point) => sum + point.y, 0) / len;
		}
	}

	// Get if lineart are mostly white
	const layer = await krita.layer({
		name: 'opencomic:lineart:'+area,
	});

	const {data} = await sharp(Buffer.from(layer.image, 'base64')).raw().toBuffer({resolveWithObject: true});

	let sum = 0;
	let count = 0;

	for(let i = 0; i < data.length; i += 4)
	{
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];

		if(a > 0)
		{
			sum += (r + g + b) / 3;
			count++;
		}
	}

	const average = count > 0 ? sum / count : 0;
	const invertLayer = average > 200; // If the lineart is mostly white, we want to invert it for the colorize mask

	if(invertLayer)
	{
		await krita.send(`select_layer:${JSON.stringify({
			name: 'opencomic:lineart:'+area,
		})}`);

		await krita.send(`action:krita_filter_invert`);
	}

	await brush.set(options, {
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 255,
		},
		name: 'u) Pixel Art Fill',
		size: 10,
		notInvert: true,
	});

	const panels = drawing.panels ?? false;
	const amount = panels ? 2 : drawing.amount;

	const drawings: Drawings[] = [];

	let color = 0;

	for(let i = 0; i < amount; i++)
	{
		color++;

		const r = Math.floor(color / 3 + 0.000) * 10;
		const g = Math.floor(color / 3 + 0.334) * 10;
		const b = Math.floor(color / 3 + 0.667) * 10;

		let x = randGenerator.range(drawX, drawXEnd);
		let y = randGenerator.range(drawY, drawYEnd);

		if(panels)
		{
			if(i === 0) // Center box
			{
				x = centerX;
				y = centerY;
			}
			else if(i === 1) // Outsize box
			{
				if(drawX > 100 || drawY > 100)
				{
					x = 0;
					y = 0;
				}
				else
				{
					x = options.base.size.width - 10;
					y = options.base.size.height - 10;
				}
			}
		}

		drawings.push(await drawPointsAt(options, area, x, y, {r, g, b, a: 255}));
	}
	
	await brush.set(options, {
		color: {
			r: 0,
			g: 0,
			b: 0,
			a: 0,
		},
		notInvert: true,
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

	// await sleep(10000000);

	await krita.send(`action:convert_to_paint_layer`);

	if(invertLayer)
	{
		await krita.send(`select_layer:${JSON.stringify({
			name: 'opencomic:lineart:'+area,
		})}`);

		await krita.send(`action:krita_filter_invert`);
	}

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
		notInvert: true,
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