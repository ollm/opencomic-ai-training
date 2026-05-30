import krita from '../krita.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import coords from '../coords.mjs';
import colors from './colors.mjs';
import calcArea from './area.mjs';
import brush from './brush.mjs';

import {Drawings, Area, ColorGroup} from '../types.mjs';

async function parallel(options: any, drawing: any, area: Area, groupLayer: string, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	const _drawing = drawing;
	drawing = _options.randomize(cloneDeep(drawing));

	const isGrid = drawing.type === 'grid';

	const drawings: Drawings[] = [];

	if(!await krita.getLayer({name: 'opencomic:lines:'+area}))
	{
		await krita.send(`add_layer:${JSON.stringify({
			name: 'opencomic:lines:'+area,
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
		const size = rand.generate([drawing.brush.size.min, drawing.brush.size.max], randGenerator) as number * scale;

		const areaSize = {
			width: size,
			height: size,
			x: randGenerator.next(),
			y: randGenerator.next(),
		};

		const {drawHeight, offsetArea, pointOffset, drawY, drawYEnd, drawX, drawXEnd} = calcArea(area, options.base.size.height, options.base.size.width, areaSize);

		const offset = rand.generate([drawing.separation.min, drawing.separation.max], randGenerator) as number
		const lineLenght = rand.generate([drawing.length.min, drawing.length.max], randGenerator) as number

		const verticalAndHorizontal = randGenerator.next() < drawing.verticalAndHorizontalChance;
		const horizontal = (randGenerator.next() < 0.5 ? true : false);
		const angle = verticalAndHorizontal ? (horizontal ? 0 : Math.PI / 2) : randGenerator.range(0, Math.PI * 2);
		const perpendicularAngle = angle + Math.PI / 2;
		const gridAngle = angle + Math.PI / 2;
		const gridPerpendicularAngle = gridAngle + Math.PI / 2;

		const lines = drawing.lines ? rand.generate([drawing.lines.min, drawing.lines.max], randGenerator) as number : 1;

		for(let i2 = 0; i2 < lines; i2++)
		{
			const centeredIndex = i2 - ((lines - 1) / 2);
			const _points: number[] = processLine(lineLenght, centeredIndex, drawX, drawY, offset, angle, perpendicularAngle);

			await krita.send(`draw_cubic_line: ${JSON.stringify({
				name: 'opencomic:lines:'+area,
				points: coords.toKrita('cubic', coords.cubicBezier({
					points: _points,
					smooth: true ? {type: 'continuous'} : undefined,
					// closed: true,
				}))
			})}`);

			points.push(..._points);

			if(isGrid)
			{
				const _gridPoints: number[] = processLine(lineLenght, centeredIndex, drawX, drawY, offset, gridAngle, gridPerpendicularAngle);

				await krita.send(`draw_cubic_line: ${JSON.stringify({
					name: 'opencomic:lines:'+area,
					points: coords.toKrita('cubic', coords.cubicBezier({
						points: _gridPoints,
						smooth: true ? {type: 'continuous'} : undefined,
						// closed: true,
					}))
				})}`);

				points.push(..._gridPoints);
			}
		}
	}

	drawings.push({
		type: 'lines',
		points: points,
	});
	
	return drawings;

}

function processLine(lineLenght: number, index: number, drawX: number, drawY: number, offset: number, angle: number, perpendicularAngle: number): number[] {

	const centerX = drawX + (Math.cos(perpendicularAngle) * offset * index);
	const centerY = drawY + (Math.sin(perpendicularAngle) * offset * index);
	const endX = centerX + (Math.cos(angle) * lineLenght);
	const endY = centerY + (Math.sin(angle) * lineLenght);

	const points: number[] = [
		centerX, centerY,
		endX, endY,
	];

	return points;
}

async function grid(options: any, drawing: any, area: Area, groupLayer: string, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	return parallel(options, drawing, area, groupLayer, draws);

}

export default {
	parallel,
	grid,
}