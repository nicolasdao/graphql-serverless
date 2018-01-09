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
 *	Copyright (c) 2015, Facebook, Inc.
 *	All rights reserved.
 *
 *	This source code is licensed under the BSD-style license found in the
 *	LICENSE file in the root directory of this source tree. An additional grant
 *	of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict'

Object.defineProperty(exports, '__esModule', {
	value: true
})

// Current latest version of GraphiQL.
// var GRAPHIQL_VERSION = '0.11.2'

// Ensures string values are safe to be used within a <script> tag.

function safeSerialize(data) {
	return data ? JSON.stringify(data).replace(/\//g, '\\/') : 'undefined'
}

const getFuncArgNames = fn => {
	if (fn && typeof(fn) == 'function') {
		const fnStr = fn.toString().trim()
		const arrowFn = fnStr.indexOf('function ') != 0
		if (arrowFn) {
			const arrowFnLeft = fnStr.split('=>')[0].trim()
			// single argument function with no parenthesis (e.g. x => ...)
			return arrowFnLeft.indexOf('(') != 0 
				? [arrowFnLeft]
				// Zero, one or many arguments function (e.g. () => ... or (x) => ... or (x,y,z) => ....)
				: arrowFnLeft.replace(/\(|\)/g,'').split(',').map(x => x.trim()).filter(x => x)
		}
		else
			return ((fnStr.match(/\((.*?)\)/) || [])[0] || '').replace(/\(|\)/g,'').split(',').map(x => x.trim()).filter(x => x)
	}
	else
		return []
}

const stringifyFnBody = fn => {
	if (fn && typeof(fn) == 'function') {
		const fnStr = fn.toString().trim()
		const stdFuncStyle = fnStr.indexOf('function ') == 0
		let body
		if (stdFuncStyle)
			body = fnStr.replace(/\s*function\s*(.*?){/,'').trim()
		else {
			const arrowFnLeft = fnStr.split('=>')[0].trim()
			body = arrowFnLeft.indexOf('(') != 0 
				? fnStr.replace(/(.*?)=>\s*/, '')
				: fnStr.replace(/^\s*\((.*?)\)\s*=>\s*/, '').trim()
		}

		const bodyStartsWithCurlyBracket = body.indexOf('{') == 0
		// Remove trailing curly bracket
		if (stdFuncStyle || bodyStartsWithCurlyBracket)
			body = body.replace(/}$/,'')

		// Remove opening curly bracket
		if (bodyStartsWithCurlyBracket)
			body = body.replace(/^{/,'')

		return body
	}
	else
		return null
}

const scriptifyFunc = fn => {
	const jsCode = stringifyFnBody(fn)
	return jsCode ? `<script>\n${jsCode}\n</script>` : ''
}

/**
 * When express-graphql receives a request which does not Accept JSON, but does
 * Accept HTML, it may present GraphiQL, the in-browser GraphQL explorer IDE.
 *
 * When shown, it will be pre-populated with the result of having executed the
 * requested query.
 */
const renderGraphiQL = (data, custom={}) => {
	var queryString = data.query
	var variablesString = data.variables ? JSON.stringify(data.variables, null, 2) : null
	var resultString = data.result ? JSON.stringify(data.result, null, 2) : null
	var operationName = data.operationName

	const head = custom.head || {}
	const cssFiles = []
	const scriptFiles = []
	cssFiles.push(head.graphiqlCss || '//cdn.jsdelivr.net/npm/graphiql@0.11.2/graphiql.css')
	scriptFiles.push(head.fetchJs || '//cdn.jsdelivr.net/fetch/0.9.0/fetch.min.js')
	scriptFiles.push(head.reactJs || '//cdn.jsdelivr.net/react/15.4.2/react.min.js')
	scriptFiles.push(head.reactDomJs || '//cdn.jsdelivr.net/react/15.4.2/react-dom.min.js')
	scriptFiles.push(head.graphiqlJs || '//cdn.jsdelivr.net/npm/graphiql@0.11.2/graphiql.min.js')

	const pageTitle = head.title || 'GraphiQL'
	const customScript = scriptifyFunc(custom.script)
	const onRequest = stringifyFnBody(custom.onRequest) || 'return headers'
	const onRequestArgs = getFuncArgNames(custom.onRequest).join(',') || 'headers'

	const headScriptsAndCss = `
		${head.custom || ''}
		${cssFiles.map(f => `<link href="${f}"  rel="stylesheet" />`).join('\n		')}
		${scriptFiles.map(f => `<script src="${f}"></script>`).join('\n		')}`

	/* eslint-disable max-len */
	return `<!--
	The request to this GraphQL server provided the header "Accept: text/html"
	and as a result has been presented GraphiQL - an in-browser IDE for
	exploring GraphQL.

	If you wish to receive JSON, provide the header "Accept: application/json" or
	add "&raw" to the end of the URL within a browser.
	-->
	<!DOCTYPE html>
	<html>
	<head>
		<meta charset="utf-8" />
		<title>${pageTitle}</title>
		<meta name="robots" content="noindex" />
		<style>
			html, body {
				height: 100%;
				margin: 0;
				overflow: hidden;
				width: 100%;
			}
		</style>
			${headScriptsAndCss}
		</head>
	<body>
		${customScript}
		<script>
			// Collect the URL parameters
			var parameters = {};
			window.location.search.substr(1).split('&').forEach(function (entry) {
				var eq = entry.indexOf('=');
				if (eq >= 0) {
					parameters[decodeURIComponent(entry.slice(0, eq))] =
					 decodeURIComponent(entry.slice(eq + 1));
				}
			});

			// Produce a Location query string from a parameter object.
			function locationQuery(params) {
				return '?' + Object.keys(params).filter(function (key) {
					return Boolean(params[key]);
				}).map(function (key) {
					return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
				}).join('&');
			}

			// Derive a fetch URL from the current URL, sans the GraphQL parameters.
			var graphqlParamNames = {
				query: true,
				variables: true,
				operationName: true
			};

			var otherParams = {};
			for (var k in parameters) {
				if (parameters.hasOwnProperty(k) && graphqlParamNames[k] !== true) {
					otherParams[k] = parameters[k];
				}
			}
			var fetchURL = locationQuery(otherParams);

			function updateHeaders(${onRequestArgs}) {
				${onRequest}
			}

			function getHeaders() {
				return updateHeaders({
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				})
			}

			// Defines a GraphQL fetcher using the fetch API.
			function graphQLFetcher(graphQLParams) {
				return fetch(fetchURL, {
					method: 'post',
					headers: getHeaders(),
					body: JSON.stringify(graphQLParams),
					credentials: 'include',
				}).then(function (response) {
					return response.text();
				}).then(function (responseBody) {
					try {
						return JSON.parse(responseBody);
					} catch (error) {
						return responseBody;
					}
				});
			}

			// When the query and variables string is edited, update the URL bar so
			// that it can be easily shared.
			function onEditQuery(newQuery) {
				parameters.query = newQuery;
				updateURL();
			}

			function onEditVariables(newVariables) {
			parameters.variables = newVariables;
			updateURL();
			}

			function onEditOperationName(newOperationName) {
			parameters.operationName = newOperationName;
			updateURL();
			}

			function updateURL() {
			history.replaceState(null, null, locationQuery(parameters));
			}

			// Render <GraphiQL /> into the body.
			ReactDOM.render(
			React.createElement(GraphiQL, {
				fetcher: graphQLFetcher,
				onEditQuery: onEditQuery,
				onEditVariables: onEditVariables,
				onEditOperationName: onEditOperationName,
				query: ${safeSerialize(queryString)},
				response: ${safeSerialize(resultString)},
				variables: ${safeSerialize(variablesString)},
				operationName: ${safeSerialize(operationName)},
			}),
			document.body
			);
		</script>
		</body>
	</html>`
}


module.exports = {
	renderGraphiQL,
	stringifyFnBody,
	getFuncArgNames
}