
export async function sleep(ms: number = 500) {

	return new Promise((resolve) => setTimeout(resolve, ms));

}

export default {
	sleep,
}