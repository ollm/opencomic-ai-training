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

import {sleep} from '../tools.mjs'

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

function flatLayers(layers: any): any[] {

	const flat: any[] = [];

	for(const name in layers)
	{
		const layer = layers[name];
		flat.push(layer);

		if(layer.children)
		{
			const children = flatLayers(layer.children);
			flat.push(...children);
		}
	}

	return flat;
}

async function generateHalftoneSizeMask(options: any, image: string | Buffer, degradation: any, imageDegradation: number, areas: Area[], configs: Record<string, any>): Promise<Buffer | null> {

	const output = degradation.output;

	// console.log('-----');

	// console.log(configs.halftone.halftone);

	if(output.halftoneSizeMask)
	{
		const {width, height} = options.base.size;
		const pixels = width * height;
		const polygons = panels.current;
		const areaMasks: AreaMask[] = [];

		const scale = configs.resize ? configs.resize.reduce((acc: number, curr: any) => acc * curr.scale, 1) : 1;
		const halftoneMaxSize = output.halftoneMaxSize;

		const _width = Math.round(width * scale);
		const _height = Math.round(height * scale);

		const composite = new Uint8Array(pixels).fill(0);

		const layers = await krita.layers();
		const flatLayersList = flatLayers(layers);

		const useLayers: {layers: string[], difference: string[]} = {
			layers: [],
			difference: [],
		};

		for(let area of areas)
		{
			const layers = [
				`opencomic:draw:${area}`,
				`opencomic:gradient`,
			];

			const differenceLayers = [
				`opencomic:lineart:${area}`,
				`opencomic:lineart-2:${area}`,
				`opencomic:lineart-texture:${area}`,
				`opencomic:lineart-random:${area}`,
			];

			useLayers.layers.push(...layers);
			useLayers.difference.push(...differenceLayers);
		}

		const mask = new Uint8Array(pixels).fill(0);
		let hasGradientLayer = false;

		for(const _layer of flatLayersList)
		{
			const name = _layer.name;
			const gradientLayer = name === 'opencomic:gradient';
			if(gradientLayer) hasGradientLayer = true;
		}

		for(const _layer of flatLayersList)
		{
			const name = _layer.name;

			if(!useLayers.layers.includes(name) && !useLayers.difference.includes(name))
				continue;

			let area = name.split(':').pop() as Area;

			if(area as string === 'gradient')
				area = 'all';

			const halftone = configs.halftone?.halftone?.[area];

			const halftoneSize = (halftone?.config?.size && halftone?.applyIn !== 'without') ? halftone.config.size : 0;	
			const layerColor = Math.round((halftoneSize * scale) / halftoneMaxSize * 255);

			const gradientLayer = name === 'opencomic:gradient';

			if(gradientLayer)
				hasGradientLayer = true;

			// const layerImage = !gradientLayer ? (await krita.layer({name})).image : await sharp({create: {width, height, channels: 4, background: {r: 0, g: 0, b: 0, alpha: 255}}}).png().toBuffer();
			const layerImage = (await krita.layer({name, includeMask: gradientLayer})).image;

			const {data} = await sharp(Buffer.from(layerImage, 'base64')).raw().toBuffer({resolveWithObject: true});

			// await sharp(Buffer.from(layerImage, 'base64')).toFile(p.join(output.halftoneSizeMask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-${name}.png`));

			const isDifferenceLayer = useLayers.difference.includes(name);

			for(let i = 0; i < data.length; i += 4)
			{
				const a = gradientLayer ? (255 - data[i + 2]) : data[i + 3];
				// const a = data[i + 3];
				const pi = Math.floor(i / 4);

				const min = gradientLayer ? 0 : 20;

				if(a > min && (!hasGradientLayer || !isDifferenceLayer)) // if(a > 0)
				{
					if(isDifferenceLayer)
						mask[pi] = 0;
					else
						mask[pi] = layerColor;
				}
			}

		}

		return await sharp(mask, {
			raw: {
				width,
				height,
				channels: 1,
			},
		}).negate().png().toBuffer();

		/*
		for(let area of areas)
		{
			const halftone = configs.halftone?.halftone?.[area];

			const halftoneSize = (halftone?.config?.size && halftone?.applyIn !== 'without') ? halftone.config.size : 0;	
			const layerColor = Math.round((halftoneSize * scale) / halftoneMaxSize * 255);

			const layers = [
				`opencomic:draw:${area}`,
				`opencomic:gradient`,
			];

			const differenceLayers = [
				`opencomic:lineart:${area}`,
				`opencomic:lineart-2:${area}`,
				`opencomic:lineart-texture:${area}`,
				`opencomic:lineart-random:${area}`,
			];

			// console.log([...layers, ...differenceLayers]);

			const mask = new Uint8Array(pixels).fill(0);

			let hasGradientLayer = false;

			for(let name of [...layers, ...differenceLayers])
			{
				if(!await krita.getLayer({name}))
					continue;

				const gradientLayer = name === 'opencomic:gradient';

				if(gradientLayer)
					hasGradientLayer = true;

				const layer = await krita.layer({
					name,
				});

				const {data} = await sharp(Buffer.from(layer.image, 'base64')).raw().toBuffer({resolveWithObject: true});
				// await sharp(Buffer.from(layer.image, 'base64')).toFile(p.join(output.mask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-${name}.png`));

				const isDifferenceLayer = differenceLayers.includes(name);

				for(let i = 0; i < data.length; i += 4)
				{
					const a = gradientLayer ? (255 - data[i + 2]) : data[i + 3];
					const pi = Math.floor(i / 4);

					if(a > 20 && (!hasGradientLayer || !isDifferenceLayer)) // if(a > 0)
					{
						if(isDifferenceLayer)
							mask[pi] = 0;
						else
							mask[pi] = layerColor;
					}
				}
			}

			areaMasks.push({area, mask});
		}

		const sortedAreas = sortAreasByPriority(areas, polygons);
		const sortedAreaMasks = sortedAreas.map(area => areaMasks.find(areaMask => areaMask.area === area)!).filter(Boolean);

		for(const areaMask of sortedAreaMasks)
		{
			for(let i = 0; i < pixels; i++)
			{
				if(areaMask.mask[i] !== 0 && composite[i] === 0)
					composite[i] = areaMask.mask[i];
			}

			const area = areaMask.area;
			const mask = areaMask.mask;

			/*
			await sharp(Buffer.from(mask), {
				raw: {
					width,
					height,
					channels: 1,
				},
			}).toFile(p.join(output.halftoneSizeMask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-fill.png`));
			* /
		}
		*/

		/*
		await sharp(Buffer.from(composite), {
			raw: {
				width,
				height,
				channels: 1,
			},
		}).negate().resize(_width, _height).toFile(p.join(output.halftoneSizeMask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}.png`));
		*/

		/*
		return await sharp(Buffer.from(composite), {
			raw: {
				width,
				height,
				channels: 1,
			},
		}).negate().png().toBuffer();
		*/
	}

	return null;
}

async function saveHalftoneSizeMask(options: any, image: string | Buffer, degradation: any, imageDegradation: number) {

	const imageNumber = options.currentImage!;
	fs.writeFileSync(p.join(degradation.output.halftoneSizeMask, `${pad(imageNumber, 10)}-${pad(imageDegradation, 4)}.png`), image);

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

		const layers = await krita.layers();
		const flatLayersList = flatLayers(layers);

		const useLayers: string[] = [];

		const invalidateOtherAreasAtPixel = function(i: number, notArea: Area) {

			for(const areaMask of areaMasks)
			{
				const area = areaMask.area;

				if(area === notArea)
					continue;

				areaMask.mask[i] = 0;
			}

			return false;

		}

		for(let area of areas)
		{
			useLayers.push(...[
				`opencomic:lineart:${area}`,
				`opencomic:lineart-2:${area}`,
				`opencomic:lineart-texture:${area}`,
				`opencomic:lineart-random:${area}`,
				`opencomic:draw:${area}`,
			]);

			const mask = new Uint8Array(pixels).fill(0);

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

						if(a > 127) // if(a > 0)
						{
							mask[pi] = 255;
							// invalidateOtherAreasAtPixel(pi, area);
						}
					}
				}
			}

			areaMasks.push({area, mask})
		}

		for(const _layer of flatLayersList)
		{
			const name = _layer.name;

			if(!useLayers.includes(name))
				continue;

			const area = name.split(':').pop() as Area;
			const areaMask = areaMasks.find(areaMask => areaMask.area === area);

			if(!areaMask)
				continue;

			const layer = await krita.layer({
				name,
			});

			const {data} = await sharp(Buffer.from(layer.image, 'base64')).raw().toBuffer({resolveWithObject: true});
			// await sharp(Buffer.from(layer.image, 'base64')).toFile(p.join(output.mask, `${pad(options.currentImage!, 10)}-${pad(imageDegradation, 4)}-${area}-${name}.png`));

			for(let i = 0, len = data.length; i < len; i += 4)
			{
				const a = data[i + 3];
				const pi = Math.floor(i / 4);

				if(a > 48) // if(a > 127) // if(a > 0)
				{
					areaMask.mask[pi] = 255;
					invalidateOtherAreasAtPixel(pi, area);
				}
			}
		}

		for(const areaMask of areaMasks)
		{
			const {mask} = areaMask;
			fillHoles(mask, width, height);
		}

		const areaMasksCopy = areaMasks.map(areaMask => ({area: areaMask.area, mask: new Uint8Array(areaMask.mask)}));

		for(const areaMask of areaMasksCopy)
		{
			const {area, mask} = areaMask;

			for(let i = 0, len = mask.length; i < len; i++)
			{
				const c = mask[i];

				if(c > 0)
					invalidateOtherAreasAtPixel(i, area);
			}
		}

		for(const areaMask of areaMasks)
		{
			const {area, mask} = areaMask;
			connectIslandsToLargest(mask, width, height);
			fillHoles(mask, width, height);

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
	generateHalftoneSizeMask,
	saveHalftoneSizeMask,
}