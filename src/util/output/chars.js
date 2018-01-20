const chars = {
	// in some setups now.exe crashes if we use
	// the normal tick unicode character :|
	/*eslint-disable */
	tick: process.platform === 'win32' ? '√' : '✔'
	/*eslint-enable */
}

module.exports = chars
