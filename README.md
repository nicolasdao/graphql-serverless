<a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_black_small_logo.png" alt="Neap Pty Ltd logo" title="Neap" align="right" height="50" width="120"/></a>

# GraphQL For Google Cloud Functions & Firebase (AWS Lambda coming soon...)
[![NPM][1]][2] [![Tests][3]][4]

[1]: https://img.shields.io/npm/v/google-graphql-functions.svg?style=flat
[2]: https://www.npmjs.com/package/google-graphql-functions
[3]: https://travis-ci.org/nicolasdao/google-graphql-functions.svg?branch=master
[4]: https://travis-ci.org/nicolasdao/google-graphql-functions

## Install
Using npm in an existing Google Cloud Functions project:
```bash
npm install graphql graphql-serverless --save
```
Or, using [_**gimpy**_](https://github.com/nicolasdao/gimpy) to initialize a brand new project:
```
gimp new graphql-gcf your-app
```
After answering all the questions
```
cd your-app
npm install
gimp deploy
```
This will start your local [google cloud functions emulator](https://github.com/GoogleCloudPlatform/cloud-functions-emulator) and host it there.

## Table Of Contents
* [TL;DR](#tldr)
* [Overview](#overview)
* [Step A - Configure Your Google Cloud Functions Environment](#step-a---create-a-new-google-cloud-functions-on-gcp)
* [Step B - Configure Your Local Machine](#step-b---configure-your-local-machine)
* [Step C - Create & Deploy your GraphQl dummy API](#step-c---create--deploy-your-graphql-dummy-api-to-your-local-machine)
* [This Is What We re Up To](#this-is-what-we-re-up-to)
* [Annexes](#annexes)
  - [A.1. Options Details](#a1-options-details)
  - [A.2. List Of Dependencies](#a2-list-of-dependencies)
  - [A.3. GraphQl Code Details](#a3-graphql-code-details)
  - [A.4. Why You Need To Add ``` npm dedupe ``` As a Post Install Hook](#a4-why-you-need-to-add-npm-dedupe-as-a-post-install-hook)
* [License](#license)

## TL;DR
If you're already familiar with Google Cloud Functions, GraphQl, and GraphiQl, then this TL;DR might be good enough. Otherwise, jump to the next [Overview](#overview) section, and follow each steps. 

If you're totally unfamiliar with GraphQl, here is a series of intro posts that might be useful to provide some context:
- [GraphQL Overview - Getting Started with GraphQL and Node.js](https://blog.risingstack.com/graphql-overview-getting-started-with-graphql-and-nodejs/)
- [Introduction to GraphQL](http://graphql.org/learn/)

If you're starting from standard Google Cloud Functions project, in your index.js:

Replace:
```js
exports.helloWorld = function(req, res) { ... }
```
with:
```js
const { serveHTTP } = require('google-graphql-functions')

const executableSchema = ... // schema you should have built using the standard graphql.js or Apollo's graphql-tools.js.
const graphqlOptions = {
    schema: executableSchema, 
    graphiql: true,
    endpointURL: "/graphiql"
}

exports.helloWorld = serveHTTP(graphqlOptions)
```
If you need to support CORS, add a _**appconfig.json**_ file under your project's root folder and add a configuration similar to the following:
```js
{
  "headers": {
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Max-Age": "1296000"
  }
}
```

Google-graphql-functions is built on top of the [_**webfunc**_](https://github.com/nicolasdao/webfunc) package. [_**webfunc**_](https://github.com/nicolasdao/webfunc) is a lightweight HTTP handler & project environment variables manager. For more details on how to configure its _appconfig.json_ file, please visit its GitHub page [here](https://github.com/nicolasdao/webfunc). 

If you're using [_**gimpy**_](https://github.com/nicolasdao/gimpy), you can also initiate a new GraphQL project ready to be hosted on Google Cloud Functions as follow:
```
gimp new graphql-gcf your-app
```
After answering all the questions
```
cd your-app
npm install
gimp deploy
```

## Overview

**_google-graphql-functions_** is a JS module that will help you to deploy your first dummy GraphQl API to a Google Cloud Functions endpoint, or to your local machine. In this tutorial, the data are hardcoded for the sake of brevity, but you could easily replace that bit of code with your own DB or external APIs requests. 

Beyond just querying GraphQl, **_google-graphql-functions_** will also allow you to expose a [_GraphiQl UI_](https://github.com/graphql/graphiql) to help develop, test, and collaborate. **_GraphiQl_** is nothing more than an HTML page that contains your own GraphQl schema. You're responsible for hosting it as well as injecting your schema into it so that your clients can interact with your GraphQl api in a friendly way. It supports validation as well as auto-complete.

This project has been forked from the excellent [express-graphql](https://github.com/graphql/express-graphql) package.

In this brief 3 steps guide, you will:
* A - [Configure Your Google Cloud Functions Environment](#step-a---create-a-new-google-cloud-functions-on-gcp)
* B - [Configure Your Local Machine](#step-b---configure-your-local-machine)
* C - [Build & Deploy your GraphQl dummy API](#step-c---create--deploy-your-graphql-dummy-api-to-your-local-machine)

If you're only interested in knowing how to program GraphQl APIs for Google Cloud Functions and are already familiar with developing and deploying code for Google Cloud Functions, then jump straight to [Step C - Create & Deploy your GraphQl dummy API](#step-c---create--deploy-your-graphql-dummy-api-from-your-local-machine).

## Step A - Create a New Google Cloud Functions On GCP
**1** - Create a Google Account & log in to your [Google Cloud Console](https://console.cloud.google.com).

**2** - Select or create a new Project (if this concept is not familiar, please visit this [link](https://cloud.google.com/resource-manager/docs/creating-managing-projects)).

**3** - Create your first Google Cloud Function (if the Google Cloud Console UI hasn't change, this should be in the left burger menu, under **Compute**). The details of your configuration don't really matter here, as we will override them later in stage B. Just make sure you select the _HTTP trigger_ under the **Trigger** section.

**4** - Copy the following information:
* _**Name**_: Name of your Google Cloud Function.
* _**Bucket**_: The name of the Google Cloud Storage's bucket. A _bucket_ is a piece of storage that can old various document. In our case, those documents will be ZIP files representing each deployment. This could for example allow you to revert your code in case your latest deployement (latest ZIP) contains bugs.

## Step B - Configure Your Local Machine 
**1** - Make sure your have the following tools installed on your machine:
* _**node**_: Make sure you have the latest version.
* _**npm**_: Make sure you have the latest version.
* [_**gcloud**_](https://cloud.google.com/sdk/gcloud/): Installation steps [here](https://cloud.google.com/sdk/downloads).
* _**gcloud beta**_: 

  **``` gcloud components install beta ```**
* [_**Google Cloud Functions Emulator**_](https://github.com/GoogleCloudPlatform/cloud-functions-emulator)(allows to deploy your GCF locally for dev. purposes): 

  **``` npm install -g @google-cloud/functions-emulator ```**

**2** - Configure your system:
* Make sure you have the latest gcloud components: 

  **``` gcloud components update ```**
* Connect gcloud to your Google account: 

  **``` gcloud init ```**
* Check which [Google Cloud Project](https://cloud.google.com/resource-manager/docs/creating-managing-projects) is currently you default gcloud project: 

  **``` gcloud config list ```**
* If the value listed under _project_ is not equal to the project you set up in [Step A.2](#step-a---create-a-new-google-cloud-functions-on-gcp), set it up by executing: 

  **``` gcloud config set project [YOUR-PROJECT-ID] ```**

## Step C - Create & Deploy your GraphQl dummy API To Your Local Machine
**1** - Create a new Google Could Functions Project
```bash
mkdir graphql-cloud-function
cd graphql-cloud-function
touch index.js
npm init
```
**2** - Load dependencies
```bash 
npm install graphql graphql-tools google-graphql-functions lodash --save
```
_More details on those dependencies in annex [A.2. List Of Dependencies](#a2-list-of-dependencies)_

**3** - Paste this demo code into the index.js
```js
const { serveHTTP } = require('google-graphql-functions')
const makeExecutableSchema = require('graphql-tools').makeExecutableSchema
const _ = require('lodash')
const httpError = require('http-errors')

// Replace 
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
          const results = id ? _(productMocks).filter(p => p.id == id) : productMocks
          if (results)
            return results
          else
            throw httpError(404, `Product with id ${id} does not exist.`)
        }
    }
}

const executableSchema = makeExecutableSchema({
    typeDefs: schema,
    // This seems silly to use merge here as there is only one resolver.
    // We could have written: 'resolvers: productResolver'
    // In reality, you'd probably have more than one resolver: 'resolvers: _.merge(productResolver, userResolver)'
    resolvers: _.merge(productResolver) 
})

const graphqlOptions = {
    schema: executableSchema,
    graphiql: true,
    endpointURL: "/graphiql"
}

exports.Graphql = serveHTTP(graphqlOptions)
```
_More details on the code above in annex [A.3. GraphQl Code Details](#a3-graphql-code-details)_

**4** - Test this code locally:

*(Make sure you've installed the 'Google Cloud Functions Emulator' as explained in [Step B.1](#step-b---configure-your-local-machine))*
* Start your local Google Cloud Functions server: **``` functions start ```**
* Deploy your code to the local server: **``` functions deploy main --trigger-http ```**
* Copy the URL displayed in the terminal, and append to it the endpointURL defined in the code above. This should look like [http://localhost:8010/[PROJECT-ID]/us-central1/main/graphiql](http://localhost:8010/[PROJECT-ID]/us-central1/main/graphiql). Your browser should return the GraphiQL UI, and you should be able to start querying. As you're running queries in the UI, you'll notice that the URL's query string automatically updates. This is the actually GraphQl query. To test what a normal client would receive, simply remove the /graphiql in the URL, and you should receive a JSON object. 

**5** - Deploy your code to your Google Cloud Function on GCP

*(Make sure you've installed the 'gcloud beta' as explained in [Step B.1](#step-b---configure-your-local-machine))*

The steps to deploy:

* Add the following in your package.json (more details on why we need this in annex [A.4. Why You Need To Add ``` npm dedupe ``` As a Post Install Hook](#a4-why-you-need-to-add-npm-dedupe-as-a-post-install-hook)):
  ```js
  "scripts": {
  	"postinstall": "npm dedupe"
  }
  ```
* Get your Google Cloud Function from [Step A.4](#step-a---create-a-new-google-cloud-functions-on-gcp), and execute the following:

  ```bash
  gcloud beta functions deploy [FUNCTION-NAME] --stage-bucket [BUCKET-NAME] --trigger-http --entry-point main
  ```

**6** - Adding CORS Support

If you need to support CORS, add a _**appconfig.json**_ file under your project's root folder and add a configuration similar to the following:
```js
{
  "headers": {
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS, POST",
    "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Max-Age": "1296000"
  }
}
```

Google-graphql-functions is built on top of the [_**webfunc**_](https://github.com/nicolasdao/webfunc) package. [_**webfunc**_](https://github.com/nicolasdao/webfunc) is a lightweight HTTP handler & project environment variables manager. For more details on how to configure its _appconfig.json_ file, please visit its GitHub page [here](https://github.com/nicolasdao/webfunc). 

If you're using [_**gimpy**_](https://github.com/nicolasdao/gimpy), you can also initiate a new GraphQL project ready to be hosted on Google Cloud Functions as follow:
```
gimp new graphql-gcf your-app
```
After answering all the questions
```
cd your-app
npm install
gimp deploy
```

## This Is What We re Up To
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

## Annexes
### A.1. Options Details
```js
const options = {
  schema: "Object"
  graphiql: "Boolean"
  endpointURL: "String"
  rootValue: "Object"
  context: "Object"
  pretty: "Boolean"
  formatError: "Object"
  extensions: "function"
  validationRules: "Object"
};
```
- schema: A GraphQLSchema instance from GraphQL.js. A schema must be provided.
- graphiql: If true, presents GraphiQL when the GraphQL endpoint is loaded in a browser.
- endpointURL: If 'graphiql' is on, then whatever path you define here will allow to serve an HTML page with the GraphiQl UI. Leaving that blanck will serve the GraphiQL UI on the root path, which will prevent any client to actually retrieve the data in a JSON format. That's why it is recommended to define this field.
- rootValue: A value to pass as the rootValue to the graphql() function from GraphQL.js.
- context: A value to pass as the context to the graphql() function from GraphQL.js. If context is not provided, the request object is passed as the context.
- pretty: If true, any JSON response will be pretty-printed.
- formatError: An optional function which will be used to format any errors produced by fulfilling a GraphQL operation. If no function is provided, GraphQL's default spec-compliant formatError function will be used.
- extensions: An optional function for adding additional metadata to the GraphQL response as a key-value object. The result will be added to "extensions" field in the resulting JSON. This is often a useful place to add development time metadata such as the runtime of a query or the amount of resources consumed. This may be an async function. The function is give one object as an argument: { document, variables, operationName, result }.
- validationRules: Optional additional validation rules queries must satisfy in addition to those defined by the GraphQL spec.

### A.2. List Of Dependencies 

- [graphql.js](https://github.com/graphql/graphql-js): This is the official Facebook GraphQl lib. Most of the open-source tools you'll encounter are built on top of it.
- [graphql-tools.js](https://github.com/apollographql/graphql-tools): This is the [Apollo GraphQl](http://dev.apollodata.com/) tools. Apollo is an awesome set of tools built on top of graphql.js that *"make open source software and commercial tools to help developers use GraphQL"*. Specifically, graphql-tools.js make building GraphQl schemas and building resolvers less of a pain than using vanilla graphql.js.
- [google-graphql-functions.js](https://github.com/nicolasdao/google-graphql-functions): Our sugar code that glues the Google Cloud Functions node.js server to your standard GraphQl schema. It also exposes a [GraphiQl UI](https://github.com/graphql/graphiql) (if the option graphiql is set to true), which is darn useful when developing your API, or if you want to expose your API to collaborators. Not only will they access great documentation out-of-the-box, they will also be able to query your GraphQl API with a nice auto-complete (try a live demo [here](https://graphql.org/swapi-graphql/)). 
- [lodash.js](https://github.com/lodash/lodash): *"A modern JavaScript utility library delivering modularity, performance, & extras."*. Usually used to perform functional style programming. Trying it is loving it. 

### A.3. GraphQl Code Details
In the above [index.js](#step-c---create--deploy-your-graphql-dummy-api-from-your-local-machine):
* We've created a GraphQl 'schema'. It is a string, but this is just an opiniated implementation from the Apollo team (i.e. graphql-tools.js). graphql.js choosed a more programmatic approach.
* We've then created a resolver called 'productResolver', that interprets the GraphQl query so that you can query your backend, whatever it is (e.g. DB, other APIs, ...). In this example, we only have one resolver, but you can have as many as you need. That's why we have the line of code '_.merge(productResolver.root)'.
* Now that we have both a schema and all the resolvers, we can actually create an 'Executable Schema'. This is where the magic happens.
* Finally, we've packaged all of this into our GraphiQL tool (google-graphql-functions.js) so that we have an option to expose the Facebook GraphiQL UI to ease development, testing, and collaboration. More details about the section called [Option Details](#a1-options-details).

### A.4. Why You Need To Add ``` npm dedupe ``` As a Post Install Hook 
As of today (Apr 17), the current stable version of node is v7.8.0, which stopped using nested dependencies inside the node_modules. However, Google Cloud Functions still runs using node v6.9.1, which still uses nested dependencies. The issue is that our code will then contains more than one graphql.js package which will result in this weird bug: 

*`Schema must be an instance of GraphQLSchema. Also ensure that there are not multiple versions of GraphQL installed in your node_modules directory.`*

To fix this, we need to run **``` npm dedupe ```** after **``` npm install ```**. 

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
