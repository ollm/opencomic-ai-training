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