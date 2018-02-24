/**
 * Returns a standard JS Error object where the message has been JSON serialized.
 * Possible signatures:
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
	const codeDefined = typeof(args[0]) == 'number'
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