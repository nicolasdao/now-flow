const { assert } = require('chai')
const config = require('../src/util/config-files')

/*eslint-disable */
describe('config-files', () => 
	it(`Should extract global and local 'now' configuration files.`, () => {
		/*eslint-enable */
		// console.log(config.readConfigFile())
		// console.log(config.readAuthConfigFile())
		// console.log(config.readLocalConfig())
		
		assert.equal(typeof(config.readConfigFile), 'function')
		assert.equal(typeof(config.readAuthConfigFile), 'function')
		assert.equal(typeof(config.readLocalConfig), 'function')
	}))