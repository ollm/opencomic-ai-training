import fs from 'fs';
import p from 'path';

import krita from '../krita.mjs'
import panels from '../panels.mjs';
import _sharp from './sharp.mjs';
import potrace from '../potrace.mjs';
import sharp from 'sharp';
import {flattenSVG} from 'flatten-svg';
import {createSVGWindow} from 'svgdom';
import fillHoles from './fill-holes.mjs';
import keepOnlyLargestIsland from './keep-only-largest-island.mjs';
import connectIslandsToLargest from './connect-islands-to-largest.mjs';

import {Area, Layers} from '../types.mjs'

interface AreaMask {
	area: Area;
	mask: Uint8Array;
}

function areaSortKey(area: Area): number {

	if(area === 'up')
		return 0;

	if(area === 'middle')
		return 1;

	if(area === 'down')
		return 2;

	if(area === 'all')
		return 3;

	if(area.startsWith('panel-'))
		return 4;

	return 5;

}

function sortAreasByPriority(areas: Area[], polygons: any): Area[] {

	return areas.slice().sort((a, b) => {

		const keyA = areaSortKey(a);
		const keyB = areaSortKey(b);

		if(keyA !== keyB)
			return keyA - keyB;

		if(keyA === 4)
		{
			const panelA = parseInt(a.split('-')[1]);
			const panelB = parseInt(b.split('-')[1]);

			if(panelA !== panelB)
				return panelB - panelA;
		}

		return a.localeCompare(b);

	});

}

async function clean(layers: Layers) {

	const image = await krita.canvas();
	return image;

}

async function degraded(layers: Layers) {

	const image = await krita.canvas();
	return image;

}

function pad(number: number, len: number) {

	return number.toString().padStart(len, '0');	

}

async function imageFormat(image: string | Buffer, options: any) {

	const format = options.format || 'jpg';

	if(format === 'jpg')
		image = await _sharp.jpegBuffer(image);

	return {
		format: format,
		data: image,
	};

}

async function saveClean(options: any, image: string | Buffer, degradation: any, imageDegradation: number) {

	const {format, data} = await imageFormat(image, options);

	const imageNumber = options.currentImage!;
	fs.writeFileSync(p.join(degradation.output.clean, `${pad(imageNumber, 10)}-${pad(imageDegradation, 4)}.${format}`), data);

}


async function saveDegraded(options: any, image: string | Buffer, degradation: any, imageDegradation: number) {

	const {format, data} = await imageFormat(image, options);

	const imageNumber = options.currentImage!;
	fs.writeFileSync(p.join(degradation.output.degraded, `${pad(imageNumber, 10)}-${pad(imageDegradation, 4)}.${format}`), data);

}

async function saveOptions(options: any, string: string, degradation: any, imageDegradation: number) {

	if(!degradation.output.options)
		return;

	const imageNumber = options.currentImage!;
	fs.writeFileSync(p.join(degradation.output.options, `${pad(imageNumber, 10)}-${pad(imageDegradation, 4)}.json`), string);

}

async function savePanels(options: any, image: string | Buffer, degradation: any, imageDegradation: number, areas: Area[]) {

	const output = degradation.output;

	if(output.mask || output.labels || output.preview)
	{
		const labels: number[][] = [];
		const {width, height} = options.base.size;
		const pixels = width * height;
		const polygons = panels.current;
		const areaMasks: AreaMask[] = [];

		for(let area of areas)
		{
			const layers = [
				`opencomic:lineart:${area}`,
				`opencomic:lineart-2:${area}`,
				`opencomic:lineart-texture:${area}`,
				`opencomic:lineart-random:${area}`,
				`opencomic:draw:${area}`,
			];

			const mask = new Uint8Array(pixels).fill(0);

			for(let name of layers)
			{
				const layer = await krita.layer({
					name,
				});

				const {data} = await sharp(Buffer.from(layer.image, 'base64')).raw().toBuffer({resolveWithObject: true});
				// await sharp(Buffer.from(layer.image, 'base64')).toFile(p.join(output.mask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-${name}.png`));

				for(let i = 0; i < data.length; i += 4)
				{
					const a = data[i + 3];
					const pi = Math.floor(i / 4);

					if(a > 0)
					{
						mask[pi] = 255;
					}
				}
			}

			if(area.startsWith('panel-'))
			{
				const panelIndex = parseInt(area.split('-')[1]);
				const polygon = polygons?.[panelIndex];

				if(polygon)
				{
					const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><polygon fill="white" points="${polygon.map(point => `${point.x},${point.y}`).join(' ')}"/></svg>`;
					const {data} = await sharp(Buffer.from(svg)).resize(width, height).raw().toBuffer({resolveWithObject: true});

					for(let i = 0; i < data.length; i += 4)
					{
						const a = data[i + 3];
						const pi = Math.floor(i / 4);

						if(a > 0)
						{
							mask[pi] = 255;
						}
					}
				}
			}

			fillHoles(mask, width, height);
			areaMasks.push({area, mask});
		}

		const sortedAreas = sortAreasByPriority(areas, polygons);
		const sortedAreaMasks = sortedAreas.map(area => areaMasks.find(areaMask => areaMask.area === area)!).filter(Boolean);
		const occupied = new Uint8Array(pixels);

		for(const areaMask of sortedAreaMasks)
		{
			const mask = areaMask.mask;

			if(degradation.avoidOverlap)
			{
				for(let i = 0; i < pixels; i++)
				{
					if(mask[i] !== 255)
						continue;

					if(occupied[i] === 255)
					{
						mask[i] = 0;
						continue;
					}

					occupied[i] = 255;
				}
			}

			keepOnlyLargestIsland(mask, width, height);
		}

		for(const areaMask of sortedAreaMasks)
		{
			const area = areaMask.area;
			const mask = areaMask.mask;
			// connectIslandsToLargest(mask, width, height);
			// fillHoles(mask, width, height);

			if(output.mask)
			{
				await sharp(Buffer.from(mask), {
					raw: {
						width,
						height,
						channels: 1,
					},
				}).toFile(p.join(output.mask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-fill.png`));
			}

			const path = await potrace(mask, width, height);
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="black" d="${path}"/></svg>`;

			if(output.preview)
			{
				fs.writeFileSync(p.join(output.preview, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}.svg`), svg);
			}

			if(output.labels)
			{
				const thisLabels: number[] = [];

				const window = createSVGWindow();
				window.document.documentElement.innerHTML = svg;
				const paths = flattenSVG(window.document.documentElement, {maxError: degradation.maxError ?? 1});

				for(const line of paths)
				{
					for(const point of line.points)
					{
						const x = point[0] / width;
						const y = point[1] / height;

						if(Number.isFinite(x) && Number.isFinite(y))
							thisLabels.push(x, y);
					}
				}

				labels.push(thisLabels);

				if(output.preview)
				{
					const circles: string[] = [];

					for(let i = 0; i < thisLabels.length - 1; i += 2)
					{
						const x = thisLabels[i] * width;
						const y = thisLabels[i + 1] * height;
						circles.push(`<circle cx="${x}" cy="${y}" r="2"/>`);
					}

					const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
						<path fill="black" d="${path}"/>
						<g fill="red">
							${circles.join('')}
						</g>
					</svg>`;

					fs.writeFileSync(p.join(output.preview, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-labels.svg`), svg);
				}
			}
		}

		if(output.labels)
		{
			const yoloClassId = 0;
			const lines = labels.filter(label => label.length >= 6 && label.length % 2 === 0).map(label => `${yoloClassId} ${label.join(' ')}`);

			fs.writeFileSync(p.join(output.labels, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}.txt`), lines.join('\n'));
		}
	}
}

export default {
	clean,
	degraded,
	saveClean,
	saveDegraded,
	saveOptions,
	savePanels,
}