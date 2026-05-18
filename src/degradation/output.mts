import fs from 'fs';
import p from 'path';

import krita from '../krita.mjs'
import sharp from './sharp.mjs';

import {Area, Layers} from '../types.mjs'

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
		image = await sharp.jpegBuffer(image);

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


export default {
	clean,
	degraded,
	saveClean,
	saveDegraded,
	saveOptions,
}