/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const httpMocks = require('node-mocks-http')
const { makeExecutableSchema } = require('graphql-tools')
const { HttpHandler } = require('../src/index')
const { serveHttp, app } = require('webfunc')

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 01', () => 
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

			app.reset()
			app.use(new HttpHandler({ schema: {} }))

			const fn = serveHttp(app.resolve({
				path: '/users/{graphiqlpath}',
				handlerId: 'graphql'
			}), appconfig)

			const result_01 = fn(req_01, res_01).then(({ req, res }) => {
				assert.equal(res.statusCode, 404)
				assert.equal(res._getData(), `Endpoint '/' for method GET not found.`)
			})

			return Promise.all([result_01])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 02', () => 
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

			app.reset()
			app.use(new HttpHandler({ schema: {}, endpointURL: '/graphiql' }))

			const fn = serveHttp(app.resolve({
				path: '/users/{username}',
				handlerId: 'graphql'
			}), appconfig)
			
			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01.statusCode, 200)
			})

			const result_02 = fn(req_02, res_02).then(() => {
				assert.equal(res_02.statusCode, 200)
			})

			return Promise.all([result_01, result_02])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 03', () => 
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

			app.reset()
			app.use(new HttpHandler({ schema: {} }))
			
			const fn = serveHttp(app.resolve({ handlerId: 'graphql' }), appconfig)
			
			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01.statusCode, 200)
			})
			
			const result_02 = fn(req_02, res_02).then(() => {
				assert.equal(res_02.statusCode, 200)
			})

			return Promise.all([result_01, result_02])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 04', () => 
		it(`Should serve a graphiql interface`, () => {
			/*eslint-enable */

			const schema = `
			type Product {
				id: ID!
				name: String!
				shortDescription: String
			}

			type Query {
				# ### GET products
				#
				# _Arguments_
				# - **id**: Product's id (optional)
				products(id: Int): [Product]
			}

			schema {
				query: Query
			}
			`
			const productMocks = [{ id: 1, name: 'Product A', shortDescription: 'First product.' }, { id: 2, name: 'Product B', shortDescription: 'Second product.' }]
			const productResolver = {
				Query: {
					products(root, { id }, context) {
						const results = id ? productMocks.filter(p => p.id == id) : productMocks
						if (results)
							return results
						else
							throw httpError(404, `Product with id ${id} does not exist.`)
					}
				}
			}

			const executableSchema = makeExecutableSchema({
				typeDefs: schema,
				resolvers: productResolver
			})

			const graphqlOptions = {
				schema: executableSchema,
				graphiql: true,
				endpointURL: "/graphiql"
			}

			app.reset()
			app.use(new HttpHandler(graphqlOptions))

			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080',
					accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
				},
				_parsedUrl: {
					pathname: '/users/graphiql'
				},
				url: '/users/graphiql'
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
			
			const fn = serveHttp(app.resolve({ 
				path: '/users',
				handlerId: 'graphql' 
			}), appconfig)

			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01.statusCode, 200)
				const headers = res_01._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
				const html = res_01._getData()
				assert.isOk(html)
				assert.equal(typeof(html), 'string')
				assert.isOk(html.indexOf('// Render <GraphiQL /> into the body.') > 0, 'The response does not return a GraphiQL HTML.')
				//assert.equal(res_01._getData(),'Hello nicolas dao')
			})

			return Promise.all([result_01])
 		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 05', () => 
		it(`Should fail to serve any query if the graphiql is toggled but the path to access it is wrong.`, () => {
			/*eslint-enable */

			const schema = `
			type Product {
				id: ID!
				name: String!
				shortDescription: String
			}

			type Query {
				# ### GET products
				#
				# _Arguments_
				# - **id**: Product's id (optional)
				products(id: Int): [Product]
			}

			schema {
				query: Query
			}
			`
			const productMocks = [{ id: 1, name: 'Product A', shortDescription: 'First product.' }, { id: 2, name: 'Product B', shortDescription: 'Second product.' }]
			const productResolver = {
				Query: {
					products(root, { id }, context) {
						const results = id ? productMocks.filter(p => p.id == id) : productMocks
						if (results)
							return results
						else
							throw httpError(404, `Product with id ${id} does not exist.`)
					}
				}
			}

			const executableSchema = makeExecutableSchema({
				typeDefs: schema,
				resolvers: productResolver
			})

			const graphqlOptions = {
				schema: executableSchema,
				graphiql: true,
				endpointURL: "/graphiql"
			}

			app.reset()
			app.use(new HttpHandler(graphqlOptions))

			const uri = 'users/graphiql'
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080',
					accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
				},
				_parsedUrl: {
					pathname: uri
				},
				url: uri,
				body: { 
					query: `
						query {
							products(id: 1) {
								name
							}
						}`,
					variables: null 
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
			
			const fn = serveHttp(app.resolve({ 
				path: '/',
				handlerId: 'graphql' 
			}), appconfig)

			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01.statusCode, 200)
				const headers = res_01._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
				const html = res_01._getData()
				assert.isOk(html)
				assert.equal(typeof(html), 'string')
				let htmlJson
				try {
					htmlJson = JSON.parse(html)
				}
				catch(err) {
					assert.isOk(err)
					htmlJson = null
				}
				assert.isOk(htmlJson, 'There should be a JSON response.')
				assert.isOk(htmlJson.errors, `There should be a JSON response with an 'errors' property.`)
				assert.isOk(htmlJson.errors.length > 0, `The 'errors' property of the JSON response should be an array with at least one element.`)
				assert.equal(htmlJson.errors[0].message, `No GraphiQL endpoint found at 'users/graphiql'.`)
			})

			return Promise.all([result_01])
		})))

/*eslint-disable */
describe('index', () => 
	describe('#serveHTTP: 06', () => 
		it(`Should serve GraphQL queries`, () => {
			/*eslint-enable */

			const schema = `
			type Product {
				id: ID!
				name: String!
				shortDescription: String
			}

			type Query {
				# ### GET products
				#
				# _Arguments_
				# - **id**: Product's id (optional)
				products(id: Int): [Product]
			}

			schema {
				query: Query
			}
			`
			const productMocks = [{ id: 1, name: 'Product A', shortDescription: 'First product.' }, { id: 2, name: 'Product B', shortDescription: 'Second product.' }]
			const productResolver = {
				Query: {
					products(root, { id }, context) {
						const results = id ? productMocks.filter(p => p.id == id) : productMocks
						if (results)
							return results
						else
							throw httpError(404, `Product with id ${id} does not exist.`)
					}
				}
			}

			const executableSchema = makeExecutableSchema({
				typeDefs: schema,
				resolvers: productResolver
			})

			const graphqlOptions = {
				schema: executableSchema,
				graphiql: true,
				endpointURL: "/graphiql"
			}

			app.reset()
			app.use(new HttpHandler(graphqlOptions))

			const uri = 'users/graphiql'
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080',
					accept: 'application/json'
				},
				_parsedUrl: {
					pathname: uri
				},
				url: uri,
				body: { 
					query: `
						query {
							products(id: 1) {
								name
							}
						}`,
					variables: null 
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
			
			const fn = serveHttp(app.resolve({ 
				path: '/users',
				handlerId: 'graphql' 
			}), appconfig)

			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01.statusCode, 200)
				const headers = res_01._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
				const html = res_01._getData()
				assert.isOk(html)
				assert.equal(typeof(html), 'string')
				let htmlJson
				try {
					htmlJson = JSON.parse(html)
				}
				catch(err) {
					assert.isOk(err)
					htmlJson = null
				}
				assert.isOk(htmlJson, `Response should be a json object.`)
				assert.isOk(htmlJson.data, `Response should be a json object with a defined 'data' property.`)
				assert.isOk(htmlJson.data.products, `Response should be a json object with a defined 'data.products' property.`)
				assert.isOk(htmlJson.data.products.length > 0, `Response's 'data.products' must be an array with at least one element.`)
				assert.equal(htmlJson.data.products[0].name, 'Product A')
			})

			return Promise.all([result_01])
		})))




