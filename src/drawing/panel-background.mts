import krita from '../krita.mjs';
import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';
import brush from './brush.mjs';

import {Drawings, Area} from '../types.mjs';

async function draw(options: any, drawing: any, area: Area, draws: Record<string, Drawings[]>): Promise<Drawings[]> {

	drawing = _options.randomize(cloneDeep(drawing));

	if(!drawing.panels || !area.startsWith('panel-'))
		return [];

	const color = draws.colorizeMask[0]?.color;

	if(!color)
		return [];

	await krita.selectByColor({
		layer: {
			name: 'opencomic:colorize-mask:'+area,
		},
		r: color.r,
		g: color.g,
		b: color.b,
		a: color.a,
		blur: 0.6,
	});

	const baseBackground = options.base.background;
	const hasBaseGray = typeof baseBackground?.gray === 'number';
	const hasBaseRgb = typeof baseBackground?.r === 'number' && typeof baseBackground?.g === 'number' && typeof baseBackground?.b === 'number';

	const useBaseBackground = drawing.useBaseBackground && (hasBaseGray || hasBaseRgb);
	const gray = drawing.colors.gray;

	const backgroundColor = useBaseBackground ? {
		r: baseBackground.r ?? baseBackground.gray,
		g: baseBackground.g ?? baseBackground.gray,
		b: baseBackground.b ?? baseBackground.gray,
	} : {
		r: gray,
		g: gray,
		b: gray,
	};

	await brush.set(options, {
		backgroundColor: {
			r: backgroundColor.r,
			g: backgroundColor.g,
			b: backgroundColor.b,
			a: 255,
		},
	});

	await krita.send(`select_layer:${JSON.stringify({
		name: 'opencomic:draw:background:'+area,
	})}`);
	await krita.send('action:fill_selection_background_color');
	await krita.send('action:deselect');

	return [];
}

export default {
	draw,
};