/**
 * Copyright (c) 2017, Neap pty ltd.
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

const contentType = require('content-type')
const getBody = require('raw-body')
const httpError = require('http-errors')
const querystring = require('querystring')
const zlib = require('zlib')

/**
 * Provided a "Request" provided by express or connect (typically a node style
 * HTTPClientRequest), Promise the body data contained.
 */
module.exports = function parseBody(req) {
	return new Promise((resolve, reject) => {
		const body = req.body

		// If express has already parsed a body as a keyed object, use it.
		/*eslint-disable */
		if (typeof body === 'object' && !(body instanceof Buffer)) {
			return resolve((body))
		}
		/*eslint-enable */

		// Skip requests without content types.
		if (req.headers['content-type'] === undefined) {
			return resolve({})
		}

		const typeInfo = contentType.parse(req)

		// If express has already parsed a body as a string, and the content-type
		// was application/graphql, parse the string body.
		if (typeof body === 'string' && typeInfo.type === 'application/graphql') {
			return resolve(graphqlParser(body))
		}

		// Neap Pty Ltd: Add support for text/plain
		if (typeof body === 'string' && typeInfo.type === 'text/plain') {
			try {
				const parsedBody = JSON.parse(body)
				return resolve(parsedBody)
			}
			catch(err) {
				/*eslint-disable */
				console.log(`Error in method 'parseBody' in 'google-graphql-functions/parseBody.js': Fail to JSON parse body ${body}. Details: ${err}`)
				/*eslint-enable */
			}
		}

		// Already parsed body we didn't recognise? Parse nothing.
		if (body) {
			return resolve({})
		}

		// Use the correct body parser based on Content-Type header.
		switch (typeInfo.type) {
		case 'application/graphql':
			return read(req, typeInfo, graphqlParser, resolve, reject)
		case 'application/json':
			return read(req, typeInfo, jsonEncodedParser, resolve, reject)
		case 'application/x-www-form-urlencoded':
			return read(req, typeInfo, urlEncodedParser, resolve, reject)
		}

		// If no Content-Type header matches, parse nothing.
		return resolve({})
	})
}

function jsonEncodedParser(body) {
	if (jsonObjRegex.test(body)) {
		/* eslint-disable no-empty */
		try {
			return JSON.parse(body)
		} catch (error) {
			// Do nothing
		}
		/* eslint-enable no-empty */
	}
	throw httpError(400, 'POST body sent invalid JSON.')
}

function urlEncodedParser(body) {
	return querystring.parse(body)
}

function graphqlParser(body) {
	return { query: body }
}

/*eslint-disable */
/**
 * RegExp to match an Object-opening brace "{" as the first non-space
 * in a string. Allowed whitespace is defined in RFC 7159:
 *
 *     x20  Space
 *     x09  Horizontal tab
 *     x0A  Line feed or New line
 *     x0D  Carriage return
 */
const jsonObjRegex = /^[\x20\x09\x0a\x0d]*\{/
/*eslint-enable */

// Read and parse a request body.
function read(req, typeInfo, parseFn, resolve, reject) {
	const charset = (typeInfo.parameters.charset || 'utf-8').toLowerCase()

	// Assert charset encoding per JSON RFC 7159 sec 8.1
	if (charset.slice(0, 4) !== 'utf-') {
		throw httpError(415, `Unsupported charset "${charset.toUpperCase()}".`)
	}

	// Get content-encoding (e.g. gzip)
	const contentEncoding = req.headers['content-encoding']
	const encoding = typeof contentEncoding === 'string' ?
		contentEncoding.toLowerCase() :
		'identity'
	const length = encoding === 'identity' ? req.headers['content-length'] : null
	const limit = 100 * 1024 // 100kb
	const stream = decompressed(req, encoding)

	// Read body from stream.
	getBody(stream, { encoding: charset, length, limit }, (err, body) => {
		if (err) {
			return reject(
				err.type === 'encoding.unsupported' ?
					httpError(415, `Unsupported charset "${charset.toUpperCase()}".`) :
					httpError(400, `Invalid body: ${err.message}.`)
			)
		}

		try {
			// Decode and parse body.
			return resolve(parseFn(body))
		} catch (error) {
			return reject(error)
		}
	})
}

// Return a decompressed stream, given an encoding.
function decompressed(req, encoding) {
	switch (encoding) {
	case 'identity':
		return req
	case 'deflate':
		return req.pipe(zlib.createInflate())
	case 'gzip':
		return req.pipe(zlib.createGunzip())
	}
	throw httpError(415, `Unsupported content-encoding "${encoding}".`)
}
