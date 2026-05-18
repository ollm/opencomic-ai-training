import paper from 'paper';

paper.setup(new paper.Size(1000, 1000));

export interface CubicBezierOptions {
	points: number[],
	smooth?: object,
	closed?: boolean,
}

export function cubicBezier({points, smooth, closed}: CubicBezierOptions): number[] {

	const _points: paper.Point[] = [];

	for(let i = 0, len = (points.length / 2); i < len; i++)
	{
		const _i = i * 2;
		_points.push(new paper.Point(points[_i], points[_i + 1]));
	}

	const path = new paper.Path();
	path.add(..._points);

	if(smooth)
		path.smooth(smooth);

	if(closed)
		path.closed = true;

	const beziers: number[] = [];

	for (let i = 0; i < path.segments.length - 1; i++)
	{
		const s0 = path.segments[i];
		const s1 = path.segments[i + 1];

		const c1 = {
			x: s0.point.x + s0.handleOut.x,
			y: s0.point.y + s0.handleOut.y
		};

		const c2 = {
			x: s1.point.x + s1.handleIn.x,
			y: s1.point.y + s1.handleIn.y
		};

		const end = {
			x: s1.point.x,
			y: s1.point.y
		};

		beziers.push(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
	}

	return beziers;
}

type PathType = 'cubic' | 'linear';

export function toString(type: PathType, points: number[]): string {

	const _points = [
		...(type === 'cubic' ? [`${points[0]},${points[1]}`] : []),
	];

	for(let i = 0, len = (points.length / 2); i < len; i++)
	{
		const _i = i * 2;
		_points.push(`${points[_i]},${points[_i + 1]}`);
	}

	return _points.join(';');
}

export function toKrita(type: PathType, points: number[]): number[][] {

	const _points = [
		...(type === 'cubic' ? [[points[0], points[1]]] : []),
	];

	for(let i = 0, len = (points.length / 2); i < len; i++)
	{
		const _i = i * 2;
		_points.push([points[_i], points[_i + 1]]);
	}

	return _points;
}

export default {
	cubicBezier,
	toString,
	toKrita,
}