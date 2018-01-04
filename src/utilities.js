/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const _ = require('lodash')
const shortid = require('shortid')
const fs = require('fs')
const path = require('path')
const rimraf = require('rimraf')

const chain = value => ({ next: fn => chain(fn(value)), val: () => value })
const set = (obj, prop, value, mutateFn) => 
	!obj || !prop ? obj :
		chain(typeof(prop) != 'string' && prop.length > 0).next(isPropArray => isPropArray
			? prop.reduce((acc, p, idx) => { obj[p] = value[idx]; return obj }, obj)
			: (() => { obj[prop] = value; return obj })())
			.next(updatedObj => {
				if (mutateFn) mutateFn(updatedObj)
				return updatedObj
			})
			.val()
const throwError = (v, msg) => v ? (() => {throw new Error(msg)})() : true

const log = (msg, name, transformFn) => chain(name ? `${name}: ${typeof(msg) != 'object' ? msg : JSON.stringify(msg)}` : msg)
	/*eslint-disable */
	.next(v => transformFn ? console.log(chain(transformFn(msg)).next(v => name ? `${name}: ${v}` : v).val()) : console.log(v))
	/*eslint-enable */
	.next(() => msg)
	.val()

const newShortId = () => shortid.generate().replace(/-/g, 'r').replace(/_/g, '9')

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                           START FORMATTING                           ////////////////////////////////

const zeroPad = (num, places) => {
	const zero = places - num.toString().length + 1
	return Array(+(zero > 0 && zero)).join('0') + num
}
const removeMultiSpaces = s => s.replace(/ +(?= )/g,'')

//////////////////////////                           END FORMATTING                             ////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Merge obj1 with obj2 into a new object. If there are 
 * conflicting properties, the one with a defined value wins. If 
 * they both have a value, obj1 will win.
 * 
 * @param  {object} obj1 Object 1
 * @param  {object} obj2 Object 2
 * @return {object}      New Object
 */
const mergeTwoObjects = (obj1, obj2) => (!obj1 || !obj2) ? (obj1 || obj2) :
	((o1, o2) => {
		let newObj = {}
		for(let i in o2) 
			newObj[i] = o1[i] != undefined ? o1[i] : o2[i]
		for(let i in o1) 
			newObj[i] = o1[i] != undefined ? o1[i] : o2[i]
		return newObj
	})(obj1, obj2)

const mergeObjects = objs => _(objs).reduce((a,b) => mergeTwoObjects(a,b), {})

const mapToDefault = (obj, defaultObj, mapFn) => {
	const mergedObj = mergeTwoObjects(obj, defaultObj)
	return (mergedObj && mapFn) 
		? mergeTwoObjects(mapFn(mergedObj), mergedObj)
		: mergedObj
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                             START HTTP                                ///////////////////////////////

const shortRequest = req => ({
	body: req.body,
	headers: req.headers,  
	url: req.url,
	method: req.method,
	params: req.params,
	query: req.query
})

const shortResponse = res => ({
	body: res.body,
	headers: res.headers,  
	url: res.url,
	method: res.method,
	params: res.params,
	query: res.query,
	statusCode: res.statusCode,
	statusMessage: res.statusMessage
})

const getCookieKeyValue = s => {
	const parts = s.split('=')
	return [parts[0], parts.slice(1, parts.length).join('=')]
}
const getCookie = req => (req.headers.cookie || '').split('; ').map(x => getCookieKeyValue(x)).reduce((a,b) => { a[b[0]] = b[1]; return a },{})

//////////////////////////                              END HTTP                                 ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                             START CACHE                               ///////////////////////////////

let _cache = {}
let _cacheClearTTL = { lastUpdate: Date.now() }
const setCache = (key, results, ttl) => { _cache[key] = { ttl: ttl, date: Date.now(), results }; return results }
const getCacheKeyValuePair = (key, cacheTTL) => {
	let v = _cache[key]
	const ttl = v && v.ttl ? v.ttl : cacheTTL
	if (v && ((Date.now() - v.date) > ttl)) 
		v = undefined
	clearCache(cacheTTL)
	return { key, value: v ? v.results : undefined }
}

const clearCache = cacheTTL => () => {
	const now = Date.now()
	if (now - _cacheClearTTL.lastUpdate > cacheTTL) {
		/*eslint-disable */
		setImmediate(() => {
            /*eslint-enable */
			for (let i in _cache) {
				const v = _cache[i]
				const ttl = v.ttl || cacheTTL
				if ((now - v.date) > ttl) delete _cache[i]
			}
		})
		_cacheClearTTL.lastUpdate = Date.now()
	}
}
const createKey = (obj, fnName) => Promise.resolve(`${fnName}:${_(obj).map((value, key) => `${key}:${value}`).join('-')}`)

const cacheResolve = cacheTTL => (keyObj, fnName, getValue, ttl) => createKey(keyObj, fnName)
	.then(key => getCacheKeyValuePair(key, cacheTTL))
	.then(cached => cached.value || setCache(cached.key, getValue(), ttl))

const createCacheObject = cacheTTL => ({
	/**
	 * Gets the cached value of the functions executed inside 'getValue'. If no values has been cached yet, then
	 * the 'getValue' function is executed using the parameters of the 'keyObj' and the cache is set using the concatenation
	 * of the 'fnName' value with the 'keyObj'. Example:
	 *
	 * const getProducts = ({ name, brandName }) => get(
	 * 		{name, brandName}, 
	 * 		'GETPRODUCTS', 
	 * 		() => doSomethingLong(name, brandName),
	 * 		10000)
	 * 
	 * @param  {Object} 	keyObj     	Object that represents the parameters of the functions executed inside 'getValue'.
	 * @param  {String} 	fnName 		Function unique identifier.
	 * @param  {Function} 	getValue    Function being executed if the cache has not been set yet. This function does not accept any argument.
	 * @param  {Int} 		ttl     	Time to live of the cache in milliseconds.
	 * @return {Promise}         		Promise returning the value of the cache.
	 */
	get: cacheResolve(cacheTTL)
})

//////////////////////////                              END CACHE                                ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                             START FILE HELPERS                               ////////////////////////

const fileExists = p => new Promise((onSuccess, onFailure) => fs.exists(p, exists => exists ? onSuccess(p) : onFailure(p)))

const createDir = p => new Promise((onSuccess, onFailure) => fs.mkdir(p, err => err ? onFailure(p) : onSuccess(p)))

const deleteFolder = f => new Promise(onSuccess => rimraf(f, () => onSuccess()))

const deleteFile = f => new Promise((onSuccess, onFailure) => fs.unlink(f, err => err ? onFailure(err) : onSuccess()))

const writeToFile = (filePath, stringContent) => new Promise((onSuccess, onFailure) => fs.writeFile(filePath, stringContent, err => 
	err ? onFailure(err) : onSuccess()))

/**
 * Creates folders under a rootFolder
 * @param  {String} rootFolder 						Root folder. This folder must exist prior to calling this function.
 * @param  {Array}  folders    						Array of folders so that the path of the last item in that array will be: 
 *                                   				rootFolder/folders[0]/folders[1]/.../folders[n]
 * @param  {Object} options
 * @param  {Boolean} options.deletePreviousContent  If set to true, this will delete the content of the existing folder
 * @return {String} 								Path of the latest folder:
 *                               					rootFolder/folders[0]/folders[1]/.../folders[n]           
 */
const createFolders = (rootFolder, folders=[], options={}) => {
	const { deletePreviousContent } = options
	if (!rootFolder)
		throw new Error('\'rootFolder\' is required.')
	return fileExists(rootFolder)
		.then(() => folders.reduce((job, f) => job.then(rootPath => {
			const folderPath = path.join(rootPath, f)
			return fileExists(folderPath)
				.then(() => deletePreviousContent 
					? deleteFolder(folderPath).then(() => createDir(folderPath)).then(() => folderPath) 
					: folderPath)
				.catch(() => createDir(folderPath).then(() => folderPath))
		}), Promise.resolve(rootFolder)))
		.catch(() => {
			throw new Error(`Root folder ${rootFolder} does not exist.`)
		})	
}

//////////////////////////                             END FILE HELPERS                                 ////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////                          START PROMISE HELPERS                               ////////////////////////


const delayFn = (fn,time) => makeQueryablePromise((new Promise((onSuccess) => setTimeout(() => onSuccess(), time))).then(() => fn()))
const makeQueryablePromise = promise => {
	// Don't modify any promise that has been already modified.
	if (promise.isResolved) return promise

	// Set initial state
	let isPending = true
	let isRejected = false
	let isFulfilled = false

	// Observe the promise, saving the fulfillment in a closure scope.
	let result = promise.then(
		v => {
			isFulfilled = true
			isPending = false
			return v
		}, 
		e => {
			isRejected = true
			isPending = false
			throw e
		}
	)

	result.isFulfilled = () => isFulfilled
	result.isPending = () => isPending
	result.isRejected = () => isRejected
	return result
}

//////////////////////////                           END PROMISE HELPERS                                ////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const hours = h => h * 3600000
const minutes = m => m * 60000
const seconds = s => s * 1000
const millis = s => s

const defaultCacheTTL = 5000
module.exports = {
	chain,
	throwError,
	log,
	set,
	newShortId,
	formatting: {
		removeMultiSpaces,
		zeroPad
	},
	mergeObjects,
	mapToDefault,
	http: {
		shortRequest,
		shortResponse,
		getCookie
	},
	cache: createCacheObject(defaultCacheTTL),
	time: {
		hours,
		minutes,
		seconds,
		millis
	},
	files:{
		fileExists,
		createDir,
		deleteFolder,
		deleteFile,
		writeToFile,
		createFolders
	},
	promise:{
		delayFn,
		makeQueryablePromise
	}
}