import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';

export default [
	{
		input: 'src/index.mts',
		output: [
			{
				file: 'dist/index.cjs',
				format: 'cjs',
			},
			{
				file: 'dist/index.mjs',
				format: 'es',
			},
		],
		plugins: [
			typescript({
				tsconfig: './tsconfig.json',
				declaration: false,
			}),
		],
	},
	{
		input: 'src/index.mts',
		output: {
			file: 'dist/index.d.ts',
			format: 'es',
		},
		plugins: [dts()],
	},
	{
		input: 'src/test.mts',
		output: [
			{
				file: 'dist/test.mjs',
				format: 'es',
			},
		],
		plugins: [
			typescript({
				tsconfig: './tsconfig.json',
				declaration: false,
			}),
		],
	},
];