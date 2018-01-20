// Packages
const chalk = require('chalk')

module.exports = promptOptions

function promptOptions(opts) {
	return new Promise((resolve, reject) => {
		opts.forEach(([, text], i) => {
			console.log(`${chalk.gray('>')} [${chalk.bold(i + 1)}] ${text}`)
		})

		const ondata = v => {
			const s = v.toString()

			const cleanup = () => {
				/*eslint-disable */
				process.stdin.setRawMode(false)
				process.stdin.removeListener('data', ondata)
				/*eslint-enable */
			}

			// Ctrl + C
			if (s === '\u0003') {
				cleanup()
				const err = new Error('Aborted')
				err.code = 'USER_ABORT'
				return reject(err)
			}

			const n = Number(s)
			if (opts[n - 1]) {
				cleanup()
				resolve(opts[n - 1][0])
			}
		}

		/*eslint-disable */
		process.stdin.setRawMode(true)
		process.stdin.resume()
		process.stdin.on('data', ondata)
		/*eslint-enable */
	})
}
