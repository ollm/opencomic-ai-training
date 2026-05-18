import cloneDeep from 'lodash.clonedeep';

import _options from '../options.mjs';
import krita from '../krita.mjs';
import rand from 'rand.mjs';
// import {PATTERNS, SHAPES, INTERPOLATIONS, property} from '../filter.mjs';

async function add(options: any, drawing: any): Promise<any> {

	const scale = options.base.scale ?? 1;
	const randGenerator = options.currentImageRand!;
	drawing = _options.randomize(cloneDeep(drawing));

	let pattern = drawing.pattern;

	if(pattern === 'all')
		pattern = rand.generate(Object.keys(krita.patterns), randGenerator);

	const properties = {
		pattern,
	};

	const patternSize = rand.generate([drawing.patternSize.min, drawing.patternSize.max], randGenerator) as number * scale;

	await krita.editView({
		patternSize: patternSize,
	});

	await krita.send(`add_layer:${JSON.stringify({
		name: 'opencomic:texture:pattern',
		inside: {
			name: `opencomic:group:${options.groupLayer}`,
		},
		fill: 'pattern',
		properties: properties,
		blendingMode: drawing.blendingMode, // soft_light, gamma_light, hard_light,	https://github.com/KDE/krita/blob/ccbb2fcf3165bdac384a8264a135e030daa120c5/libs/pigment/KoCompositeOpRegistry.h#L98
		opacity: drawing.opacity ?? 255,
	})}`);

	// console.log(krita.patterns);

	return {
		type: 'texure',
	};

}

// gradientmap

export default {
	add,
};
