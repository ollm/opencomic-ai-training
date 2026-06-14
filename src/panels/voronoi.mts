import {Delaunay} from 'd3-delaunay';

type Point = [number, number];

interface GenerateVoronoiPanelsOptions {
	randGenerator: any,
	width: number,
	height: number,
	panelCount: number,
	lloydIterations?: number
}

function polygonCentroid(points: Point[]): Point {

	let x = 0;
	let y = 0;

	for(const [px, py] of points)
	{
		x += px;
		y += py;
	}

	return [x / points.length, y / points.length];
}

function lloydRelaxation(points: Point[], width: number, height: number, iterations: number = 2): Point[] {

	let current = points;

	for(let iter = 0; iter < iterations; iter++)
	{
		const delaunay = Delaunay.from(current);
		const voronoi = delaunay.voronoi([0, 0, width, height]);

		current = current.map((_: Point, i: number) => {
			const poly = [...voronoi.cellPolygon(i)];

			if(poly.length < 3)
				return current[i];

			return polygonCentroid(poly as Point[]);
		});
	}

	return current;
}

export default function voronoi({randGenerator, width, height, panelCount, lloydIterations = 2}: GenerateVoronoiPanelsOptions) {

	let points: Point[] = Array.from({length: panelCount}, function() {
		return [
			randGenerator.range(0, width),
			randGenerator.range(0, height)
		]
	});

	points = lloydRelaxation(
		points,
		width,
		height,
		lloydIterations
	);

	const delaunay = Delaunay.from(points);
	const voronoi = delaunay.voronoi([0, 0, width, height]);

	const polygons = [];

	for(let i = 0; i < points.length; i++)
	{
		const poly = [...voronoi.cellPolygon(i)];

		if(poly.length < 3)
			continue;

		polygons.push(
			poly.map(([x, y]) => ({
				x,
				y
			}))
		);
	}

	return polygons;
}
