import rand from '../rand.mjs';

import {Polygons} from 'types.mjs';

export default function ignore(randGenerator: any, polygons: Polygons, ignorePanels: any, panels: any): Polygons {

	const max = ignorePanels.max;
	const prob = ignorePanels._prob;

	const ignored: Polygons = [];
	let count = 0;

	for(const polygon of polygons)
	{
		if(!rand.prob(prob, randGenerator) || count >= max)
		{
			ignored.push(polygon);
			count++;
		}
	}

	if(ignored.length === 0 && polygons.length > 0)
		ignored.push(polygons[0]);

	return ignored;

}
