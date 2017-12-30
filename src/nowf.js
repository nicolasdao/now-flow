/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const path = require('path')
require('colors')
const { writeToFile } = require('./utilities').files

/*eslint-disable */
const getAbsPath = relativePath => path.join(process.cwd(), relativePath)
const exit = msg => {
	if (msg)
		console.log(msg)
	process.exit()
}
/*eslint-enable */

const duplicate = obj => obj ? JSON.parse(JSON.stringify(obj)) : obj

const updatePackageScripts = (env='default') => {
	let nowConfig
	nowConfig = require(getAbsPath('now.json')) || {}

	const envConfig = (nowConfig.env || {})[env]
	if (!envConfig)
		throw new Error(`No environment named '${env.bold}' in ${'now.json'.bold}`)

	const pkgPath = getAbsPath('package.json')
	if (envConfig.scripts != undefined) {
		const currentPkg = require(pkgPath) || {}
		const newPkg = duplicate(currentPkg)

		if (!currentPkg.scripts)
			newPkg.scripts = {}

		for (let script in envConfig.scripts) 
			newPkg.scripts[script] = envConfig.scripts[script]	

		return updateJsonFile(pkgPath, newPkg)
			.then(() => ({ path: pkgPath, current: currentPkg, new: newPkg }))
			// If updating the package.json fails, attempt to revert
			.catch(err => {
				return updateJsonFile(pkgPath, currentPkg)
					.catch(() => null)
					.then(() => { throw err })
			})
	}
	else 
		return Promise.resolve({ path: pkgPath, current: null })
}

const updateNowAlias = (env='default', toogle=true) => {
	const nowPath = getAbsPath('now.json')
	const currentNowConfig = require(nowPath) || {}
	const newNowConfig = duplicate(currentNowConfig)

	const currentEnvConfig = (currentNowConfig.env || {})[env]
	if (!currentEnvConfig)
		throw new Error(`No environment named '${env.bold}' in ${'now.json'.bold}`)

	if (currentEnvConfig.alias != undefined && toogle) {
		newNowConfig.alias = currentEnvConfig.alias
		
		return updateJsonFile(nowPath, newNowConfig)
			.then(() => ({ alias: toogle, path: nowPath, current: currentNowConfig, new: newNowConfig }))
			// If updating the now.json fails, attempt to revert
			.catch(err => {
				return updateJsonFile(nowPath, currentNowConfig)
					.catch(() => null)
					.then(() => { throw err })
			})
	}
	else 
		return Promise.resolve({ alias: false, path: nowPath, current: null })
}

const updateNowActiveEnv = (env='default') => {
	const nowPath = getAbsPath('now.json')
	const currentNowConfig = require(nowPath) || {}
	const newNowConfig = duplicate(currentNowConfig)

	const currentEnvConfig = (currentNowConfig.env || {})[env]
	if (!currentEnvConfig)
		throw new Error(`No environment named '${env.bold}' in ${'now.json'.bold}`)

	if (!currentEnvConfig.active || currentEnvConfig.active == env) {
		newNowConfig.env.active = env
		
		return updateJsonFile(nowPath, newNowConfig)
			.then(() => ({ restore: true, path: nowPath, current: currentNowConfig, new: newNowConfig }))
			// If updating the now.json fails, attempt to revert
			.catch(err => {
				return updateJsonFile(nowPath, currentNowConfig)
					.catch(() => null)
					.then(() => { throw err })
			})
	}
	else 
		return Promise.resolve({ restore: false, path: nowPath, current: currentNowConfig, new: newNowConfig })
}

const updateJsonFile = (filePath, jsonObj={}) => {
	const str = JSON.stringify(jsonObj, null, '\t')
	return writeToFile(filePath, str)
}

const deploy = (env='default', noalias=false) => 
	// 1. Update the "scripts" property of the package.json before deploying
	updatePackageScripts(env)
		.catch(err => exit(err.message.italic.red))
	// 2. Update the "env"."active" property of the now.json before deploying
		.then(pkg => updateNowActiveEnv(env).then(now => ({ pkg, now })))
		.catch(err => exit(err.message.italic.red))
	// 3. Deploy
		.then(({ pkg, now }) => {
			try {
			// 3.1. Deploy using now CLI
				require('child_process').execSync('now', { stdio: 'inherit' })
			}
			catch(err) {
				return updateJsonFile(pkg.path, pkg.current)
					.then(() => exit())
					.catch(() => exit())
			}
			// 3.2. Restore the package.json and the now.json to what it was before
			return updateJsonFile(pkg.path, pkg.current)
				.then(() => {
					if (now && now.restore)
						return updateJsonFile(now.path, now.current)
				})
		})
		.catch(err => exit(err.message.italic.red))
	// 4. Alias the deployment
		.then(() => {
			if (!noalias)
			// 4.1. Update the "alias" property of the now.json file based on the current environment
				return updateNowAlias(env).then(now => {
					if (now.alias) {
						try {
						// 4.2. Alias using now CLI
							require('child_process').execSync('now alias', { stdio: 'inherit' })
						}
						catch(err) {
							return updateJsonFile(now.path, now.current)
								.then(() => exit())
								.catch(() => exit())
						}

						// 4.3. Restore the now.json to what it was before
						return updateJsonFile(now.path, now.current)
					}
				})
		})

module.exports = {
	deploy
}

