// Packages
const chalk = require('chalk')

module.exports = promptOptions

/*eslint-disable */
const getProcess = () => process
/*eslint-enable */

function promptOptions(opts) {
	return new Promise((resolve, reject) => {
		opts.forEach(([, text], i) => {
			console.log(`${chalk.gray('>')} [${chalk.bold(i + 1)}] ${text}`)
		})

		const ondata = v => {
			const s = v.toString()

			const cleanup = () => {
				getProcess().stdin.setRawMode(false)
				getProcess().stdin.removeListener('data', ondata)
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

		getProcess().stdin.setRawMode(true)
		getProcess().stdin.resume()
		getProcess().stdin.on('data', ondata)
	})
}
