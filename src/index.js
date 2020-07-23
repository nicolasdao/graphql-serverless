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
const { SubscriptionServer } = require('subscriptions-transport-ws')
const graphqlError = require('./utils')
require('color')

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

// Though this may seem completely stupid to list a combination of potential empty queries rather than 
// escaping the original query, empty queries are such an exception that escaping all freaking 
// queries just for that rare occasion seems too expensive.
const _basicEmptyQueries = {'{}': true,'{\n}': true,'{ \n}': true,'{ }': true,'query{}': true,'query{\n}': true,'query{ \n}': true,'query{ }': true,'query {}': true,'query {\n}': true,'query { \n}': true,'query { }': true,'mutation{}': true,'mutation{\n}': true,'mutation{ \n}': true,'mutation{ }': true,'mutation {}': true,'mutation {\n}': true,'mutation { \n}': true,'mutation { }': true,'subscription{}': true,'subscription{\n}': true,'subscription{ \n}': true,'subscription{ }': true,'subscription {}': true,'subscription {\n}': true,'subscription { \n}': true,'subscription { }': true}
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
		let subscriptionsEndpoint
		let websocketConnectionParams
		let schemaAST
		let graphiQlOptions = {}
		let onResponse = (req, res, result) => Promise.resolve(result)

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
			graphiql = optionsData.graphiql ? true : false
			formatErrorFn = optionsData.formatError
			extensionsFn = optionsData.extensions
			endpointURL = optionsData.endpointURL
			subscriptionsEndpoint = optionsData.subscriptionsEndpoint
			websocketConnectionParams = optionsData.websocketConnectionParams
			schemaAST = optionsData.schemaAST
			if (optionsData.graphiql != undefined && typeof(optionsData.graphiql) == 'object')
				graphiQlOptions =  optionsData.graphiql
			if (graphiQlOptions.toggle == false)
				graphiql = false
			if (graphiQlOptions.endpoint)
				endpointURL = graphiQlOptions.endpoint
			if (optionsData.onResponse && typeof(optionsData.onResponse) == 'function')
				onResponse = (req, res, result) => Promise.resolve(null).then(() => optionsData.onResponse(req, res, result))

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
			if (!_basicEmptyQueries[query]) {
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
			}
			else
				return { ___empty: true, data: {} }
		}).then(result => {
			// Collect and apply any metadata extensions if a function was provided.
			// http://facebook.github.io/graphql/#sec-Response-Format
			if (result && extensionsFn && !result.___empty) {
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
			let httpCode = response.statusCode || 200
			if (result && result.___empty) {
				result.errors = null
				httpCode == 200
				result = {}
			}
			let transformResult = () => Promise.resolve(result)

			if (result) {
				if (request.graphql) {
					// Add custom errors from potential middleware.
					if (request.graphql.errors && Array.isArray(request.graphql.errors) && request.graphql.errors.length > 0) {
						if (!result.errors)
							result.errors = []
						result.errors.push(...request.graphql.errors.map(({ message, locations, path }) => ({ message, locations, path })))
					}
					
					// Add custom warnings from potential middleware.
					if (request.graphql.warnings && Array.isArray(request.graphql.warnings) && request.graphql.warnings.length > 0) {
						if (!result.warnings)
							result.warnings = []
						result.warnings.push(...request.graphql.warnings.map(({ message, locations, path }) => ({ message, locations, path })))
					}

					// Transform final response based on potential middleware rules.
					if (request.graphql.transform)
						transformResult = r => Promise.resolve(null).then(() => request.graphql.transform(r))
				}

				// Format any encountered errors.
				if (result.errors && result.errors.length > 0) {
					const formattingError = formatErrorFn || graphql.formatError
					let explicitHttpCode
					result.errors = result.errors.reduce((acc, e) => {
						// 'newError' example: 
						// {
						//		message: '{"type":"graphql","httpCode":422,"message":"Failed to do something","alternateMessage":"Internal Server Error"}',
						//		locations: [ { line: 2, column: 3 } ],
						//		path: [ 'conditionUpdate' ]
						// }
						const newError = formattingError(e)
						// The block of code below reformats the 'newError.message' property
						try {
							const customError = JSON.parse(newError.message) || {}
							if (customError.type == 'graphql') {
								explicitHttpCode = customError.httpCode || 500
								if (customError.errors && Array.isArray(customError.errors))
									acc.push(...customError.errors)
								else
									acc.push({
										message:customError.hideErrors && customError.alternateMessage ? customError.alternateMessage : customError.message
									})
								
								return acc
							}
						} catch (err) {
							(() => null)(err)
						}

						acc.push(newError)
						return acc
					}, [])
					if (!explicitHttpCode && allPropertiesFalsy(result.data))
						httpCode = response.statusCode < 500 ? 500 : response.statusCode
					else if (explicitHttpCode)
						httpCode = explicitHttpCode
				}
			}
			
			const execute = showGraphiQL
				// If allowed to show GraphiQL, present it instead of JSON.
				? () => {
					const payload = renderGraphiQL({ query, variables, operationName, result, schemaAST, subscriptionsEndpoint, websocketConnectionParams }, graphiQlOptions)
					response.setHeader('Content-Type', 'text/html; charset=utf-8')
					sendResponse(response, payload, httpCode)
					return result
				}
				// Otherwise, present JSON directly. 
				: () => onResponse(request, response, result).catch(err => ({ _error: err, _location: 'Function \'optionsData.onResponse\'', _result: result }))
					.then(r => r._error ? r : transformResult(r).catch(err => ({ _error: err, _location: 'Function \'request.graphql.transform\'', _result: r }))).then(r => {
						let _result = r || result
						if (r && r._error) {
							_result = r._result
							if (!_result.errors) 
								_result.errors = []
							_result.errors.push({ message: `${r._error.message}\n${r._error.stack}`, location: r._location })
							httpCode = 500
						}

						const payload = JSON.stringify(_result, null, pretty ? 2 : 0)
						response.setHeader('Content-Type', 'application/json; charset=utf-8')
						sendResponse(response, payload, httpCode)
						return _result
					})
			
			return execute()
		}).catch(err => {
			console.log(err.stack)
			throw err
		})
	}
}

const allPropertiesFalsy = data => {
	let result = true
	if (data && typeof(data) == 'object')
		for (let k in data) {
			result = result && !data[k]
		}
	return result
}

const getParseDataFromUrl = req => {
	if (req.url){
		try {
			return url.parse(req.url, true).query
		}
		/*eslint-disable */
		catch(err) {
			return {}
		}
		/*eslint-enable */
	}
	else
		return {}
}

/**
 * Provided a "Request" provided by express or connect (typically a node style
 * HTTPClientRequest), Promise the GraphQL request parameters.
 */
function getGraphQLParams(request) {
	return parseBody(request).then(bodyData => {
		const data =
			request.graphql && request.graphql.query ? request.graphql :
				bodyData && bodyData.query ? bodyData : getParseDataFromUrl(request)

		return parseGraphQLParams(data)
	})
}

/**
 * Helper function to get the GraphQL params from the request.
 */
function parseGraphQLParams(data={}) {
	// GraphQL Query string.
	let query = data.query
	if (typeof query !== 'string') {
		query = null
	}

	// Parse the variables if needed.
	let variables = data.variables
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
	let operationName = data.operationName
	if (typeof operationName !== 'string') {
		operationName = null
	}
	const raw = data.raw !== undefined

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
function sendResponse(response, data, httpCode=200) {
	if (typeof response.send === 'function') {
		response.status(httpCode).send(data)
	} else {
		response.statusCode = httpCode
		response.end(data)
	}
}

const setupSubscriptions = (server, { schema, subscriptionsEndpoint }) => {
	if (!schema)
		throw new Error('\'schema\' is required.')
	if (!subscriptionsEndpoint)
		throw new Error('\'subscriptionsEndpoint\' is required.')
	const subServer = new SubscriptionServer({
		execute: graphql.execute,
		subscribe: graphql.subscribe,
		schema: schema
	}, {
		server,
		path: subscriptionsEndpoint.indexOf('ws:') == 0 ? subscriptionsEndpoint : `/${subscriptionsEndpoint.replace(/^\/*/, '')}`
	})
	console.log('WebSocket successfully set up for handling GraphQL subscriptions.'.cyan)
	return subServer
}

const isGraphiQLRequest = (req) => getGraphQLParams(req).then(params => canDisplayGraphiQL(req, params))

module.exports = {
	graphqlHandler,
	isGraphiQLRequest,
	graphqlError,
	setupSubscriptions
}