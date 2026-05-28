import krita from '../krita.mjs';
import coords from '../coords.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import rand from '../rand.mjs';
import calcArea from './area.mjs';
import colors from './colors.mjs';
import {sleep} from '../tools.mjs';

import {lines} from './lineart.mjs';

import {Drawings, Area} from '../types.mjs';

async function draw(options: any, drawing: any, area: Area, draws:Record<string, Drawings[]>): Promise<Drawings[]> {
	
	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	const _drawing = drawing;
	drawing = _options.randomize(cloneDeep(drawing));

	const drawings: Drawings[] = [];

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:group:draw:'+area,
		type: 'grouplayer',
		above: {
			index: 0, // Background layer
		}
	})}`);

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:draw:background:'+area,
		type: 'paintlayer',
		inside: {
			name: 'opencomic:group:draw:'+area,
		},
	})}`);

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:draw:'+area,
		type: 'paintlayer',
		inside: {
			name: 'opencomic:group:draw:'+area,
		},
	})}`);

	await krita.send('edit_layer:'+JSON.stringify({
		name: 'opencomic:colorize-mask:'+area,
		visible: false,
	}));

	for(const paintDrawing of draws.colorizeMask)
	{
		const color = paintDrawing.color!;

		if(color.a === 0)
			continue;

		const points: number[] = [];

		const gray = randGenerator.range(0, 255);
		const brushSize = rand.generate([drawing.brush.size.min, drawing.brush.size.max], randGenerator) as number * scale;

		const colorsGroup = colors.group(options);

		await krita.editView({
			foregroundColor: colorsGroup.color(),
			currentBrushPreset: rand.generate(drawing.brush.name, randGenerator),
			brushSize: brushSize,
		});

		const select = await krita.selectByColor({
			layer: {
				name: 'opencomic:colorize-mask:'+area,
			},
			r: color.r,
			g: color.g,
			b: color.b,
			a: color.a,
			blur: 1, // 2,
		});

		// await krita.send('action:deselect');

		//const type = randGenerator.range(0, 2);
		const amount = rand.generate(_drawing?.brush?.amount ?? [1], randGenerator) as number;
		const type = 0;

		for(let i = 0; i < amount; i++)
		{
			if(i > 1)
			{
				await krita.send(`edit_view:${JSON.stringify({
					foregroundColor: colorsGroup.color(),
				})}`);
			}

			switch(type)
			{
				case 0: // lines

					const _points = await lines({
						layer: 'opencomic:draw:'+area,
						width: select.width,
						height: select.height,
						x: select.x,
						y: select.y,
						endX: select.endX,
						endY: select.endY,
						cubicSmooth: randGenerator.range(0, 3) > 0 ? true : false,
						offsetArea: Math.round(Math.min(select.width, select.height) / 10),
						randGenerator,
						pointOffset: select.width / 5,
						pointsMin: drawing.points.min,
						pointsMax: drawing.points.max,
						sublines: options.base.lineart.sublines.active ? options.base.lineart.sublines.amount : undefined,
					});

					points.push(..._points);

					break;

				case 1: // dots


					break;
			}
		}

		drawings.push({
			type: 'paint',
			points: points,
		});

		// break;
	}

	const select = await krita.selectByColor({
		layer: {
			name: 'opencomic:draw:'+area,
		},
		onlyAlpha: true,
		// blur: 1, // 2,
	});

	const rgb = options.base.background;
	const gray = options.base.background.gray;

	await krita.send(`edit_view:${JSON.stringify({
		backgroundColor: {
			r: rgb.r ?? gray,
			g: rgb.g ?? gray,
			b: rgb.b ?? gray,
			a: 255,
		},
	})}`);

	await krita.send(`select_layer:${JSON.stringify({
		name: 'opencomic:draw:background:'+area,
	})}`);

	await krita.send('action:fill_selection_background_color');

	await krita.send('action:deselect');
	
	return drawings;

}



export default {

	draw,
}