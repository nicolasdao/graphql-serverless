<a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_black_small_logo.png" alt="Neap Pty Ltd logo" title="Neap" align="right" height="50" width="120"/></a>

# GraphQL For Serverless
#### (Google Cloud Functions & Firebase (AWS Lambda coming soon...))
[![NPM][1]][2] [![Tests][3]][4]

[1]: https://img.shields.io/npm/v/graphql-serverless.svg?style=flat
[2]: https://www.npmjs.com/package/graphql-serverless
[3]: https://travis-ci.org/nicolasdao/graphql-serverless.svg?branch=master
[4]: https://travis-ci.org/nicolasdao/graphql-serverless

The easiest way to start a GraphQL API (including an optional GraphiQL interface) hosted on either Google Cloud Functions or Firebase Functions (AWS Lambda coming soon). _**graphql-serverless**_ is a HTTP handler for [_**webfunc**_](https://github.com/nicolasdao/webfunc), a lightweight serverless web framework.

_**Why this project?**_ We just wanted to start any pro-project or personal project in less than 1 minute; from your dev. machine to a live server. We also wanted a hosting environment that could scale and have a solid free tier offering. That explains why we choosed Google Cloud Functions as our first hosting environment (Firebase was a natural progression but its free tier is more restrictive).

## How To Use It
First make sure you have all the [deployment tools required to deploy your project](#deployment-prerequisites). Then, you can either install it using a template (the easiest and fastest way), or by manually including it in one of your own serverless project. 
### Install Using A Template
Simply use [_**gimpy**_](https://github.com/nicolasdao/gimpy). If you haven't installed it yet, run ```npm install gimpy -g```.
```
gimp new graphql-serverless your-app 
cd your-app
npm install
gimp deploy
```

gimpy will ask you a few questions that you are free to ignore if you don't intend to host it in a serverless environment just yet. ```gimp deploy``` will simply deploy your _hello world_ GraphQL API locally. 

If you have ansewered the questions about your serverless hosting environment, then you can simply run the following to deploy it there:
```
gimp deploy build
``` 

### Install Inside Your Own Serverless Project 

```
npm install webfunc graphql-serverless --save
```
In your _index.js_ code:

```js
const { makeExecutableSchema } = require('graphql-tools')
const { HttpHandler } = require('graphql-serverless')
const { serveHttp, app } = require('webfunc')

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
  }`

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

app.use(new HttpHandler(graphqlOptions))

exports.main = serveHttp(app.resolve({ path: '/', handlerId: 'graphql' }))
```


## Contributing
```
npm test
```

## This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

## Annexes
### Deployment Prerequisites
Make sure you have the following tools installed on your local machine:

_**To host using Google Cloud Functions:**_
- [gcloud](https://cloud.google.com/sdk/gcloud/) - Needed to run the local emulator as well as to deploy your function to Google Cloud.
- gcloud beta components - As of August 2017, Google Cloud Functions is still in beta, so you need the beta components.
  ```gcloud components install beta```
- [Google Cloud Functions Emulator](https://github.com/GoogleCloudPlatform/cloud-functions-emulator) - Needed to run your project locally.
  ```npm install -g @google-cloud/functions-emulator```

_**To host using Google Firebase Functions:**_
- [firebase-tools](https://github.com/firebase/firebase-tools) - Needed to run your project locally as well as to deploy it to firebase.
  ```npm install -g firebase-tools```


## License
Copyright (c) 2017, Neap Pty Ltd.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Neap Pty Ltd nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL NEAP PTY LTD BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
