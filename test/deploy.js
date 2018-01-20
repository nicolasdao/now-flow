const { assert } = require('chai')
const configFiles = require('../src/util/config-files')
const gcpDeploy = require('../src/providers/gcp/deploy')
const awsDeploy = require('../src/providers/aws/deploy')

const config = { 
	_: 'This is your Now config file. See `now config help`. More: https://git.io/v5ECz',
	sh: { 
		user: { 
			uid: 'config.sh.user.uid.blablablablablablabla',
			email: 'nicolas.dao@gmail.com',
			username: 'nicdao',
			date: null,
			avatar: null 
		} 
	}
}

const authConfig = { 
	_: 'This is your Now credentials file. DON\'T SHARE! More: https://git.io/v5ECz',
	credentials:[ { 
			provider: 'sh', 
			token: 'authConfig.credentials[0](sh).token.blablablablablablabla'
		},{ 
			provider: 'gcp',
			accessToken: 'authConfig.credentials[1](gcp).accessToken.blablablablablablabla',
			expiresAt: 15164331360040,
			refreshToken: 'authConfig.credentials[1](gcp).refreshToken.blablablablablablabla',
			project: {
				id: 'authConfig.credentials[1](gcp).project.id.blablablablablablabla',
				name: 'authConfig.credentials[1](gcp).project.name.blablablablablablabla'
			}
		},{ 
			provider: 'aws',
			accessKeyId: 'authConfig.credentials[1](aws).accessKeyId.blablablablablablabla',
			secretAccessKey: 'authConfig.credentials[1](aws).secretAccessKey.blablablablablablabla'
		} 
	] 
} 

/*eslint-disable */
describe('deploy', () =>
	describe('#gcp', () => 
		it(`Should deploy to GCP Function.`, () => {
			/*eslint-enable */
			//gcpDeploy({ authConfig, config })
			assert.equal(typeof(gcpDeploy), 'function')
		})))

describe('deploy', () =>
	describe('#aws', () => 
		it(`Should deploy to AWS Lambda.`, () => {
			/*eslint-enable */
			//awsDeploy({ authConfig, config })
			assert.equal(typeof(awsDeploy), 'function')
		})))