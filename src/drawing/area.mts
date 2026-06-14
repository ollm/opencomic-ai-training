import panels from '../panels.mjs';

import {Area} from '../types.mjs';

interface AreaSize {
	width: number;
	height: number;
	x: number;
	y: number;
}

export default function calcArea(area: Area, height: number, width: number, areaSize?: AreaSize) {

	const drawHeight = (area === 'all') ? height : height / 3;
	let pointOffset = (area === 'all') ? drawHeight / 3 : drawHeight / 2;
	let offsetArea = (area === 'all') ? 0 : drawHeight / 2;

	let drawY = area === 'up' || area === 'all' ? 0 : area === 'middle' ? drawHeight : drawHeight * 2;
	let drawYEnd = drawY + drawHeight;

	let drawX = 0;
	let drawXEnd = width;

	if(area.startsWith('panel-'))
	{
		const p = parseInt(area.split('-')[1]);	
		const polygons = panels.current;
		const polygon = polygons?.[p];

		if(polygon)
		{
			const ys = polygon.map(point => point.y);
			const xs = polygon.map(point => point.x);

			drawY = Math.min(...ys);
			drawYEnd = Math.max(...ys);
			drawX = Math.min(...xs);
			drawXEnd = Math.max(...xs);

			pointOffset = Math.min(drawHeight, drawXEnd - drawX) / 2;
			offsetArea = Math.min(drawHeight, drawXEnd - drawX) / 2;
		}
	}

	if(areaSize)
	{
		const areaHeight = areaSize.height;
		const areaWidth = areaSize.width;
		const areaX = Math.floor(areaSize.x * (width - areaWidth)) + drawX;
		const areaY = Math.floor(areaSize.y * (drawHeight - areaHeight)) + drawY;

		drawY = areaY;
		drawYEnd = areaY + areaHeight;
		drawX = areaX;
		drawXEnd = areaX + areaWidth;

		pointOffset = Math.min(areaHeight, areaWidth) / 2;
		offsetArea = Math.min(areaHeight, areaWidth) / 2;
	}

	const middleWidth = Math.floor(width / 2);

	return {
		drawHeight,
		offsetArea,
		pointOffset,
		drawY,
		drawYEnd,
		drawX,
		drawXEnd,
		middleWidth,
	};

}