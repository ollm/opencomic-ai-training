import krita from '../krita.mjs';
import rand from '../rand.mjs';

import {Color} from '../types.mjs';

interface BrushOptions {
	size?: number | {min: number, max: number},
	name?: string | string[],
	color?: Color,
	backgroundColor?: Color,
	layerName?: string,
}

interface BrushPrev {
	size?: number,
	name?: string,
	color?: Color,
	_color?: string,
	backgroundColor?: Color,
	_backgroundColor?: string,
	layerName?: string,
}

let prev: BrushPrev = {
	size: undefined,
	name: undefined,
	color: undefined,
	_color: undefined,
	backgroundColor: undefined,
	_backgroundColor: undefined,
};

async function setBrushSize(size: number, name: string, color: Color, bColor: Color, force: boolean = false) {

	const _color = `${color.r}, ${color.g}, ${color.b}, ${color.a}`;
	const _backgroundColor = `${bColor.r}, ${bColor.g}, ${bColor.b}, ${bColor.a}`;

	if(prev.size === size && prev.name === name && prev._color === _color && prev._backgroundColor === _backgroundColor && !force) return;

	prev = {
		size,
		name,
		color: color,
		_color: _color,
		backgroundColor: bColor,
		_backgroundColor: _backgroundColor,
	};

	await krita.editView({
		foregroundColor: color,
		backgroundColor: bColor,
		currentBrushPreset: name,
		brushSize: size,
	});

}

function getColor(options: any, Color: Color, layerName: string, type: 'color' | 'backgroundColor' = 'color'): Color {

	// Color
	let r = 0, g = 0, b = 0, a = 255;

	if(Color)
	{
		const rgb = options.base.background;
		const gray = options.base.background.gray;

		const color = ((rgb.r ?? gray) + (rgb.g ?? gray) + (rgb.b ?? gray)) / 3;
		const invert = options.base?.[layerName]?.invertBackground && (color < 128);

		const rgbBrush = Color;
		const grayBrush = Color.gray ?? 0

		r = rgbBrush.r ?? grayBrush;
		g = rgbBrush.g ?? grayBrush;
		b = rgbBrush.b ?? grayBrush;
		a = rgbBrush.a ?? 255;

		if(invert)
		{
			r = 255 - r;
			g = 255 - g;
			b = 255 - b;
		}
	}
	else if(prev[type])
	{
		r = prev[type].r;
		g = prev[type].g;
		b = prev[type].b;
		a = prev[type].a ?? 255;
	}
	else
	{
		if(type === 'color')
		{
			r = 0;
			g = 0;
			b = 0;
			a = 255;
		}
		else
		{
			r = 255;
			g = 255;
			b = 255;
			a = 255;
		}
	}

	return {r, g, b, a};

}

async function set(options: any, brush: BrushOptions) {

	const layerName = brush.layerName ?? 'lineart';

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;

	let brushSize;

	// Brush size
	if(brush.size)
	{
		brushSize = brush.size;

		if(typeof brushSize === 'object')
			brushSize = rand.generate([brushSize.min, brushSize.max], randGenerator) as number;

		brushSize = brushSize * scale;
	}
	else
	{
		brushSize = prev.size ?? (2 * scale);
	}

	// Color
	const fColor = getColor(options, brush.color!, layerName, 'color');

	// Background color
	const bColor = getColor(options, brush.backgroundColor!, layerName, 'backgroundColor');

	// Brush preset
	let brushPreset;

	if(brush.name)
	{
		brushPreset = (Array.isArray(brush.name) ? rand.generate(brush.name, randGenerator) : brush.name) as string;
	}
	else
	{
		brushPreset = prev.name ?? 'b) Basic-1';
	}

	await setBrushSize(brushSize, brushPreset, fColor, bColor);

}

function reset() {
	prev = {
		size: undefined,
		name: undefined,
		color: undefined,
		_color: undefined,
		backgroundColor: undefined,
		_backgroundColor: undefined,
	};
}

export default {
	set,
	reset,
}