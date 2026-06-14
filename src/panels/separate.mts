import {Point, Polygon, Polygons} from 'types.mjs';

function polygonCentroid(polygon: Polygon): Point {

	let x = 0;
	let y = 0;

	for(const point of polygon)
	{
		x += point.x;
		y += point.y;
	}

	const count = Math.max(1, polygon.length);

	return {
		x: x / count,
		y: y / count,
	};

}

function separatePolygon(polygon: Polygon, separation: number): Polygon {

	if(polygon.length < 3 || separation <= 0)
		return polygon;

	const center = polygonCentroid(polygon);

	return polygon.map(function(point) {

		const dx = center.x - point.x;
		const dy = center.y - point.y;
		const length = Math.sqrt(dx * dx + dy * dy);

		if(length < 1e-6)
			return point;

		const move = Math.min(separation, length);

		return {
			x: point.x + (dx / length) * move,
			y: point.y + (dy / length) * move,
		};

	});

}

export default function separate(randGenerator: any, polygons: Polygons, separation: any): Polygons {

	return polygons.map(function(polygon) {

		const _separation: number = typeof separation === 'number' ? separation : randGenerator.range(separation.min, separation.max);
		return separatePolygon(polygon, _separation);

	});

}
