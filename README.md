# GraphQL For Serverless &middot;  [![NPM](https://img.shields.io/npm/v/graphql-serverless.svg?style=flat)](https://www.npmjs.com/package/graphql-serverless) [![Tests](https://travis-ci.org/nicolasdao/graphql-serverless.svg?branch=master)](https://travis-ci.org/nicolasdao/graphql-serverless) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)

__*graphql-serverless*__ is a middleware for [_**webfunc**_](https://github.com/nicolasdao/webfunc), that allows to deploy [GraphQL](http://graphql.org/learn/) apis (including an optional [GraphiQL interface](https://github.com/graphql/graphiql)) to the most popular serverless platforms:
- [Zeit Now](https://zeit.co/now) (using express under the hood)
- [Google Cloud Functions](https://cloud.google.com/functions/) (incl. Firebase Function)
- [AWS Lambdas](https://aws.amazon.com/lambda) (COMING SOON...)
- [Azure Functions](https://azure.microsoft.com/en-us/services/functions/) (COMING SOON...)

Copy/paste the following in your terminal if you want to run your first GraphQL api ([http://localhost:4000](http://localhost:4000)) including a GraphiQL interface ([http://localhost:4000/graphiql](http://localhost:4000/graphiql)) on your local machine in less than 30 seconds:

```
git clone https://github.com/nicolasdao/graphql-universal-server.git; \
cd graphql-universal-server; \
npm install; \
npm start 
```

This will serve 2 endpoints:

- [http://localhost:4000](http://localhost:4000): This is the GraphQL endpoint that your client can start querying.
- [http://localhost:4000/graphiql](http://localhost:4000/graphiql): This is the GraphiQL Web UI that you can use to test and query your GraphQL server. 

Deploying that api to [Zeit Now](https://zeit.co/now) will take between 15 seconds to 1.5 minute (depending on whether you need to login/creating a free Zeit account or not).

_If you haven't installed Zeit now-CLI yet or you need to login/create an account, then copy/paste this in your terminal:_
```
npm install now -g; \
now login; \
npm run deploy:prod
```

The above will work the exact same way whether you have an account or not. This is free, so don't worry about it.

_If you're already logged in, then simply run this:_
```
npm run deploy:prod
```

# Install
```
npm install webfunc graphql-serverless --save
```

# How To Use It
Using the template above (i.e. [graphql-universal-server](https://github.com/nicolasdao/graphql-universal-server.git)) is the easiest way to start a new GraphQL project from scratch. However, if you really want to start on a blank page, simply create an index.js as follow:

```js
const { graphqlHandler } = require('graphql-serverless')
const { app } = require('webfunc')
const { makeExecutableSchema } = require('graphql-tools') // this dependency is automatically included in 'graphql-serverless'

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
  endpointURL: '/graphiql',
  context: {} // add whatever global context is relevant to you app
}

app.all(['/', '/graphiql'], graphqlHandler(graphqlOptions), () => null)

eval(app.listen('app', 4000))
```

Then simply run:
```
node index.js
```

This will serve 2 endpoints:

- [http://localhost:4000](http://localhost:4000): This is the GraphQL endpoint that your client can start querying.
- [http://localhost:4000/graphiql](http://localhost:4000/graphiql): This is the GraphiQL Web UI that you can use to test and query your GraphQL server. 

>If you need best practices on how to structure your GraphQL project, clone the [graphql-universal-server](https://github.com/nicolasdao/graphql-universal-server.git) project and see by yourself. 

## Contributing
```
npm test
```

# This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

Our other open-sourced projects:
#### Web Framework & Deployment Tools
* [__*webfunc*__](https://github.com/nicolasdao/webfunc): Write code for serverless similar to Express once, deploy everywhere. 
* [__*now-flow*__](https://github.com/nicolasdao/now-flow): Automate your Zeit Now Deployments.

#### GraphQL
* [__*graphql-serverless*__](https://github.com/nicolasdao/graphql-serverless): GraphQL (incl. a GraphiQL interface) middleware for [webfunc](https://github.com/nicolasdao/webfunc).
* [__*schemaglue*__](https://github.com/nicolasdao/schemaglue): Naturally breaks down your monolithic graphql schema into bits and pieces and then glue them back together.
* [__*graphql-s2s*__](https://github.com/nicolasdao/graphql-s2s): Add GraphQL Schema support for type inheritance, generic typing, metadata decoration. Transpile the enriched GraphQL string schema into the standard string schema understood by graphql.js and the Apollo server client.

#### React & React Native
* [__*react-native-game-engine*__](https://github.com/bberak/react-native-game-engine): A lightweight game engine for react native.
* [__*react-native-game-engine-handbook*__](https://github.com/bberak/react-native-game-engine-handbook): A React Native app showcasing some examples using react-native-game-engine.

#### Tools
* [__*aws-cloudwatch-logger*__](https://github.com/nicolasdao/aws-cloudwatch-logger): Promise based logger for AWS CloudWatch LogStream.


# License
Copyright (c) 2018, Neap Pty Ltd.
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

<p align="center"><a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200"/></a></p>