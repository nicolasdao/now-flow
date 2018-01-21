// @flow

// Packages
const ms = require('ms')
const fetch = require('node-fetch')
const mri = require('mri')
const { gray, bold } = require('chalk')
const uid = require('uid-promise')
const bytes = require('bytes')
const sleep = require('then-sleep')
const debug = require('debug')('now:gcp:deploy')

// Utilities
const ok = require('../../util/output/ok')
const info = require('../../util/output/info')
const wait = require('../../util/output/wait')
const link = require('../../util/output/link')
const success = require('../../util/output/success')
const humanPath = require('../../util/humanize-path')
const resolve = require('../../resolve')
const error = require('../../util/output/error')
const param = require('../../util/output/param')
const build = require('../../serverless/build')
const getToken = require('./util/get-access-token')
const describeProject = require('../../describe-project')
const copyToClipboard = require('../../util/copy-to-clipboard')
const generateBucketName = require('./util/generate-bucket-name')
const { writeToConfigFile } = require('../../util/config-files')

/*eslint-disable */
const getProcess = () => process
/*eslint-enable */

const TRIGGER_TYPES = { 'https': true, 'cloud.pubsub': true, 'cloud.storage': true, 'google.firebase.database': true }
const EVENT_TYPES = { 'cloud.pubsub': 'topic.publish', 'cloud.storage': 'object.change', 'google.firebase.database': 'ref.write' }
/**
 * [description]
 * @param  {Object} ctx.authConfig JSON object stored under ~/.now/auth.json
 * @param  {Object} ctx.config     JSON object stored under ~/.now/config.json
 * @param  {Object} ctx.argv       JSON object stored under now.json in the root of your project
 */
const deploy = async (ctx={}) => {

	const { project } = ctx.authConfig.credentials.find(p => p.provider === 'gcp') || {}
	if (!project) {
		console.error(error('Missing required \'gcp\' project configuration. Run \'now gcp login\' and choose a project.'))
		return 1
	}

	// Example now.json for gcpConfig
	// {
	//   functionName: String,
	//   timeout: String,
	//   memory: Number,
	//   region: String,
	//   trigger: {
	//   	type: String, (https || cloud.pubsub || cloud.storage || google.firebase.database)
	//   	topic: String, 
	//   	bucket: String
	//   }
	// }
	const gcpConfig = (ctx.argv || {}).gcp || {}
	const region = gcpConfig.region || 'us-central1'
	const deploymentId = gcpConfig.functionName || 'now-' + desc.name + '-' + (await uid(10))
	const _timeout = gcpConfig.timeout || '15s'
	const memory = gcpConfig.memory || 512
	if (gcpConfig.trigger && gcpConfig.trigger.type && !TRIGGER_TYPES[gcpConfig.trigger.type]) {
		console.error(error(`Invalid trigger type '${gcpConfig.trigger.type}'. Valid values: 'https', 'cloud.pubsub', 'cloud.storage' and 'google.firebase.database'.`))
		return 1
	}
	const triggerType = gcpConfig.trigger && gcpConfig.trigger.type ? gcpConfig.trigger.type : 'https'

	if (triggerType == 'cloud.pubsub' && !gcpConfig.trigger.topic) {
		console.error(error('Missing required property \'topic\'. When defining a \'cloud.pubsub\' trigger, a \'topic\' must be provided in the now.json file.'))
		return 1
	}
	if (triggerType == 'cloud.storage' && !gcpConfig.trigger.bucket) {
		console.error(error('Missing required property \'bucket\'. When defining a \'cloud.storage\' trigger, a \'bucket\' must be provided in the now.json file.'))
		return 1
	}
	const resource = triggerType == 'cloud.pubsub' || triggerType == 'cloud.storage'
		? { resource: triggerType == 'cloud.pubsub' ? `projects/${project.id}/topics/${gcpConfig.trigger.topic}` : `projects/${project.id}/buckets/${gcpConfig.trigger.bucket}` }
		: {}

	const trigger = triggerType != 'https' 
		? { eventTrigger: Object.assign(resource, { eventType: `providers/${triggerType}/eventTypes/${EVENT_TYPES[triggerType]}` }) }
		: { httpsTrigger: { url: null } }


	const { argv: argv_ } = ctx
	const argv = mri(argv_, {
		boolean: ['help'],
		alias: {
			help: 'h'
		}
	})

	const token = await getToken(ctx)

	// `now [provider] [deploy] [target]`
	const [cmdOrTarget = null, target_ = null] = argv._.slice(2).slice(-2)

	let target

	if (cmdOrTarget === 'gcp' || cmdOrTarget === 'deploy') {
		target = target_ === null ? getProcess().cwd() : target_
	} else {
		if (target_) {
			console.error(error('Unexpected number of arguments for deploy command'))
			return 1
		} else {
			target = cmdOrTarget === null ? getProcess().cwd() : cmdOrTarget
		}
	}

	const start = Date.now()
	const resolved = await resolve(target)

	if (resolved === null) {
		console.error(error(`Could not resolve deployment target ${param(target)}`))
		return 1
	}

	let desc = null

	try {
		desc = await describeProject(resolved)
	} catch (err) {
		if (err.code === 'AMBIGOUS_CONFIG') {
			console.error(
				error(`There is more than one source of \`now\` config: ${err.files}`)
			)
			return 1
		} else {
			throw err
		}
	}

	console.log(
		info(
			`Deploying ${param(humanPath(resolved))} ${gray('(gcp)')} ${gray(
				`(${region})`
			)}`
		)
	)

	const buildStart = Date.now()
	const stopBuildSpinner = wait('Building and bundling your app…')
	const zipFile = await build(resolved, desc)
	stopBuildSpinner()

	if (zipFile.length > 100 * 1024 * 1024) {
		console.error(error('The build exceeds the 100mb GCP Functions limit'))
		return 1
	}

	console.log(
		ok(
			`Build generated a ${bold(bytes(zipFile.length))} zip ${gray(
				`[${ms(Date.now() - buildStart)}]`
			)}`
		)
	)

	const zipFileName = `${deploymentId}.zip`

	const resourcesStart = Date.now()

	debug('checking gcp function check')
	const fnCheckExistsRes = () =>
		fetch(
			`https://cloudfunctions.googleapis.com/v1beta2/projects/${project.id}/locations/${region}/functions/${deploymentId}`,
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
			}
		)
	const checkExistsRes = await fnCheckExistsRes()
	const fnExists = checkExistsRes.status !== 404

	const stopResourcesSpinner = wait(`${fnExists ? 'Updating' : 'Creating'} API resources`)

	if (!ctx.config.gcp) ctx.config.gcp = {}
	if (!ctx.config.gcp.bucketName) {
		ctx.config.gcp.bucketName = generateBucketName()
		writeToConfigFile(ctx.config)
	}

	const { bucketName } = ctx.config.gcp

	debug('creating gcp storage bucket')
	const bucketRes = await fetch(
		`https://www.googleapis.com/storage/v1/b?project=${project.id}`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name: bucketName
			})
		}
	)

	if (
		bucketRes.status !== 200 &&
    bucketRes.status !== 409 /* already exists */
	) {
		console.error(
			error(
				`Error while creating GCP Storage bucket: ${await bucketRes.text()}`
			)
		)
		return 1
	}

	debug('creating gcp storage file')
	const fileRes = await fetch(`https://www.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(zipFileName)}&project=${encodeURIComponent(project.id)}`,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/zip',
				'Content-Length': zipFile.length,
				Authorization: `Bearer ${token}`
			},
			body: zipFile
		}
	)

	try {
		await assertSuccessfulResponse(fileRes)
	} catch (err) {
		console.error(error(err.message))
		return 1
	}

	// API documented at https://cloud.google.com/functions/docs/reference/rest/v1beta2/projects.locations.functions#CloudFunction 
	debug('creating gcp function create')
	const fnCreateRes = await fetch(`https://cloudfunctions.googleapis.com/v1beta2/projects/${project.id}/locations/${region}/functions${fnExists ? `/${deploymentId}` : ''}`,
		{
			method: fnExists ? 'PUT' : 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			},
			body: JSON.stringify(Object.assign({
				name: `projects/${project.id}/locations/${region}/functions/${deploymentId}`,
				timeout: _timeout,
				availableMemoryMb: memory,
				sourceArchiveUrl: `gs://${encodeURIComponent(bucketName)}/${zipFileName}`,
				entryPoint: 'handler'
			}, trigger))
		}
	)

	if (403 === fnCreateRes.status) {
		const url = `https://console.cloud.google.com/apis/api/cloudfunctions.googleapis.com/overview?project=${project.id}`
		console.error(error(`GCP Permission Denied error. Make sure the "Google Cloud Functions API" is enabled in the API Manager\n  ${bold('API Manager URL')}: ${link(url)}`))
		return 1
	}

	try {
		await assertSuccessfulResponse(fnCreateRes)
	} catch (err) {
		console.error(error(err.message))
		return 1
	}

	let retriesLeft = 10
	let url = ''
	let status, httpsTrigger

	do {
		if (status === 'FAILED') {
			console.error(error('API resources seem to have failed to deploy. Double-check your Google Cloud account to gather more details.'))
			stopResourcesSpinner()
			return 1
		} else if (!--retriesLeft) {
			console.error(
				error('Could not determine status of the deployment: ' + String(url))
			)
			stopResourcesSpinner()
			return 1
		} else {
			await sleep(5000)
		}

		const checkExistsRes = await fnCheckExistsRes()
		try {
			await assertSuccessfulResponse(checkExistsRes)
		} catch (err) {
			console.error(error(err.message))
			return 1
		}

		({ status, httpsTrigger } = await checkExistsRes.json())
		if (httpsTrigger) 
			url = httpsTrigger.url

	} while (status !== 'READY')

	stopResourcesSpinner()
	console.log(
		ok(
			`API resources ${fnExists ? 'updated' : 'created'} (id: ${param(deploymentId)}) ${gray(
				`[${ms(Date.now() - resourcesStart)}]`
			)}`
		)
	)

	const copied = copyToClipboard(url, true)

	const successMsg = 
		triggerType == 'cloud.pubsub' ? success(`Function ready to respond to 'cloud.pubsub' event on topic '${resource.resource}' ${gray(`[${ms(Date.now() - start)}]`)}`) : 
			triggerType == 'cloud.storage' ? success(`Function ready to respond to 'object.change' event on bucket '${resource.resource}' ${gray(`[${ms(Date.now() - start)}]`)}`) :
				triggerType == 'google.firebase.database' ? success(`Function ready to respond to 'ref.write' event on firebase ${gray(`[${ms(Date.now() - start)}]`)}`) :
					success(`${link(url)} ${copied ? gray('(in clipboard)') : ''} ${gray(`[${ms(Date.now() - start)}]`)}`)

	console.log(successMsg)

	return 0
}

const assertSuccessfulResponse = async res => {
	if (!res.ok) {
		let msg
		let body

		try {
			body = await res.json()
		} catch (err) {
			msg = `An API error was returned (${res.status}), but the error code could not be diagnosed`
		}

		if (body && body.error) msg = body.error.message
		throw new Error(msg)
	}
}

module.exports = deploy
