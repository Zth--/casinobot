function calculateDynamicOdds(betPool) {
	// Calculate the total points in the pool
	const totalPointsInPool = Object.values(betPool).reduce((total, points) => total + points, 0);
	// Calculate odds for each option
	const odds = {};
	for (const optionName in betPool) {
		const optionPoints = betPool[optionName]
		// Set the odds - inversely proportional to the amount bet on the option
		// You may want to add a base rate or minimum odds for each option
		odds[optionName] = optionPoints === 0 ? "N/A" : (totalPointsInPool / optionPoints).toFixed(2)
	}

	return odds;
}

module.exports = { calculateDynamicOdds };
