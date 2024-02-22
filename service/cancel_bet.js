async function startCancellationVote(betId) {
	
}

// Function to cast a vote
async function castCancellationVote(userId, betId, vote) {
	// logic to record user's vote
	// Check if all participants have voted for cancellation
	const allVoted = await checkAllVotes(betId);
	if (allVoted) {
		await cancelBet(betId);
	}
}

// Check if all participants voted for cancellation
async function checkAllVotes(betId) {
	// Fetch all votes and check if all are in favor of cancellation
	// return true or false
}

// Cancel the bet and refund points
async function cancelBet(betId) {
	// logic to cancel bet and refund points to all participants
	// Notify users about the cancellation
}
