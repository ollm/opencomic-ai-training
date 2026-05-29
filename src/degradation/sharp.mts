import os from 'os';
import sharp from 'sharp';

import _options from '../options.mjs';
import cloneDeep from 'lodash.clonedeep';

sharp.concurrency(os.cpus().length);

function buffer(base64: string | Buffer): Buffer {

	if(typeof base64 !== 'string')
		return base64;

	return Buffer.from(base64, 'base64');

}

const kernels = ['nearest', 'linear', 'cubic', 'mitchell', 'lanczos2', 'lanczos3', 'mks2013', 'mks2021', 'bicubic', 'bilinear', 'nohalo', 'lbb', 'vsqbs'];
const affine = new Set(['bicubic', 'bilinear', 'nohalo', 'lbb', 'vsqbs']);

async function resize(options: any, degradation: Record<string, any>, image: string | Buffer, isDegraded: boolean = false): Promise<Buffer> {

	let _sharp = sharp(buffer(image));
	const _size = await _sharp.metadata();

	const width = _size.width; // Use sharp size
	const height = _size.height;
	const kernel = (!isDegraded) ? (degradation?.clean?.kernel ?? degradation.kernel) : degradation.kernel;

	const size = {
		width: Math.round(width * degradation.scale),
		height: Math.round(height * degradation.scale),
		kernel: kernel,
		fit: sharp.fit.fill, // Force exact size
	};

	// Minimum size 64x64
	if(size.width < 64 || size.height < 64)
	{
		if(size.width < size.height)
		{
			size.width = 64;
			size.height = Math.round((64 / width) * height);
		}
		else
		{
			size.height = 64;
			size.width = Math.round((64 / height) * width);
		}
	}

	_sharp = _sharp.png({compressionLevel: 0, force: true});

	if(affine.has(kernel))
	{
		let _width = width;
		let _height = height;

		if(size.width < _width)
		{
			let m = Math.floor(_width / size.width);

			if(m >= 2)
			{
				_width = Math.round(_width / m);
				_height = Math.round(_height / m);
			}
		}

		if(_width != width)
			_sharp = _sharp.resize({kernel: 'cubic', width: _width, height: _height, fit: sharp.fit.fill});

		_sharp = _sharp.affine([size.width / _width, 0, 0, size.height / _height], {interpolator: kernel});
	}
	else
	{
		_sharp = _sharp.resize(size);
	}

	const {data, info} = await _sharp.toBuffer({resolveWithObject: true});

	return data;

}

// This can produce desalination
async function resizeBlur(options: any, degradation: Record<string, any>, image: string | Buffer, isDegraded: boolean = false): Promise<Buffer> {

	let _sharp = sharp(buffer(image));
	const _size = await _sharp.metadata();

	const width = Math.round(_size.width * degradation.scale);

	const scale = width / _size.width;
	const scaleRestore = 1 / scale;

	const resized = await resize(options, {...degradation, scale}, image, isDegraded);
	const final = await resize(options, {...degradation, scale: scaleRestore}, resized, isDegraded);

	return final;

}


async function blur(options: any, degradation: Record<string, any>, image: string | Buffer, isDegraded: boolean = false): Promise<Buffer> {

	let _sharp = sharp(buffer(image));

	_sharp = _sharp.blur({
		sigma: degradation.sigma,
		precision: 'integer',
		minAmplitude: 0.02,
	});

	const {data, info} = await _sharp.toBuffer({resolveWithObject: true});
	return data;

}

async function rotate(options: any, degradation: Record<string, any>, image: string | Buffer): Promise<Buffer> {

	const {data, info} = await sharp(buffer(image), {}).rotate(degradation.angle, {background: degradation.background}).toBuffer({resolveWithObject: true});
	const multiple = options.base.size.multiple ?? 1;

	if(info.width % multiple != 0 || info.height % multiple != 0)
	{
		const width = Math.floor(info.width / multiple) * multiple;
		const height = Math.floor(info.height / multiple) * multiple;

		return await sharp(data, {}).extract({left: 0, top: 0, width: width, height: height}).toBuffer();
	}

	return data;

}

async function jpeg(options: any, degradation: Record<string, any>, image: string | Buffer): Promise<Buffer> {

	const {data, info} = await sharp(buffer(image), {}).jpeg({quality: degradation.quality, force: true}).toBuffer({resolveWithObject: true});

	return data;

}

async function webp(options: any, degradation: Record<string, any>, image: string | Buffer): Promise<Buffer> {

	const {data, info} = await sharp(buffer(image), {}).webp({quality: degradation.quality, force: true}).toBuffer({resolveWithObject: true});

	return data;

}

async function avif(options: any, degradation: Record<string, any>, image: string | Buffer): Promise<Buffer> {

	const {data, info} = await sharp(buffer(image), {}).avif({quality: degradation.quality, force: true}).toBuffer({resolveWithObject: true});

	return data;

}

async function jxl(options: any, degradation: Record<string, any>, image: string | Buffer): Promise<Buffer> {

	const {data, info} = await sharp(buffer(image), {}).jxl({quality: degradation.quality, force: true}).toBuffer({resolveWithObject: true});

	return data;

}

async function pngBase64(buffer: string | Buffer): Promise<string> {

	if(typeof buffer === 'string')
		return buffer;

	const {data, info} = await sharp(buffer, {}).png({compressionLevel: 0, force: true}).toBuffer({resolveWithObject: true});
	return data.toString('base64');

}

async function jpegBuffer(image: string | Buffer, quality: number = 100): Promise<Buffer> {

	const {data, info} = await sharp(buffer(image), {}).jpeg({quality: quality, force: true}).toBuffer({resolveWithObject: true});
	return data;

}

async function checkSizes(options: any, clean: string | Buffer, degraded: string | Buffer): Promise<boolean> {

	const multiple = options?.size?.multiple ?? 1;

	const cleanSize = await sharp(buffer(clean)).metadata();
	const degradedSize = await sharp(buffer(degraded)).metadata();

	if(cleanSize.width != (degradedSize.width * multiple) || cleanSize.height != (degradedSize.height * multiple))
		return false;

	return true;

}

export default {
	buffer,
	resize,
	resizeBlur,
	blur,
	rotate,
	jpeg,
	webp,
	avif,
	jxl,
	pngBase64,
	jpegBuffer,
	checkSizes,
}