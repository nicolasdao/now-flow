// Native
const { resolve } = require('path')

// Packages
const { existsSync } = require('fs-extra')

/*eslint-disable */
const fsResolver = async (param, { cwd = process.cwd() } = {}) => {
	/*eslint-enable */
	const resolved = resolve(cwd, param)
	if (existsSync(resolved)) {
		return resolved
	} else {
		return null
	}
}

module.exports = fsResolver
