import krita from '../krita.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import coords from '../coords.mjs';
import colors from './colors.mjs';
import calcArea from './area.mjs';
import brush from './brush.mjs';

import {Drawings, Area, ColorGroup} from '../types.mjs';

async function draw(options: any, drawing: any, area: Area, groupLayer: string, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	const _drawing = drawing;
	drawing = _options.randomize(cloneDeep(drawing));

	const drawings: Drawings[] = [];

	if(!await krita.getLayer({name: 'opencomic:dots:'+area}))
	{
		await krita.send(`add_layer:${JSON.stringify({
			name: 'opencomic:dots:'+area,
			type: 'paintlayer',
			inside: {
				name: 'opencomic:group:'+groupLayer,
			},
		})}`);
	}

	const points: number[] = [];

	const colorsGroup = colors.group(options, drawing);

	const drawingBrush = drawing.brush ?? {size: 2, name: 'b) Basic-1'};
	await brush.set(options, {...drawingBrush, color: colorsGroup.color()});

	const amount = rand.generate(_drawing?.amount ?? [1], randGenerator) as number;

	for(let i = 0; i < amount; i++)
	{
		await brush.set(options, {...drawingBrush, color: colorsGroup.color()});
	
		const size = rand.generate([drawing.size.min, drawing.size.max], randGenerator) as number * scale;
		const sizeDot = drawing.sizeDot ? rand.generate([drawing.sizeDot.min, drawing.sizeDot.max], randGenerator) as number * scale : 0;

		const areaSize = {
			width: size,
			height: size,
			x: randGenerator.next(),
			y: randGenerator.next(),
		};

		const {drawHeight, offsetArea, pointOffset, drawY, drawYEnd, drawX, drawXEnd} = calcArea(area, options.base.size.height, options.base.size.width, areaSize);

		const spread = drawing.spread ?? 0 as number;

		const offset = size * 3 + 0.001;

		const verticalAndHorizontal = randGenerator.next() < drawing.verticalAndHorizontalChance;
		const horizontal = (randGenerator.next() < 0.5 ? true : false);

		const offsetX = spread || (verticalAndHorizontal && !horizontal) ? 0 : rand.generate([-offset, offset], randGenerator) as number;
		const offsetY = spread || (verticalAndHorizontal && horizontal) ? 0 : rand.generate([-offset, offset], randGenerator) as number;

		const segments = drawing.segments ? rand.generate([drawing.segments.min, drawing.segments.max], randGenerator) as number : 32;

		const dots = drawing.dots ? rand.generate([drawing.dots.min, drawing.dots.max], randGenerator) as number : 1;

		// Flatten
		const flatten = drawing.flatten ? rand.prob(drawing.flatten._prob, randGenerator) : false;
		const flattenHorizontal = flatten ? rand.prob(0.5, randGenerator) : false;
		const flattenX = flatten && flattenHorizontal ? rand.generate([drawing.flatten.ratio.min, drawing.flatten.ratio.max], randGenerator) as number : 1;
		const flattenY = flatten && !flattenHorizontal ? rand.generate([drawing.flatten.ratio.min, drawing.flatten.ratio.max], randGenerator) as number : 1;

		for(let i2 = 0; i2 < dots; i2++)
		{
			const spreadX = spread ? rand.generate([-spread, spread], randGenerator) as number : 0;
			const spreadY = spread ? rand.generate([-spread, spread], randGenerator) as number : 0;

			const _points: number[] = processPoints(size, i2, drawX, drawY, offsetX, offsetY, spreadX, spreadY, segments, flattenX, flattenY);

			await brush.set(options, {...drawingBrush, color: colorsGroup.color()});

			await krita.send(`draw_cubic_line: ${JSON.stringify({
				name: 'opencomic:dots:'+area,
				points: coords.toKrita('cubic', coords.cubicBezier({
					points: _points,
					smooth: true ? {type: 'continuous'} : undefined,
					// closed: true,
				}))
			})}`);

			points.push(..._points);

			if(sizeDot > 0)
			{
				await brush.set(options, {...drawingBrush, size: 2, color: colorsGroup.color()});
				const _points: number[] = processPoints(sizeDot, i2, drawX, drawY, offsetX, offsetY, spreadX, spreadY, segments);

				await krita.send(`draw_cubic_line: ${JSON.stringify({
					name: 'opencomic:dots:'+area,
					points: coords.toKrita('cubic', coords.cubicBezier({
						points: _points,
						smooth: true ? {type: 'continuous'} : undefined,
						// closed: true,
					}))
				})}`);

				points.push(..._points);
			}
		}
	}

	drawings.push({
		type: 'dots',
		points: points,
	});
	
	return drawings;

}

function processPoints(size: number, index: number, drawX: number, drawY: number, offsetX: number, offsetY: number, spreadX: number, spreadY: number, segments: number = 32, flattenX: number = 1, flattenY: number = 1): number[] {

	size = size / 5;

	const radiusX = (size / 2) * flattenX;
	const radiusY = (size / 2) * flattenY;

	const centerX = drawX + (offsetX * index) + spreadX;
	const centerY = drawY + (offsetY * index) + spreadY;

	const points: number[] = [];

	for(let i = 0; i <= segments + 2; i++)
	{
		const angle = (i / segments) * Math.PI * 2;

		const x = centerX + Math.cos(angle) * radiusX;
		const y = centerY + Math.sin(angle) * radiusY;

		points.push(x, y);
	}

	return points;
}

async function circles(options: any, drawing: any, area: Area, groupLayer: string, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	return draw(options, drawing, area, groupLayer, draws);

}

async function circlesWithDot(options: any, drawing: any, area: Area, groupLayer: string, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	return draw(options, drawing, area, groupLayer, draws);

}

export default {
	draw,
	circles,
	circlesWithDot,
}