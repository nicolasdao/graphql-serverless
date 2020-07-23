/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/

/**
 * Marshalls a errors to GraphQL. 
 * 
 * @param  {Number}		code		HTTP code
 * @param  {[Error]}	errors		Array of errors to be marshalled
 * @param  {String}		text		Text to use if there are no 'errors' or if the 'useText' flag is set to true
 * @param  {Boolean}	useText		Default false. Determines whether to display the 'text' or 'errors' (default)
 * @param  {Boolean}	noStack		Default false. Determines whether to display the error stack. 
 * 
 * @return {Error}
 */
const _explicitGraphqlError = ({ code=500, errors, text, useText, noStack }) => {
	const explicitErrors = !useText && errors && errors.length 
		? errors.map(e => {
			const error = {
				message: e.message 
			}

			if (!noStack)
				error.locations = (e.stack || '')
					.split(/\n\s*at\s/)
					.splice(1)
					.map(s => s.match(/[0-9]+:[0-9]+\){0,1}$/))
					.filter(x => x)
					.map(x => {
						const stackLineAndCol = x[0]
						const stackLine = x.input
						const line = stackLineAndCol.match(/^[0-9]*/)[0]*1
						const col = stackLineAndCol.match(/:[0-9]+/)[0].replace(':','')*1
						const method = ((stackLine.match(/^.+\s/)||[])[0]||'').replace(/\s/g,'')
						const path = method 
							? stackLine.replace(`${method} (`, '').replace(`:${stackLineAndCol}`,'')
							: stackLine.replace(`:${stackLineAndCol}`,'')
						return {
							line,
							col,
							method,
							path
						}
					})

			return error
		})
		: null

	return new Error(JSON.stringify({
		type: 'graphql',
		httpCode:code,
		errors:explicitErrors,
		message: useText || !explicitErrors  ? (text || 'Internal server error') : null
	}))
}

/**
 * Returns a standard JS Error object where the message has been JSON serialized.
 * Possible signatures:
 * - ({ code:Number, errors:[Error], text:String, useText:Boolean })
 * - (httpCode:Number)
 * - (httpCode:Number, message:String)
 * - (httpCode:Number, message:String, options:Object)
 * - (message:String)
 * - (message:String, options:Object)
 *
 * where options is { alternateMessage:String, hide:Boolean }
 * @return {Error}         [description]
 */
const graphqlError = (...args) => {
	const firstType = typeof(args[0])
	if (args.length == 1 && firstType == 'object')
		return _explicitGraphqlError(args[0])

	const codeDefined = firstType == 'number'
	const httpCode = codeDefined ? args[0] : 500
	const message = codeDefined ? args[1] || '' : args[0] || ''
	const options = codeDefined ? args[2] || {} : args[1] || {}
	const alternateMessage = options.alternateMessage || 'Internal Server Error'
	const hideErrors = options.hide
	return new Error(JSON.stringify({
		type: 'graphql',
		httpCode,
		message,
		alternateMessage,
		hideErrors
	}))
}



module.exports = graphqlError