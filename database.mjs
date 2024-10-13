import { Regions as dbRegions } from "./regions.mjs";

// Helper function to make a HEAD request with aborting capability
async function headRequest({ region, controller }) {
	try {
		const response = await fetch(region.url + "/rest/v1", {
			method: 'HEAD',
			headers: {
				'apikey': region.anon
			},
			signal: controller.signal
		});

		// if (!response.ok) throw new Error(`Error: ${response.statusText}`);

		return true; // Resolve if the response is successful
	} catch (error) {
		if (error.name === 'AbortError') {
			return false; // The request was aborted
		} else {
			throw error; // Some other error occurred
		}
	}
}

// Main function to find the first responding DB and abort the rest
async function getFirstRespondingDB() {

	// Create an AbortController for each request
	const controllers = dbRegions.map(() => new AbortController());

	try {
		// Use Promise.race to wait for the first successful response
		const firstRespondingIndex = await Promise.race(
			dbRegions.map((region, index) =>
				headRequest({ region, controller: controllers[index] })
					.then(() => index) // Return the index of the first successful region
			)
		);

		// Abort all remaining requests
		controllers.forEach((controller, index) => {
			if (index !== firstRespondingIndex) {
				controller.abort();
			}
		});

		// Return the first responding region's URL and key
		return dbRegions[firstRespondingIndex];
	} catch (error) {
		console.error('Error while connecting to databases:', error);
		throw error;
	}
}

export { getFirstRespondingDB };