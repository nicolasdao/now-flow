#!/usr/bin/env node
/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
'use strict'

const program = require('commander')
const { deploy } = require('./src/nowf')

program
	.command('* <env>')
	.usage('Deploy to Zeit Now using a specific environment configuration that will configure the \'now.json\' and the \'package.json\' accordingly.')
	.option('-n, --noalias', 'When specified, prevent deployment to be aliased.')
	.action((env, options={}) => {
		deploy(env, ((options.parent || {}).rawArgs || []).some(x => (x == '--noalias' || x == '--noa')))
	})

/*eslint-disable */
program.parse(process.argv)
/*eslint-enable */