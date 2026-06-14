export default function connectIslandsToLargest(mask: Uint8Array, width: number, height: number) {

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

	const largestComponent = components[largestIndex];
	const distance = new Int32Array(size);
	distance.fill(-1);

	const parent = new Int32Array(size);
	parent.fill(-1);

	const queue = new Int32Array(size);
	let head = 0;
	let tail = 0;

	for(const index of largestComponent)
	{
		distance[index] = 0;
		queue[tail++] = index;
	}

	while(head < tail)
	{
		const current = queue[head++];
		const x = current % width;
		const y = Math.floor(current / width);

		if(x + 1 < width)
		{
			const ni = current + 1;
			if(distance[ni] === -1)
			{
				distance[ni] = distance[current] + 1;
				parent[ni] = current;
				queue[tail++] = ni;
			}
		}

		if(x - 1 >= 0)
		{
			const ni = current - 1;
			if(distance[ni] === -1)
			{
				distance[ni] = distance[current] + 1;
				parent[ni] = current;
				queue[tail++] = ni;
			}
		}

		if(y + 1 < height)
		{
			const ni = current + width;
			if(distance[ni] === -1)
			{
				distance[ni] = distance[current] + 1;
				parent[ni] = current;
				queue[tail++] = ni;
			}
		}

		if(y - 1 >= 0)
		{
			const ni = current - width;
			if(distance[ni] === -1)
			{
				distance[ni] = distance[current] + 1;
				parent[ni] = current;
				queue[tail++] = ni;
			}
		}
	}

	for(let i = 0; i < components.length; i++)
	{
		if(i === largestIndex)
			continue;

		const component = components[i];
		let closest = component[0];
		let closestDistance = distance[closest];

		for(const index of component)
		{
			const d = distance[index];

			if(d >= 0 && (closestDistance < 0 || d < closestDistance))
			{
				closest = index;
				closestDistance = d;
			}
		}

		let current = closest;

		while(current >= 0 && distance[current] > 0)
		{
			mask[current] = 255;
			current = parent[current];
		}

		if(current >= 0)
			mask[current] = 255;
	}
}
