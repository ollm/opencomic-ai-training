import krita from '../krita.mjs';
import rand from '../rand.mjs';

import {Color} from '../types.mjs';

let prev = {
	size: 0,
	preset: '',
	color: '',
};

async function setBrushSize(size: number, preset: string = 'b) Basic-1', color: Color = {r: 0, g: 0, b: 0, a: 255}, force: boolean = false) {

	const _color = `${color.r}, ${color.g}, ${color.b}, ${color.a}`;

	if(prev.size === size && prev.preset === preset && prev.color === _color && !force) return;

	prev = {
		size,
		preset,
		color: _color,
	};

	console.log('-----');
	console.log('-----');
	console.log(prev);
	console.log('-----');

	await krita.editView({
		foregroundColor: {r: 0, g: 0, b: 0, a: 255},
		currentBrushPreset: preset,
		brushSize: size,
	});

}

async function set(options: any, brush: any) {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;

	let brushSize = brush.size;

	if(brushSize.min || brushSize.max)
		brushSize = rand.generate([brushSize.min, brushSize.max], randGenerator);

	brushSize = brushSize * scale;

	const rgb = options.base.background;
	const gray = options.base.background.gray;

	const color = ((rgb.r ?? gray) + (rgb.g ?? gray) + (rgb.b ?? gray)) / 3;
	const invert = options.base?.lineart?.invertBackground && (color < 128);

	let brushPreset = brush.name;
	brushPreset = Array.isArray(brushPreset) ? rand.generate(brushPreset, randGenerator) : brushPreset;

	await setBrushSize(brushSize, brushPreset, {
		r: invert ? 255 : 0,
		g: invert ? 255 : 0,
		b: invert ? 255 : 0,
		a: 255,
	});

}

export default {
	set,
}