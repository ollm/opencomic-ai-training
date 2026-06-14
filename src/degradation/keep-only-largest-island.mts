export default function keepOnlyLargestIsland(mask: Uint8Array, width: number, height: number) {

	if(width <= 0 || height <= 0)
		return;

	const size = width * height;
	const visited = new Uint8Array(size);
	const components: number[][] = [];

	for(let i = 0; i < size; i++)
	{
		if(mask[i] !== 255 || visited[i])
			continue;

		const component: number[] = [];
		const stack: number[] = [i];
		visited[i] = 1;

		while(stack.length)
		{
			const current = stack.pop()!;
			component.push(current);

			const x = current % width;
			const y = Math.floor(current / width);

			if(x + 1 < width)
			{
				const ni = current + 1;
				if(mask[ni] === 255 && !visited[ni])
				{
					visited[ni] = 1;
					stack.push(ni);
				}
			}

			if(x - 1 >= 0)
			{
				const ni = current - 1;
				if(mask[ni] === 255 && !visited[ni])
				{
					visited[ni] = 1;
					stack.push(ni);
				}
			}

			if(y + 1 < height)
			{
				const ni = current + width;
				if(mask[ni] === 255 && !visited[ni])
				{
					visited[ni] = 1;
					stack.push(ni);
				}
			}

			if(y - 1 >= 0)
			{
				const ni = current - width;
				if(mask[ni] === 255 && !visited[ni])
				{
					visited[ni] = 1;
					stack.push(ni);
				}
			}
		}

		components.push(component);
	}

	if(components.length <= 1)
		return;

	let largestIndex = 0;

	for(let i = 1; i < components.length; i++)
	{
		if(components[i].length > components[largestIndex].length)
			largestIndex = i;
	}

	for(let i = 0; i < components.length; i++)
	{
		if(i === largestIndex)
			continue;

		for(const index of components[i])
			mask[index] = 0;
	}

}
