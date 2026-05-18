import prand from 'pure-rand';

import {RandGenerator, Rand, RandObject, Prob} from './types.mjs';

function bytesToDecimal(string: string) {

	const bytes = Array.from(string).map(c => c.charCodeAt(0));
	let value = 0;

	for (const b of bytes)
	{
		value = (value << 8) | b;
	}

	return value;

}

function generateFloat32(rng: prand.RandomGenerator): number {

	const g1 = prand.unsafeUniformIntDistribution(0, (1 << 24) - 1, rng);
	const value = g1 / (1 << 24);
	return value;

}

function generateRange(rng: prand.RandomGenerator, from: number, to: number): number {

	const value = prand.unsafeUniformIntDistribution(from, to, rng);
	return value;

}

const randByKeyMap: Map<string, RandGenerator> = new Map();

export function randByKey(key:  string = '', seed: number = 0): RandGenerator {

	// seed = bytesToDecimal(key) + seed;

	if(!randByKeyMap.has(key))
		randByKeyMap.set(key, uniqueRand(seed));

	return randByKeyMap.get(key)!;

} 

export function uniqueRand(seed: number = 0): RandGenerator {

	const rng = prand.xoroshiro128plus(seed);

	// Warm up the RNG to avoid similar starting values
	for(let i = 0; i < 10; i++)
		generateFloat32(rng);

	return {
		rng,
		next: () => generateFloat32(rng),
		range: (from: number, to: number) => generateRange(rng, from, to),
	};

}

export function generate(rand: Rand, randGenerator: RandGenerator): boolean | number | string | Rand {

	if(typeof rand === 'number' || typeof rand === 'string' || typeof rand === 'boolean')
	{
		return rand;
	}
	else if(Array.isArray(rand) && (typeof rand[0] !== 'object' || rand[0] === null || Array.isArray(rand[0])))
	{
		if(rand.length === 2 && typeof rand[0] === 'number' && typeof rand[1] === 'number')
		{
			const from = rand[0];
			const to = rand[1];

			// Decimal Range
			if(from % 1 !== 0 || to % 1 !== 0)
				return randGenerator.next() * (to - from) + from;

			// Integer Range
			return randGenerator.range(from, to);
		}
		else
		{
			if(rand[0] === null)
			{
				rand.shift();

				for(let i = 0, len = rand.length; i < len; i++)
				{
					rand[i] = generate(rand[i], randGenerator) as RandObject;
				}

				return rand;
			}
			else // Array of strings, numbers, etc.
			{
				return generate(rand[randGenerator.range(0, rand.length - 1)], randGenerator);
			}
		}
	}
	else if(!Array.isArray(rand) && typeof rand === 'object')
	{
		if(rand.prob !== undefined && typeof rand.prob === 'number' && rand.prob > 0)
			return (randGenerator.next() < rand.prob) ? generate(rand.value ?? true, randGenerator) : false;
		
		if('weight' in rand)
		{
			if(rand.weight !== undefined && rand.weight > 0)
				return generate(rand.value, randGenerator);

			return false;
		}

		return rand;
	}
	else if(Array.isArray(rand) && typeof rand[0] === 'object')
	{
		const _rand = rand as RandObject[]
		const totalWeight = _rand.reduce((sum, obj) => sum + (obj.weight ?? 0), 0);
		let value = randGenerator.next() * totalWeight;

		for(const obj of _rand)
		{
			const weight = obj.weight ?? 0;

			if(value < weight)
				return generate(obj.value, randGenerator)

			value -= weight;
		}

		return generate(_rand[_rand.length - 1].value, randGenerator);
	}

	return rand;
}

function prob(prob: Prob, randGenerator: RandGenerator): boolean {

	if(typeof prob === 'boolean')
		return prob;

	return randGenerator.next() < prob;

}

function probFilter<T>(items: (T & {prob: Prob})[], randGenerator: RandGenerator): T[] {

	const results: T[] = [];

	for(const item of items)
	{
		const _prob = prob(item.prob, randGenerator);

		if(_prob)
		{
			item.prob = _prob;
			results.push(item as T);
		}
	}

	return results;

}

export default {
	randByKey,
	uniqueRand,
	generate,
	prob,
	probFilter,
}