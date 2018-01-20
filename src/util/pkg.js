/* eslint-disable import/no-unresolved */

// Native
const path = require('path')

// Utilities
const pkg = require('../../package.json')

try {
	/*eslint-disable */
	const distDir = path.dirname(process.execPath)
	/*eslint-enable */
	pkg._npmPkg = require(path.join(distDir, '../../package.json'))
} catch (err) {
	pkg._npmPkg = null
}

module.exports = pkg
