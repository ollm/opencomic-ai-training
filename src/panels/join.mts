import rand from '../rand.mjs';

function pointsEqual(a: any, b: any, epsilon: number = 1e-6): boolean {

	return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;

}

function edgeLength(a: any, b: any): number {

	const dx = b.x - a.x;
	const dy = b.y - a.y;

	return Math.sqrt(dx * dx + dy * dy);

}

function normalizePolygon(polygon: any[]): any[] {

	if(polygon.length <= 1)
		return polygon;

	const first = polygon[0];
	const last = polygon[polygon.length - 1];

	if(pointsEqual(first, last))
		return polygon.slice(0, -1);

	return polygon;

}

function polygonPath(points: any[], startIndex: number, endIndex: number): any[] {

	const result = [];
	let index = startIndex;

	while(true)
	{
		result.push(points[index]);

		if(index === endIndex)
			break;

		index = (index + 1) % points.length;
	}

	return result;

}

function mergePolygonsByEdge(polyA: any[], polyB: any[], edgeA: number, edgeB: number): any[] {

	const a = normalizePolygon(polyA);
	const b = normalizePolygon(polyB);

	if(a.length < 3 || b.length < 3)
		return polyA;

	const pathA = polygonPath(a, (edgeA + 1) % a.length, edgeA);
	const pathB = polygonPath(b, (edgeB + 1) % b.length, edgeB);

	// Skip both path endpoints to avoid duplicating shared-edge vertices.
	const merged = [
		...pathA,
		...pathB.slice(1, -1),
	];

	return merged.length >= 3 ? merged : polyA;

}

// Join polygons with the long shared edge
export default function joinPolygons(randGenerator: any, polygons: any, panels: any) {

	const newPolygons = [];
	const used = new Set<number>();
	const max = Math.max(0, Math.floor(panels.joinPanels?.max ?? 0));
	let joinedCount = 0;

	for(let i = 0; i < polygons.length; i++)
	{
		if(used.has(i))
			continue;

		const join = rand.prob(panels.joinPanels._prob, randGenerator);
		let merged = false;

		if(join && joinedCount < max)
		{
			let bestIndex = -1;
			let bestEdgeA = -1;
			let bestEdgeB = -1;
			let bestLength = 0;

			const polyA = normalizePolygon(polygons[i]);

			for(let j = i + 1; j < polygons.length; j++)
			{
				if(used.has(j))
					continue;

				const polyB = normalizePolygon(polygons[j]);

				for(let a = 0; a < polyA.length; a++)
				{
					const a1 = polyA[a];
					const a2 = polyA[(a + 1) % polyA.length];

					for(let b = 0; b < polyB.length; b++)
					{
						const b1 = polyB[b];
						const b2 = polyB[(b + 1) % polyB.length];

						if(pointsEqual(a1, b2) && pointsEqual(a2, b1))
						{
							const length = edgeLength(a1, a2);

							if(length > bestLength)
							{
								bestLength = length;
								bestIndex = j;
								bestEdgeA = a;
								bestEdgeB = b;
							}
						}
					}
				}
			}

			if(bestIndex !== -1)
			{
				newPolygons.push(mergePolygonsByEdge(polygons[i], polygons[bestIndex], bestEdgeA, bestEdgeB));
				used.add(bestIndex);
				joinedCount++;
				merged = true;
			}
		}

		if(!merged)
		{
			newPolygons.push(polygons[i]);
		}
	}

	return newPolygons;

}
