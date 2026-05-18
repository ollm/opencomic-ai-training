import prand from 'pure-rand';
import {KernelEnum} from 'sharp';

export interface RandGenerator {
	rng: prand.RandomGenerator;
	next: () => number;
	range: (from: number, to: number) => number;
}

type _Rand = boolean | number | [number, number] | number[] | string | string[];

export interface ProbObject {
	prob: number;
	value: _Rand;
}

export interface RandObject {
	value: _Rand;
	if?: string;
	weight?: number;
	prob?: Prob;
}

export type Rand = _Rand | RandObject | ProbObject | RandObject[];
export type Prob = boolean | number;

export type Drawing = 'lineart' | 'background' | 'texture' | 'multiline-draw' | 'colorize-mask' | 'paint' | 'lineart-texture' | 'lineart-random' | 'dots';
export type Processing = 'halftone' | 'noise' | 'blur' | 'resize' | 'texture-image' | 'layer-blur';
export type Degradation = 'jpeg' | 'webp';
export type Kernel = KernelEnum;

export interface DegradationObject {
	type: Degradation;
	prob: Prob;
	quality?: Rand;
}

export interface ProcessingOption {
	type: Processing;
	prob: Prob;
	size?: Rand;
	gray?: Rand;
	scale?: Rand;
	skipIf?: string[];
	kernel?: Rand;
	blurUp?: Rand;
	blurDown?: Rand;
}

export interface Options {
	seed: number;
	resume: boolean;
	images: number;
	degradedImagesPerCleanImage: number;
	mainRand?: RandGenerator,
	imageSeed?: number,
	currentImageRand?: RandGenerator,
	currentImage?: number,
	currentImagePalette?: Color[],
	groupLayer?: string,
	groupLayers?: string[],
	base: {
		scale: number;
		disableBrushesWithPixelatedEdges?: boolean;
		disableBrushesWithPixelatedEdgesInSmallSize?: boolean;
		halftone: {
			angle: Rand;
		};
		size: {
			width: Rand;
			height: Rand;
		};
		colored: {
			prob: Prob;
		};
	};
	drawings: {
		type: Drawing;
		file: string;
		amount: Rand;
	}[];
	postProcessing: ProcessingOption[];
	finalProcessing: ProcessingOption[];
	degradations: {
		name: string;
		type: Degradation;
		output: {
			clean: string;
			degraded: string;
			options: string;
		};
		list: DegradationObject[];
	}[];
}

export type PresetCategory = 'eraser' | 'airbrush' | 'basic' | 'pencil' | 'ink' | 'marker' | 'bristles' | 'dry' | 'chalk' | 'charcoal' | 'wet' | 'watercolor' | 'blender' | 'adjustment' | 'rgba' | 'shapes' | 'pixel-art' | 'clone-distort' | 'sketching' | 'texture' | 'filter' | 'screentone' | 'stamp';

export interface Drawings {
	type: Drawing;
	points?: number[];
	color?: Color;
	data?: any,
}

export type Area = 'all' | 'up' | 'middle' | 'down';

export type Layers = Partial<Record<Area, Record<string, any>>>;

export interface Color {
	r: number;
	g: number;
	b: number;
	a?: number;
}

export interface ColorObject {
	index: number;
	name: string;
	color: Color;
	rgb?: Color;
}