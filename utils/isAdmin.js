module.exports = function isAdmin(userId) {
	if (["189507271280164865", "97408643577675776"].includes(userId)) {
		return true
	}
	return false
}