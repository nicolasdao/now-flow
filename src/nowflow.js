/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const path = require('path')
require('colors')
const { writeToFile, deleteFile } = require('./utilities').files

/*eslint-disable */
const getAbsPath = relativePath => path.join(process.cwd(), relativePath)
const exit = msg => {
	if (msg)
		console.log(msg)
	process.exit()
}
/*eslint-enable */

const duplicate = obj => obj ? JSON.parse(JSON.stringify(obj)) : obj

const getJsonFiles = (env='default') => {
	const nowPath = getAbsPath('now.json')
	const pkgPath = getAbsPath('package.json')
	let now, pkg
	try {
		now = require(nowPath)
	}
	catch(err) {
		console.log(`Error while attempting to load file ${nowPath.bold}`.italic.red)
		exit(err)
	}

	try {
		pkg = require(pkgPath)
	}
	catch(err) {
		console.log(`Error while attempting to load file ${pkgPath.bold}`.italic.red)
		exit(err)
	}

	const envConfig = (now.environment || {})[env]
	if (!envConfig)
		exit(`No environment named '${env.bold}' in ${'now.json'.bold}`.italic.red)

	return {
		pkgPath,
		nowPath,
		now,
		pkg
	}
}

/**
 * Updates the package.json file to contain the appropriate config specific 
 * to the targetted environment. This only includes the "scripts" properties.
 * 
 * @param  {String}  env    			Target environment
 * @return {Object}  out
 * @return {Object}  out.err    		{ subject: ..., body: ... }
 * @return {Boolean} out.restore    	Indicates whether or not the package.json should be restored (which also implicitely should delete the backup file)
 * @return {String}  out.path    		package.json location
 * @return {String}  out.backupPath    	.package.backup.json location
 * @return {Object}  out.current    	Original package.json (same as .package.backup.json but in memory)
 * @return {Object}  out.new    		Modified package.json
 */
const updatePackageJson = (env='default', { pkgPath, pkg, now }) => {
	const pkgBackupPath = getAbsPath('.package.backup.json')
	const currentPkgConfig = pkg
	const newPkgConfig = duplicate(currentPkgConfig)
	
	const envConfig = (now.environment || {})[env]

	if (envConfig.scripts != undefined) {
		if (!currentPkgConfig.scripts)
			newPkgConfig.scripts = {}

		for (let script in envConfig.scripts) 
			newPkgConfig.scripts[script] = envConfig.scripts[script]	
		
		return createOrUpdateJsonFile(pkgBackupPath, currentPkgConfig)
			.catch(err => ({ 
				err: { subject: 'Failed to create the temporary \'.package.backup.json\' file.', body: err }, 
				restore: true,
				path: pkgPath, 
				backupPath: pkgBackupPath, 
				current: currentPkgConfig,  
				new: newPkgConfig
			}))
			.then(() => createOrUpdateJsonFile(pkgPath, newPkgConfig))
			.catch(err => ({ 
				err: { subject: 'Failed to temporarily override the \'package.json\' file.', body: err }, 
				restore: true,
				path: pkgPath, 
				backupPath: pkgBackupPath, 
				current: currentPkgConfig,  
				new: newPkgConfig
			}))
			.then(() => ({ 
				restore: true,
				path: pkgPath, 
				backupPath: pkgBackupPath, 
				current: currentPkgConfig,  
				new: newPkgConfig
			}))
	}
	else 
		return Promise.resolve({ 
			restore: false,
			path: pkgPath, 
			backupPath: pkgBackupPath, 
			current: currentPkgConfig,  
			new: newPkgConfig
		})
}

/**
 * Updates the now.json file to contain the appropriate config specific 
 * to the targetted environment. This includes:
 * - The now alias "alias"
 * - The current enviornment "env"."active"
 * - Any gcp config "gcp"
 * 
 * @param  {String}  env    			Target environment
 * @return {Object}  out
 * @return {Object}  out.err    		{ subject: ..., body: ... }
 * @return {Boolean} out.restore    	Indicates whether or not the now.json should be restored (which also implicitely should delete the backup file)
 * @return {Boolean} out.alias    		Indicates whether or not the alias should be created
 * @return {String}  out.path    		now.json location
 * @return {String}  out.backupPath    	.now.backup.json location
 * @return {Object}  out.current    	Original now.json (same as .now.backup.json but in memory)
 * @return {Object}  out.new    		Modified now.json
 */
const updateNowJson = (env='default', { nowPath, now }) => {
	const nowBackupPath = getAbsPath('.now.backup.json')
	const currentNowConfig = now
	const newNowConfig = duplicate(currentNowConfig)

	const currentEnvConfig = (now.environment || {})[env]

	const aliasMustBeSet = currentEnvConfig.alias != undefined && newNowConfig.alias != currentEnvConfig.alias
	const activeEnvMustBeSet = !currentEnvConfig.active || currentEnvConfig.active == env
	const gcpMustBeSet = currentEnvConfig.gcp != undefined
	const hostingType = !currentEnvConfig.hostingType || currentEnvConfig.hostingType == 'localhost' ? 'localhost' : currentEnvConfig.hostingType

	if (aliasMustBeSet || activeEnvMustBeSet || gcpMustBeSet) {
		if (aliasMustBeSet)
			newNowConfig.alias = currentEnvConfig.alias
		if (activeEnvMustBeSet)
			newNowConfig.environment.active = env
		if (gcpMustBeSet)
			newNowConfig.gcp = currentEnvConfig.gcp
		
		return createOrUpdateJsonFile(nowBackupPath, currentNowConfig)
			.catch(err => ({ 
				err: { subject: 'Failed to create the temporary \'.now.backup.json\' file.', body: err }, 
				restore: true,
				alias: false, 
				path: nowPath, 
				backupPath: nowBackupPath, 
				current: currentNowConfig,  
				new: newNowConfig,
				hostingType: hostingType
			}))
			.then(() => createOrUpdateJsonFile(nowPath, newNowConfig))
			.catch(err => ({ 
				err: { subject: 'Failed to temporarily override the \'now.json\' file.', body: err }, 
				restore: true,
				alias: false, 
				path: nowPath, 
				backupPath: nowBackupPath, 
				current: currentNowConfig,  
				new: newNowConfig,
				hostingType: hostingType
			}))
			.then(() => ({ 
				restore: true,
				alias: currentEnvConfig.alias != undefined && !gcpMustBeSet, // (1) 
				path: nowPath, 
				backupPath: nowBackupPath, 
				current: currentNowConfig,  
				new: newNowConfig,
				hostingType: hostingType
			}))
	}
	else 
		return Promise.resolve({ 
			restore: false,
			alias: currentEnvConfig.alias != undefined && !gcpMustBeSet, // (1)
			path: nowPath, 
			backupPath: nowBackupPath, 
			current: currentNowConfig,  
			new: newNowConfig,
			hostingType: hostingType
		})

	// (1) Aliasing is not supported by GCP. Also, the reason we use currentEnvConfig.alias != undefined rather than 
	// aliasMustBeSet is because aliasMustBeSet=true only specifies that the now.json must be modified. We might 
	// have aliasMustBeSet=false but still need to alias the deployment.
}

const createOrUpdateJsonFile = (filePath, jsonObj={}) => {
	const str = JSON.stringify(jsonObj, null, '\t')
	return writeToFile(filePath, str)
}

const restoreFiles = (now, pkg) => {
	return Promise.resolve(null)
		.then(() => {
			if (now.restore) 
				return createOrUpdateJsonFile(now.path, now.current).then(() => deleteFile(now.backupPath))
		})
		.then(() => {
			if (pkg.restore) 
				return createOrUpdateJsonFile(pkg.path, pkg.current).then(() => deleteFile(pkg.backupPath))
		})
		.catch(() => {
			console.log('WARNING - Issue while attempting to restore files now.json and package.json'.yellow)
		})
}

const deploy = (env='default', noalias=false) => {
	const configFiles = getJsonFiles(env)
	let nowUpdate, pkgUpdate, deployError, aliasError
	return updateNowJson(env, configFiles).then(out => { nowUpdate = out })
		.then(() => updatePackageJson(env, configFiles).then(out => { pkgUpdate = out }))
		.then(() => {
			if (!nowUpdate.err && !pkgUpdate.err) {
				try {
					if (nowUpdate.hostingType == 'gcp')
						require('child_process').execSync('now gcp', { stdio: 'inherit' })
					else
						require('child_process').execSync('now', { stdio: 'inherit' })
				}
				catch(err) {
					deployError = err
				}
				try {
					if (!deployError && !noalias && nowUpdate.alias) {
						require('child_process').execSync('now alias', { stdio: 'inherit' })
					}
				}
				catch(err) {
					aliasError = err
				}

				return restoreFiles(nowUpdate, pkgUpdate)
					.then(() => {
						if (aliasError) {
							console.log('Error while aliasing'.red)
							exit(aliasError)
						}
						if (deployError) {
							console.log('Error while deploying'.red)
							exit(deployError)
						}
						if (pkgUpdate.err) {
							console.log('Error while updating the package.json pre-deployment'.red)
							console.log(pkgUpdate.err.subject.red)
							exit(pkgUpdate.err.body)
						}
						if (nowUpdate.err) {
							console.log('Error while updating the now.json pre-deployment'.red)
							console.log(nowUpdate.err.subject.red)
							exit(nowUpdate.err.body)
						}
					})
			}
		})
}

module.exports = {
	deploy
}

