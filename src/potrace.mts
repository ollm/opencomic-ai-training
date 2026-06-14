import Potrace from 'oslllo-potrace';
import sharp from 'sharp';

export type Turnpolicy = 'black' | 'white' | 'left' | 'right' | 'minority' | 'majority';

export interface PotraceOptions {
    turnpolicy?: Turnpolicy;
    turdsize?: number;
    optcurve?: boolean;
    opttolerance?: number;
}

export default async function potrace(mask: Uint8Array, width: number, height: number, options: PotraceOptions = {}): Promise<string> {

    const buffer: Buffer = await sharp(Buffer.from(mask), {raw: {width: width, height: height, channels: 1}}).negate().flatten({background: '#ffffff'}).toFormat('png').toBuffer();
    const traced = await Potrace(buffer, options).trace();

    const path = traced.match(/d="([^"]*)"/)?.[1] || '';
    return path.trim();

}

export {Potrace};