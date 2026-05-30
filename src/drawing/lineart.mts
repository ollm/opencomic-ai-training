import krita from '../krita.mjs';
import coords from '../coords.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import calcArea from './area.mjs';
import brush from './brush.mjs';
import colors from './colors.mjs';

import {sleep} from '../tools.mjs';

import {Drawing, Drawings, Area, RandGenerator} from '../types.mjs';

async function draw(options: any, drawing: any, area: Area, layerName: Drawing = 'lineart'): Promise<Drawings[]> {
	
	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;

	drawing = _options.randomize(cloneDeep(drawing));

	console.log(drawing?.brush?.colors);
	console.log(options.base[layerName]?.brush?.colors);

	const _colors = drawing?.brush?.colors || options.base[layerName]?.brush?.colors; // : options.base.colors;
	const colorsGroup = colors.group(options, _colors, layerName);

	await brush.set(options, {
		size: drawing?.brush?.size ?? options.base[layerName]?.brush?.size,
		name: drawing?.brush?.name ?? options.base[layerName]?.brush?.name,
		color: colorsGroup.color(),
		layerName,
	});

	const drawings: Drawings[] = [];

	const amount = drawing.brush?.amount ?? drawing.amount;

	for(let i = 0; i < amount; i++)
	{
		const points = await _lines(options, drawing, area, layerName);

		drawings.push({
			type: layerName,
			data: {},
			points: points,
		});
	}
	
	return drawings;

}

export async function _lines(options: any, drawing: any, area: Area, layerName: string = 'lineart'): Promise<number[]> {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	const areaSize = drawing.areaSize ? {
		width: rand.generate([drawing.areaSize?.min ?? 0, drawing.areaSize?.max ?? 0], randGenerator) as number * scale,
		height: rand.generate([drawing.areaSize?.min ?? 0, drawing.areaSize?.max ?? 0], randGenerator) as number * scale,
		x: randGenerator.next(),
		y: randGenerator.next(),
	} : undefined;

	const {drawHeight, offsetArea, pointOffset, drawY, drawYEnd, drawX, drawXEnd} = calcArea(area, options.base.size.height, options.base.size.width, areaSize);
	const smooth = rand.prob(options.base[layerName].cubicPercentage, randGenerator);

	const sublinesActive = drawing?.sublines?.active ?? options.base[layerName].sublines.active;

	return await lines({
		layer: 'opencomic:'+layerName+':'+area,
		width: options.base.size.width,
		height: drawHeight,
		x: drawX,
		y: drawY,
		endX: drawXEnd,
		endY: drawYEnd,
		cubicSmooth: smooth,
		offsetArea,
		randGenerator,
		pointOffset,
		pointsMin: drawing.points.min,
		pointsMax: drawing.points.max,
		sublines: (sublinesActive) ? (drawing?.sublines?.amount ?? options.base[layerName].sublines.amount) : undefined,
	});

}

export interface LinesOptions {
	layer: string;
	layerName?: Drawing;
	width: number;
	height: number;
	x: number;
	y: number;
	endX: number;
	endY: number;
	cubicSmooth: boolean;
	offsetArea: number;
	randGenerator: RandGenerator;
	pointOffset: number;
	pointsMin: number;
	pointsMax: number;
	sublines?: number;
}

export async function lines({layer, layerName, width, height, x, y, endX, endY, cubicSmooth, offsetArea, randGenerator, pointOffset, pointsMin, pointsMax, sublines}: LinesOptions): Promise<number[]> {

	let prevPoints: number[] = [
		randGenerator.range(x, endX),
		randGenerator.range(y, endY)
	];

	const points: number[] = [...prevPoints];
	const pointsCount = rand.generate([pointsMin, pointsMax], randGenerator) as number;

	for(let i = 1; i < pointsCount; i++)
	{
		const offsetX = randGenerator.range(-pointOffset, pointOffset);
		const offsetY = randGenerator.range(-pointOffset, pointOffset);

		const point = [
			Math.min(Math.max(prevPoints[0] + offsetX, -offsetArea), endX + offsetArea),
			Math.min(Math.max(prevPoints[1] + offsetY, y - offsetArea), endY + offsetArea)
		]

		points.push(...point);
		prevPoints = point;
	}

	// const smooth = rand.prob(options.base[layerName].cubicPercentage, randGenerator);

	points.push(points[0], points[1]);
	points.unshift(prevPoints[0], prevPoints[1]);

	await krita.send(`draw_cubic_line: ${JSON.stringify({
		name: layer,
		points: coords.toKrita('cubic', coords.cubicBezier({
			points: points,
			smooth: cubicSmooth ? {type: 'continuous'} : undefined,
			// closed: true,
		}))
	})}`);

	if(sublines)
	{

	}

	return points;

}

export default {
	draw,
}