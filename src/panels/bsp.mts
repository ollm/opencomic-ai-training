import rand from '../rand.mjs';

import {Polygon, Point} from 'types.mjs';

interface GenerateBspPanelsOptions {
	randGenerator: any,
	width: number,
	height: number,
	panelCount: number,
	bsp: any,
}

function getBounds(polygon: Polygon) {

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for(const point of polygon)
	{
		if(point.x < minX) minX = point.x;
		if(point.x > maxX) maxX = point.x;
		if(point.y < minY) minY = point.y;
		if(point.y > maxY) maxY = point.y;
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
		width: maxX - minX,
		height: maxY - minY,
	};

}

function min(polygon: Polygon, key: 'y' | 'x' = 'y')
{
	return polygon.reduce((min: number, point: Point) => Math.min(min, point[key]), Infinity);
}

function max(polygon: Polygon, key: 'y' | 'x' = 'y')
{
	return polygon.reduce((max: number, point: Point) => Math.max(max, point[key]), -Infinity);
}

function calcX(p1: Point, p2: Point, y: number): number
{
	if(p1.y === p2.y)
		return (p1.x + p2.x) / 2;

	const t = (y - p1.y) / (p2.y - p1.y);
	return p1.x + t * (p2.x - p1.x);
}

function calcY(p1: Point, p2: Point, x: number): number
{
	if(p1.x === p2.x)
		return (p1.y + p2.y) / 2;

	const t = (x - p1.x) / (p2.x - p1.x);
	return p1.y + t * (p2.y - p1.y);
}

function split(randGenerator: any, polygon: Polygon, percent: number, diagonal: boolean, diagonalPercent: number): [Polygon, Polygon] | null {

	const bounds = getBounds(polygon);
	const vertical = bounds.height > bounds.width;

	if(vertical) // Split horizontally
	{
		const minY = max([polygon[0], polygon[1]], 'y');
		const maxY = min([polygon[2], polygon[3]], 'y');

		const heightRange = maxY - minY;

		let y = minY + (heightRange * percent);
		const limit = Math.min(Math.abs(minY - y), Math.abs(maxY - y));

		const y1 = y + (diagonal ? limit * diagonalPercent : 0);
		const y2 = y - (diagonal ? limit * diagonalPercent : 0);

		const point1: Point = {
			x: calcX(polygon[0], polygon[3], y1),
			y: y1,
		};

		const point2: Point = {
			x: calcX(polygon[1], polygon[2], y2),
			y: y2,
		};

		const first: Polygon = [
			{x: polygon[0].x, y: polygon[0].y},
			{x: polygon[1].x, y: polygon[1].y},
			{x: point2.x, y: point2.y},
			{x: point1.x, y: point1.y},
		];

		const second: Polygon = [
			{x: point1.x, y: point1.y},
			{x: point2.x, y: point2.y},
			{x: polygon[2].x, y: polygon[2].y},
			{x: polygon[3].x, y: polygon[3].y},
		];

		return [first, second];
	}
	else // Split vertically
	{
		const minX = max([polygon[0], polygon[3]], 'x');
		const maxX = min([polygon[1], polygon[2]], 'x');

		const widthRange = maxX - minX;

		let x = minX + widthRange * percent;
		const limit = Math.min(Math.abs(minX - x), Math.abs(maxX - x));

		const x1 = x + (diagonal ? limit * diagonalPercent : 0);
		const x2 = x - (diagonal ? limit * diagonalPercent : 0);

		const point1: Point = {
			x: x1,
			y: calcY(polygon[0], polygon[1], x1),
		};

		const point2: Point = {
			x: x2,
			y: calcY(polygon[3], polygon[2], x2),
		};

		const first: Polygon = [
			{x: polygon[0].x, y: polygon[0].y},
			{x: point1.x, y: point1.y},
			{x: point2.x, y: point2.y},
			{x: polygon[3].x, y: polygon[3].y},
		];

		const second: Polygon = [
			{x: point1.x, y: point1.y},
			{x: polygon[1].x, y: polygon[1].y},
			{x: polygon[2].x, y: polygon[2].y},
			{x: point2.x, y: point2.y},
		];

		return [first, second];
	}

}

export default function bsp({randGenerator, width, height, panelCount, bsp}: GenerateBspPanelsOptions) {

	const margin = bsp.margin;
	
	const top = margin.top * height;
	const bottom = margin.bottom * height;
	const left = margin.left * width;
	const right = margin.right * width;

	const polygons: Polygon[] = [
		[
			{x: left, y: top},
			{x: width - right, y: top},
			{x: width - right, y: height - bottom},
			{x: left, y: height - bottom},
		]
	];

	for(let i = 1; i < panelCount; i++)
	{
		if(polygons.length === 0)
			break;

		const indexToSplit = randGenerator.range(0, polygons.length - 1);
		const polygon = polygons[indexToSplit];

		const diagonal: boolean = rand.prob(bsp.diagonal._prob, randGenerator);
		const percent = randGenerator.range(bsp.split.min, bsp.split.max);
		const diagonalPercent = randGenerator.range(bsp.diagonal.percent.min, bsp.diagonal.percent.max, true);

		const pieces = split(randGenerator, polygon, percent, diagonal, diagonalPercent);

		if(!pieces)
			continue;

		const [first, second] = pieces;
		polygons.splice(indexToSplit, 1, first, second);
	}

	/*
	console.log(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`);

	for(const polygon of polygons)
	{
		console.log(`<polygon points="${polygon.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="black"/>`);
	}

	console.log(`</svg>`);
	*/

	return polygons;
}
