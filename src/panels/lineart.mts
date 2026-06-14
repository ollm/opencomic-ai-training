import panels from '../panels.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import colors from '../drawing/colors.mjs';
import brush from '../drawing/brush.mjs';
import coords from '../coords.mjs';
import krita from '../krita.mjs';
import rand from '../rand.mjs';

import {sleep} from '../tools.mjs';

import {Drawings, Area, Point} from '../types.mjs';

export default async function lineart(options: any, drawing: any, area: Area): Promise<Drawings[]> {

	const layerName = 'panels-lineart';

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;

	drawing = _options.randomize(cloneDeep(drawing));

	const _colors = drawing?.brush?.colors || options.base[layerName]?.brush?.colors;
	const colorsGroup = colors.group(options, _colors, layerName);

	await brush.set(options, {
		size: drawing?.brush?.size ?? options.base[layerName]?.brush?.size,
		name: drawing?.brush?.name ?? options.base[layerName]?.brush?.name,
		color: colorsGroup.color(),
		layerName,
	});

	const p = area.startsWith('panel-') ? parseInt(area.split('-')[1]) : -1;
	const polygons = panels.current;
	const polygon = polygons?.[p];

	if(!polygon)
		throw new Error('No polygon found for area '+area);

	const unclosedPanels = drawing.unclosedPanels;
	const fullUnclosedPanels = rand.prob(drawing.fullUnclosedPanels._prob ?? 0, randGenerator);
	let unclosed = 0;

	const lastPoint = polygon[polygon.length - 1];
	let prevPoints: Point = lastPoint;

	for(let i = 0; i < polygon.length; i++)
	{
		const point = polygon[i];

		const _points: number[] = [
			prevPoints.x,
			prevPoints.y,
			point.x,
			point.y,
		];

		prevPoints = point;

		const flatten = drawing.flatten ? rand.prob(drawing.flatten._prob, randGenerator) : false;

		if((rand.prob(drawing.unclosedPanels._prob ?? 0, randGenerator) && unclosed < drawing.unclosedPanels.max) || fullUnclosedPanels)
		{
			unclosed++;
			continue;
		}

		await krita.send(`draw_cubic_line: ${JSON.stringify({
			name: 'opencomic:lineart:'+area,
			points: coords.toKrita('cubic', coords.cubicBezier({
				points: _points,
				smooth: {type: 'continuous'},
				// closed: true,
			}))
		})}`);
	}

	// process.exit(0);

	return [];

}