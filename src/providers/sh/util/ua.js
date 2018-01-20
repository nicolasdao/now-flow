// Native
const os = require('os')

// Ours
const {version} = require('../../../util/pkg')

/*eslint-disable */
module.exports = `now ${version} node-${process.version} ${os.platform()} (${os.arch()})`
/*eslint-enable */
