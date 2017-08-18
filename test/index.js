/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const httpMocks = require('node-mocks-http')
const { serveHTTP } = require('../src/index')

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 01', () => 
		it(`Should fail at build time if bad arguments are passed to the 'serveHTTP' method.`, () => {
			/*eslint-enable */
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const endpoints = [1,2]

			assert.throws(() => serveHTTP('/users/{username}', endpoints, appconfig), Error, `If the first argument of the 'serveHTTP' method is a route, then the second argument of the 'serveHTTP' method cannot be an array. It must either be a route, a graphQL options object, or a function similar to (req, res, params) => ... that returns a graphQL option object or a promise returning a graphql object.`)
			assert.throws(() => serveHTTP('/users/{username}', appconfig), Error, `If the first argument of the 'serveHTTP' method is a route and the second a graphQL object, then the second argument must contain a valid property called 'schema'.`)
			assert.throws(() => serveHTTP(), Error, `The first argument of the 'serveHTTP' method is required. It must either be a route, a graphQL options object, or a function similar to (req, res, params) => ... that returns a graphQL option object or a promise returning a graphql object.`)
			assert.throws(() => serveHTTP(appconfig), Error, `If the first argument of the 'serveHTTP' method is a graphQL object, then it must contain a valid property called 'schema'.`)
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 02', () => 
		it(`Should fail if the query does not match the specified routing.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/'
				}
			})
			const res_01 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const fn = serveHTTP('/users/{graphiqlpath}', { schema: {} }, appconfig)
			
			const result_01 = fn(req_01, res_01).then(res => {
				assert.equal(res.statusCode, 404)
				assert.equal(res._getData(), 'Endpoint \'/\' not found.')
			})
				.catch(err => assert.equal(1,2, `Should fail but still return a response.`))

			return Promise.all([result_01])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 03', () => 
		it(`Should succeed if the query matches the specified routing.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users/nicolas/graphiql'
				}
			})
			const res_01 = httpMocks.createResponse()
			const req_02 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users/brendan/graphiql'
				}
			})
			const res_02 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const fn = serveHTTP('/users/{username}', { schema: {}, endpointURL: '/graphiql' }, appconfig)
			
			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(1,1)
			})
				.catch(() => assert.equal(1,2, `This request should have succeeded.`))

			const result_02 = fn(req_02, res_02).then(() => {
				assert.equal(1,1)
			})
				.catch(() => assert.equal(1,2, `This request should have succeeded.`))

			return Promise.all([result_01])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 04', () => 
		it(`Should succeed regardless of the resource required if no routing is defined.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users/graphiql'
				}
			})
			const res_01 = httpMocks.createResponse()
			const req_02 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res_02 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const fn = serveHTTP({ schema: {} }, appconfig)
			
			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(1,1)
			})
				.catch(() => assert.equal(1,2, `This request should have succeeded.`))
			
			const result_02 = fn(req_02, res_02).then(() => {
				assert.equal(1,1)
			})
				.catch(() => assert.equal(1,2, `This request should have succeeded.`))

			return Promise.all([result_01, result_02])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 05', () => 
		it(`Should succeed if the first argument if a function returning either a graphQl option object or a Promise that returns a graphQL option object.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users/graphiql'
				}
			})
			const res_01 = httpMocks.createResponse()
			const req_02 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res_02 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const fn_01 = serveHTTP(() => { schema: {} }, appconfig)
			const fn_02 = serveHTTP(() => Promise.resolve({ schema: {} }), appconfig)
			
			const result_01 = fn_01(req_01, res_01).then(() => {
				assert.equal(1,1)
			})
				.catch(() => assert.equal(1,2, `This request should have succeeded.`))
			
			const result_02 = fn_02(req_02, res_02).then(() => {
				assert.equal(1,1)
			})
				.catch(() => assert.equal(1,2, `This request should have succeeded.`))

			return Promise.all([result_01, result_02])
		})))