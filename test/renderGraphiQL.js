/**
 * Copyright (c) 2018, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const { stringifyFnBody, getFuncArgNames } = require('../src/renderGraphiQL')

/*eslint-disable */
describe('renderGraphiQL', () => 
	describe('#stringifyFnBody:', () => 
		it(`Should stringigy the body of any js function, supporting both standard functions and arrow functions.`, () => {
			/*eslint-enable */
			const arrowFn_01 = () => {
				var t = 1
				return 1 + t + 1
			}

			const arrowFn_02 = (x) => {
				var t = 1
				return x + t + 1
			}

			const arrowFn_03 = (x, y) => {
				var t = 1
				return x + y + t
			}

			const arrowFn_04 = x => {
				var t = 1
				return x + t + 1
			}

			function fn_01() {
				var t = 1
				return 1 + t + 1
			}

			function fn_02(x) {
				var t = 1
				return x + t + 1
			}

			function fn_03(x, y) {
				var t = 1
				return x + y + t
			}

			const execute = body => eval(`
			function test(x,y) {
				${body}
			}
			test(1,1)
			`)

			assert.equal(execute(stringifyFnBody(arrowFn_01)), 3, 'Error in arrowFn_01')
			assert.equal(execute(stringifyFnBody(arrowFn_02)), 3, 'Error in arrowFn_02')
			assert.equal(execute(stringifyFnBody(arrowFn_03)), 3, 'Error in arrowFn_03')
			assert.equal(execute(stringifyFnBody(arrowFn_04)), 3, 'Error in arrowFn_04')
			assert.equal(execute(stringifyFnBody(fn_01)), 3, 'Error in fn_01')
			assert.equal(execute(stringifyFnBody(fn_02)), 3, 'Error in fn_02')
			assert.equal(execute(stringifyFnBody(fn_03)), 3, 'Error in fn_03')

		})))

/*eslint-disable */
describe('renderGraphiQL', () => 
	describe('#getFuncArgNames:', () => 
		it(`Should returns the arguments names of any js function, supporting both standard functions and arrow functions.`, () => {
			/*eslint-enable */
			const arrowFn_01 = () => {
				var t = 1
				return 1 + t + 1
			}

			const arrowFn_02 = (x) => {
				var t = 1
				return x + t + 1
			}

			const arrowFn_03 = (x, y) => {
				var t = 1
				return x + y + t
			}

			const arrowFn_04 = x => {
				var t = 1
				return x + t + 1
			}

			function fn_01() {
				var t = 1
				return 1 + t + 1
			}

			function fn_02(x) {
				var t = 1
				return x + t + 1
			}

			function fn_03(x, y) {
				var t = 1
				return x + y + t
			}

			assert.equal(getFuncArgNames(arrowFn_01).join(',') ,'', 'Error in arrowFn_01')
			assert.equal(getFuncArgNames(arrowFn_02).join(',') ,'x', 'Error in arrowFn_02')
			assert.equal(getFuncArgNames(arrowFn_03).join(',') ,'x,y', 'Error in arrowFn_03')
			assert.equal(getFuncArgNames(arrowFn_04).join(',') ,'x', 'Error in arrowFn_04')
			assert.equal(getFuncArgNames(fn_01).join(',') ,'', 'Error in fn_01')
			assert.equal(getFuncArgNames(fn_02).join(',') ,'x', 'Error in fn_02')
			assert.equal(getFuncArgNames(fn_03).join(',') ,'x,y', 'Error in fn_03')

		})))