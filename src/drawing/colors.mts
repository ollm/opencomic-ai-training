import cloneDeep from 'lodash.clonedeep';
import getSimilarColor, {IDefaultColor} from 'get-similar-color';

import rand from '../rand.mjs';
import krita from '../krita.mjs';

import {Color, ColorObject, RandGenerator} from '../types.mjs';

function fixValue(value: number): number {

	return Math.min(255, Math.max(0, Math.round(value)));

}

function similarFromPalette(target: ColorObject, palette: ColorObject[], ignore: Set<number>): ColorObject {

	const paletteFiltered = palette.filter(function(color) {

		if(ignore.has(color.index))
			return false;

		return true;

	});

	const colorArray: IDefaultColor[] = paletteFiltered.map(function(color, index) {

		return {
			name: String(index),
			rgb: color.color,
		}

	});

	const findColor = (getSimilarColor?.default ?? getSimilarColor)({
		targetColor: target.color,
		colorArray: colorArray,
		similarityThreshold: 0,
	});

	return findColor ? paletteFiltered[+findColor.name] : palette[0];

}

function randFromPalette(randGenerator: RandGenerator, palette: ColorObject[], ignore?: Set<number>): ColorObject {

	const paletteFiltered = palette.filter(function(color) {

		if(ignore && ignore.has(color.index))
			return false;

		return true;

	});

	const index = randGenerator.range(0, paletteFiltered.length - 1);

	return paletteFiltered[index] ?? palette[0];

}

function generateRandPalette(options: any): ColorObject[] {

	const randGenerator = options.currentImageRand!;
	const num = options.base.colors.colored.paletteColors * 3;

	const palette: ColorObject[] = [];

	for(let i = 0; i < num; i++)
	{
		const color = {
			r: randGenerator.range(0, 255),
			g: randGenerator.range(0, 255),
			b: randGenerator.range(0, 255),
		};

		palette.push({
			index: i,
			name: 'color-'+i,
			color,
		});
	}

	options.currentImagePalette = palette;
	return palette;

}

function generatePalette(options: any): ColorObject[] {

	const randGenerator = options.currentImageRand!;

	const colors = options.base.colors;
	const colored = colors.colored.active ? colors.colored : false;

	const palette = cloneDeep(krita.palettes[colored.palette.name] as ColorObject[]);
	const num = colored.paletteColors;

	const similarColors = colored.similarColors;

	const firstColor = randFromPalette(randGenerator, palette);

	const ignore = new Set<number>([firstColor.index]);
	const newPalette: ColorObject[] = [
		firstColor,
	];

	let currentGroup = [firstColor];
	let currentGroupNum = 1;

	for(let i = 0; i < num - 1; i++)
	{
		if(currentGroupNum > similarColors)
		{
			currentGroup = [];
			currentGroupNum = 0;
		}

		if(currentGroupNum === 0)
		{
			const color = randFromPalette(randGenerator, palette, ignore);
			newPalette.push(color);
			currentGroup.push(color);
			ignore.add(color.index);
		}
		else
		{
			const baseColor = currentGroup[0];
			const color = similarFromPalette(baseColor, palette, ignore);
			newPalette.push(color);
			currentGroup.push(color);
			ignore.add(color.index);
		}

		currentGroupNum++;
	}

	options.currentImagePalette = newPalette;
	return newPalette;

}

let first = true;

function group(options: any, drawing?: any): {color: () => void} {

	const randGenerator = options.currentImageRand!;
	const colors = options.base.colors ?? {gray: {min: 0, max: 0}};

	const grayed = colors.gray;
	const colored = colors.colored.active ? colors.colored : false;
	const colorTone = colors.colorTone.active ? colors.colorTone : false;

	const _alpha = colors.alpha ? [colors.alpha.min, colors.alpha.max] : [255, 255];

	if(colored && !options.currentImagePalette)
	{
		if(colored.palette.name === 'rand')
			generateRandPalette(options);
		else
			generatePalette(options);
	}

	// Used colors
	const ingore = new Set<number>();
	let baseColor: ColorObject | null = null;

	return {
		color: function(): Color {

			let r, g, b, a;

			a = rand.generate(_alpha, randGenerator) as number;

			if(colored)
			{
				let color: ColorObject | null = null;

				if(!baseColor)
				{
					color = baseColor = randFromPalette(randGenerator, options.currentImagePalette!, ingore);
				}
				else
				{
					if(colors.differentColors)
						color = randFromPalette(randGenerator, options.currentImagePalette!, ingore);
					else
						color = similarFromPalette(baseColor, options.currentImagePalette!, ingore);
				}

				ingore.add(baseColor.index);

				r = color.color.r;
				g = color.color.g;
				b = color.color.b;
			}
			else
			{
				const gray = randGenerator.range(grayed.min, grayed.max);

				r = gray;
				g = gray;
				b = gray;

				if(colorTone)
				{
					r = fixValue(r + colorTone.offset.r);
					g = fixValue(r + colorTone.offset.g);
					b = fixValue(r + colorTone.offset.b);
				}
			}

			return {r, g, b, a};

		}
	}
}

export default {
	group,
}