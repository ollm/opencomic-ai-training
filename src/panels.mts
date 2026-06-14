import rand from './rand.mjs';
import _options from './options.mjs';
import cloneDeep from 'lodash.clonedeep';

import join from './panels/join.mjs';
import separate from './panels/separate.mjs';
import ignore from './panels/ignore.mjs';
import bsp from './panels/bsp.mjs';
import voronoi from './panels/voronoi.mjs';
import lineart from './panels/lineart.mjs';

import {Polygons} from './types.mjs';

let currentPolygons: Polygons | null = null;

function generate(options: any, panels: any): Polygons {

	const randGenerator = options.currentImageRand!;
	panels = _options.randomize(cloneDeep(panels));

	const {width, height} = options.base.size;

	let polygons: Polygons = [];

	switch(panels.generator)
	{
		case 'bsp':

			polygons = bsp({
				randGenerator,
				width,
				height,
				panelCount: panels.amount,
				bsp: panels.bsp,
			});

			break;

		case 'voronoi':

			polygons = voronoi({
				randGenerator,
				width,
				height,
				panelCount: panels.amount,
				lloydIterations: Math.floor(randGenerator.range(panels.voronoi.lloydIterations.min, panels.voronoi.lloydIterations.max)),
			});

			break;
	}

	const joined = join(randGenerator, polygons, panels);
	const separated = separate(randGenerator, joined, panels.separation);
	const ignored = ignore(randGenerator, separated, panels.ignorePanels, panels);

	currentPolygons = ignored;
	return ignored;

}

export default {
	generate,
	lineart,
	get current() {return currentPolygons},
}