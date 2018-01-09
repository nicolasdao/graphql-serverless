/**
 * Copyright (c) 2018, Neap pty ltd.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * This file incorporates work covered by the following copyright and  
 * permission notice:
 *
 *    Copyright (c) 2015, Facebook, Inc.
 *    All rights reserved.
 *
 *    This source code is licensed under the BSD-style license found in the
 *    LICENSE file in the root directory of this source tree. An additional grant
 *    of patent rights can be found in the PATENTS file in the same directory.
 */

const accepts = require('accepts')
const graphql = require('graphql')
const httpError = require('http-errors')
const url = require('url')

const parseBody = require('./parseBody')
const { renderGraphiQL } = require('./renderGraphiQL')

const graphqlHandler = options => {
	if (!options)
		throw new Error('Missing required argument. A graphql handler must accept an \'options\' object')

	return (req, res, next) => {
		if (!res.headersSent) {
			const httpHandler = graphqlHTTP(options)
			if (!httpHandler)
				throw httpError(500, 'GraphQL middleware requires a valid \'getOptions\' argument.')
			return httpHandler(req, res).then(() => next())
		}
		else
			next()
	}
}

function graphqlHTTP(options) {
	if (!options) {
		throw new Error('GraphQL middleware requires options.')
	}
	
	return (request, response) => {
		// Higher scoped variables are referred to at various stages in the
		// asynchronous state machine below.
		let schema
		let context
		let rootValue
		let pretty
		let graphiql
		let formatErrorFn
		let extensionsFn
		let showGraphiQL
		let query
		let documentAST
		let variables
		let operationName
		let validationRules
		let endpointURL
		let schemaAST
		let graphiQlOptions

		// Promises are used as a mechanism for capturing any thrown errors during
		// the asynchronous process below.

		// Resolve the Options to get OptionsData.
		return new Promise(resolve => {
			resolve(
				typeof options === 'function' ?
					options(request, response) :
					options
			)
		}).then(optionsData => {
			// Assert that optionsData is in fact an Object.
			if (!optionsData || typeof optionsData !== 'object') {
				throw new Error(
					'GraphQL middleware option function must return an options object ' +
																				'or a promise which will be resolved to an options object.'
				)
			}

			// Assert that schema is required.
			if (!optionsData.schema) {
				throw new Error(
					'GraphQL middleware options must contain a schema.'
				)
			}

			// Collect information from the options data object.
			schema = optionsData.schema
			context = optionsData.context || request
			rootValue = optionsData.rootValue
			pretty = optionsData.pretty
			graphiql = optionsData.graphiql
			formatErrorFn = optionsData.formatError
			extensionsFn = optionsData.extensions
			endpointURL = optionsData.endpointURL
			schemaAST = optionsData.schemaAST
			graphiQlOptions = optionsData.graphiqlOptions

			validationRules = graphql.specifiedRules
			if (optionsData.validationRules) {
				validationRules = validationRules.concat(optionsData.validationRules)
			}

			// GraphQL HTTP only supports GET and POST methods.
			if (request.method !== 'GET' && request.method !== 'POST') {
				response.setHeader('Allow', 'GET, POST')
				throw httpError(405, 'GraphQL only supports GET and POST requests.')
			}

			// Parse the Request to get GraphQL request parameters.
			return getGraphQLParams(request)
		}).then(params => {
			// Get GraphQL params from the request and POST body data.
			query = params.query
			variables = params.variables
			operationName = params.operationName && params.operationName != 'undefined' ? params.operationName : null
			showGraphiQL = graphiql && canDisplayGraphiQL(request, params)

			if (showGraphiQL && endpointURL) {
				const pathname = (p => p ? p : '')(url.parse(request.url).pathname).replace(/^\//, '').toLowerCase()
				const endpointsParts = endpointURL.toLowerCase().split('/').filter(x => x && x != '/')
				const pathnameLastParts = pathname.split('/').filter(x => x && x != '/').slice(-endpointsParts.length)
				const isGraphiQlRequest = pathnameLastParts.join('_._') == endpointsParts.join('_._')
				
				if (!isGraphiQlRequest)
					showGraphiQL = false
			}

			// If there is no query, but GraphiQL will be displayed, do not produce
			// a result, otherwise return a 400: Bad Request.
			if (!query) {
				if (showGraphiQL) {
					return null
				}
				throw httpError(400, 'Must provide query string.')
			}

			// GraphQL source.
			const source = new graphql.Source(query, 'GraphQL request')

			// Parse source to AST, reporting any syntax error.
			try {
				documentAST = graphql.parse(source)
			} catch (syntaxError) {
				// Return 400: Bad Request if any syntax errors errors exist.
				response.statusCode = 400
				return { errors: [syntaxError] }
			}

			// Validate AST, reporting any errors.
			const validationErrors = graphql.validate(schema, documentAST, validationRules)
			if (validationErrors.length > 0) {
				// Return 400: Bad Request if any validation errors exist.
				response.statusCode = 400
				return { errors: validationErrors }
			}

			// Only query operations are allowed on GET requests.
			if (request.method === 'GET') {
				// Determine if this GET request will perform a non-query.
				const operationAST = graphql.getOperationAST(documentAST, operationName)
				if (operationAST && operationAST.operation !== 'query') {
					// If GraphiQL can be shown, do not perform this query, but
					// provide it to GraphiQL so that the requester may perform it
					// themselves if desired.
					if (showGraphiQL) {
						return null
					}

					// Otherwise, report a 405: Method Not Allowed error.
					response.setHeader('Allow', 'POST')
					throw httpError(
						405,
						`Can only perform a ${operationAST.operation} operation ` +
																								'from a POST request.'
					)
				}
			}
			// Perform the execution, reporting any errors creating the context.
			try {
				return graphql.execute(
					schema,
					documentAST,
					rootValue,
					context,
					variables,
					operationName
				)
			} catch (contextError) {
				// Return 400: Bad Request if any execution context errors exist.
				response.statusCode = 400
				return { errors: [contextError] }
			}
		}).then(result => {
			// Collect and apply any metadata extensions if a function was provided.
			// http://facebook.github.io/graphql/#sec-Response-Format
			if (result && extensionsFn) {
				return Promise.resolve(extensionsFn({
					document: documentAST,
					variables,
					operationName,
					result
				})).then(extensions => {
					if (extensions && typeof extensions === 'object') {
						(result).extensions = extensions
					}
					return result
				})
			}
			return result
		}).catch(error => {
			// If an error was caught, report the httpError status, or 500.
			response.statusCode = error.status || 500
			return { errors: [error] }
		}).then(result => {
			// If no data was included in the result, that indicates a runtime query
			// error, indicate as such with a generic status code.
			// Note: Information about the error itself will still be contained in
			// the resulting JSON payload.
			// http://facebook.github.io/graphql/#sec-Data
			if (result && result.data === null) {
				response.statusCode = 500
			}
			// Format any encountered errors.
			if (result && result.errors) {
				(result).errors = result.errors.map(formatErrorFn || graphql.formatError)
			}
			// If allowed to show GraphiQL, present it instead of JSON.
			if (showGraphiQL) {
				const payload = renderGraphiQL({ query, variables, operationName, result, schemaAST }, graphiQlOptions)
				response.setHeader('Content-Type', 'text/html; charset=utf-8')
				sendResponse(response, payload)
			} else {
				// Otherwise, present JSON directly.
				const payload = JSON.stringify(result, null, pretty ? 2 : 0)
				response.setHeader('Content-Type', 'application/json; charset=utf-8')
				sendResponse(response, payload)
			}
			return result
		})
	}
}
/**
 * Provided a "Request" provided by express or connect (typically a node style
 * HTTPClientRequest), Promise the GraphQL request parameters.
 */

function getGraphQLParams(request) {
	return parseBody(request).then(bodyData => {
		const urlData = request.url && url.parse(request.url, true).query || {}
		return parseGraphQLParams(urlData, bodyData)
	})
}

/**
 * Helper function to get the GraphQL params from the request.
 */
function parseGraphQLParams(urlData, bodyData) {
	// GraphQL Query string.
	let query = bodyData.query || urlData.query
	if (typeof query !== 'string') {
		query = null
	}

	// Parse the variables if needed.
	let variables = urlData.variables || bodyData.variables
	if (variables && typeof variables === 'string') {
		try {
			variables = JSON.parse(variables)
		} catch (error) {
			throw httpError(400, 'Variables are invalid JSON.')
		}
	} else if (typeof variables !== 'object') {
		variables = null
	}

	// Name of GraphQL operation to execute.
	let operationName = bodyData.operationName || urlData.operationName
	if (typeof operationName !== 'string') {
		operationName = null
	}

	const raw = urlData.raw !== undefined || bodyData.raw !== undefined

	return { query, variables, operationName, raw }
}

/**
 * Helper function to determine if GraphiQL can be displayed.
 */
function canDisplayGraphiQL(request, params) {
	// If `raw` exists, GraphiQL mode is not enabled.
	// Allowed to show GraphiQL if not requested as raw and this request
	// prefers HTML over JSON.
	return !params.raw && accepts(request).types(['json', 'html']) === 'html'
}

/**
 * Helper function for sending the response data. Use response.send it method
 * exists (express), otherwise use response.end (connect).
 */
function sendResponse(response, data) {
	if (typeof response.send === 'function') {
		response.status(200).send(data)
	} else {
		response.end(data)
	}
}

const isGraphiQLRequest = (req) => getGraphQLParams(req).then(params => canDisplayGraphiQL(req, params))

module.exports = {
	graphqlHandler,
	isGraphiQLRequest
}