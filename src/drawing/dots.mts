import krita from '../krita.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import coords from '../coords.mjs';
import colors from './colors.mjs';
import calcArea from './area.mjs';
import {sleep} from 'tools.mjs';

import {lines} from './lineart.mjs';

import {Drawings, Area} from '../types.mjs';

async function draw(options: any, drawing: any, area: Area, groupLayer: string, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	const _drawing = drawing;
	drawing = _options.randomize(cloneDeep(drawing));

	const drawings: Drawings[] = [];

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:dots:'+area,
		type: 'paintlayer',
		inside: {
			name: 'opencomic:group:'+groupLayer,
		},
	})}`);

	const points: number[] = [];

	const colorsGroup = colors.group(options, drawing);

	await krita.editView({
		foregroundColor: {r: 0, g: 0, b: 0, a: 255}, // colorsGroup.color(),
		currentBrushPreset: 'b) Basic-1',
		brushSize: 2 * scale,
	}); 

	const amount = rand.generate(_drawing?.amount ?? [1], randGenerator) as number;

	for(let i = 0; i < amount; i++)
	{
		const size = rand.generate([drawing.size.min, drawing.size.max], randGenerator) as number * scale;

		const areaSize = {
			width: size,
			height: size,
			x: randGenerator.next(),
			y: randGenerator.next(),
		};

		const {drawHeight, offsetArea, pointOffset, drawY, drawYEnd, drawX, drawXEnd} = calcArea(area, options.base.size.height, options.base.size.width, areaSize);

		/*if(i > 1)
		{
			await krita.send(`edit_view:${JSON.stringify({
				foregroundColor: colorsGroup.color(),
			})}`);
		}*/

		const offset = size * 3 + 0.001;

		const verticalAndHorizontal = randGenerator.next() < drawing.verticalAndHorizontalChance;
		const horizontal = (randGenerator.next() < 0.5 ? true : false);

		const offsetX = (verticalAndHorizontal && !horizontal) ? 0 : rand.generate([-offset, offset], randGenerator) as number;
		const offsetY = (verticalAndHorizontal && horizontal) ? 0 : rand.generate([-offset, offset], randGenerator) as number;

		const dots = rand.generate([drawing.dots.min, drawing.dots.max], randGenerator) as number;

		for(let i2 = 0; i2 < dots; i2++)
		{
			const _points: number[] = processPoints(size, i2, drawX, drawY, offsetX, offsetY);

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

	drawings.push({
		type: 'dots',
		points: points,
	});
	
	return drawings;

}

function processPoints(size: number, index: number, drawX: number, drawY: number, offsetX: number, offsetY: number): number[] {

	size = size / 10;
	const base: number[] = [0, 2, 2, 0, 4, 2, 2, 4, 0, 2, 2, 0];

	const points: number[] = [];

	for(let i = 0; i < base.length / 2; i++)
	{
		const x = (base[i * 2] * size) + drawX + (offsetX * index);
		const y = (base[i * 2 + 1] * size) + drawY + (offsetY * index);

		points.push(x, y);
	}

	return points;
}


export default {
	draw,
}