export const PATTERNS: Record<string, number> = {
	dots: 0,
	lines: 1,
};

export const SHAPES: Record<string, number> = {
	dot: 0,
	elipse: 1,
	elipse_herdated: 2,
	diamond: 3,
	square: 4,
};

export const INTERPOLATIONS: Record<string, number> = {
	lineal: 0,
	sinusoidal: 1,
};

export function property(name: string, value: any, base: string = 'generator_screentone_') {

	if(base && !base.endsWith('_'))
		base += '_';

	let value_0 = value;
	let value_1 = value;
	let value_2 = value;

	switch(name)
	{
		case 'rotation':

			value_0 = value - 30;
			value_1 = value;
			value_2 = value + 30;

			break;
	}

	return {
		[`intensity_${base}${name}`]: value,
		[`alpha_${base}${name}`]: value,
		[`RGBA_channel0_${base}${name}`]: value_0,
		[`RGBA_channel1_${base}${name}`]: value_1,
		[`RGBA_channel2_${base}${name}`]: value_2,
	};

}

export default {
	PATTERNS,
	SHAPES,
	INTERPOLATIONS,
	property,
};