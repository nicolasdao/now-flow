# NowFlow - Automate your Zeit Now Deployments &middot;  [![NPM](https://img.shields.io/npm/v/now-flow.svg?style=flat)](https://www.npmjs.com/package/now-flow) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)
Out-of-the-box, [_Zeit now-CLI_](https://zeit.co/now) does not offer any opiniated way to organize your variables on a per environment basis (e.g. database credentials, keys, ...). As of version 9.2.5, bugs still exist to deploy to AWS lambdas, and no support is provided to make functions deployed to Google Cloud to react to other events than an HTTPS request (e.g. Google Cloud Functions can react to Pub/Sub topics (very usefull for event-driven architecture), Google Storage or Firebase database changes). __*NowFlow* enables all those features by simply configuring your traditional *now.json*.__ 

NowFlow offers a strategy to manage multiple environments for any type of nodejs projects. It works especially well when it is combined with [__*Webfunc*__](https://github.com/nicolasdao/webfunc). Together, those 2 projects allow to deploy Express-like apps to the most popular serverless platforms (Zeit Now, AWS Lambdas, GCF) and will unlock apps that can react to __*Google Pub/Sub Topics*__ and __*Google Storage changes*__ (more info in the [FAQ](#faq) / [What Problems Does NowFlow Solve](#what-problems-does-nowflow-solve)).

# Table of Contents
> * [Install](#install)
> * [How To Use It?](#how-to-use-it)
>   - [Basics](#basics)
>   - [Google Cloud Functions for Pub/Sub or Storage Events](#google-cloud-functions-for-pubsub-or-storage-events)
>   - [The Most Minimal Setup](#the-most-minimal-setup)
>   - [Skipping Aliasing](#skipping-aliasing)
>   - [Modifying The package.json's "scripts" property For Each Environment](#modifying-the-packagejsons-scripts-property-for-each-environment)
> * [FAQ](#faq)
> * [About Us](#this-is-what-we-re-up-to)
> * [License](#license)

# Install
## Prerequisite
[Zeit now-CLI](https://github.com/zeit/now-cli) must have been installed globally:
```
npm install now -g
```
## Install NowFlow
Embed it inside your project as a dev dependency to run it through npm (RECOMMENDED WAY):
```
npm install now-flow --save-dev
```

Or install it globally:
```
npm install now-flow -g
```
# How To Use It?
## Basics
Configure your _now.json_ once, and then replace all the manual steps above with a single command similar to `nowflow production` (or `npm run deploy:prod` if you've configured that task in your package.json, which is the recommended way).

__*Example:*__

_now.json_
```js
{
  "env": {
    "active": "default",
    "default": {
      "hostingType": "localhost"
    },
    "staging": {
      "hostingType": "gcp",
      "gcp": {
        "functionName": "yourapp-test",
        "memory": 128
      }
    },
    "production": {
      "hostingType": "now",
      "scripts": {
        "start": "NODE_ENV=production node index.js"
      },
      "alias": "yourapp-prod"
    }
  }
}
```

To deploy the production environment, simply run:

```
nowflow production 
```

This will deploy to [Zeit Now](https://zeit.co/now) and make sure that:
- The _package.json_ that is being deployed will contain the _start_ script `"NODE_ENV=production node index.js"`.
- The `env.active` property of the _now.json_ is set to `production`.
- Once the deployment to [Zeit Now](https://zeit.co/now) is finished, it is automatically aliased to `yourapp-prod`. 

On the contrary, to deploy the staging environment, simply run:

```
nowflow staging 
```

This will deploy to [Google Cloud Functions](https://cloud.google.com/functions/) and make sure that:
- The `env.active` property of the _now.json_ is set to `staging`.
- The _now.json_ contains a `gcp` property identical to the one defined in the staging configuration.

No more deployment then aliasing steps. No more worries that some environment variables have been properly deployed to the right environment. 

> Learn more details on how NowFlow works in the [How Does NowFlow Work?](#how-does-nowflow-work) under the [FAQ](#faq) section.

## Google Cloud Functions for Pub/Sub or Storage Events

This is only possible when using the [__*Webfunc*__](https://github.com/nicolasdao/webfunc) project that allows to write Express-like apps to run everywhere. There are examples on that project documentation [__*here*__](https://github.com/nicolasdao/webfunc#google-pubsub-topic--storage-trigger-based-functions). 

## The Most Minimal Setup
You must first create a __*now.json*__ file in the root of your project's directory as follow:
```js
{
  "env": {
    "production": {
      "alias": "yourapp-prod"
    },
    "test": {
      "alias": "yourapp-test"
    }
  }
}
```

Make sure there is at least one environment defined under the _env_ property. Then simply run:

```
nowflow production
```

The above will:
1. Deploy your project to [Zeit](https://zeit.co/now) using the _production_ config defined in the _now.json_.
2. Will alias that deployment using the alias defined in the _production_ config defined in the _now.json_ (i.e. 'yourapp-prod').

## Skipping Aliasing
If you haven't defined an `alias` property for a specific environment, then now aliasing will be perfomed after deployment to that environment if the `hostingType` was `now`. If on the other hand an `alias` was defined, but you wish to prevent any aliasing, use the following:
```
nowflow production --noalias
```

## Modifying The package.json's "scripts" property For Each Environment
As described in the intro, this is one of the key feature of _now-flow_. In the _now.json_, under each specific environment, you can add a __*"script"*__ property that will completely override the one defined inside the _package.json_ during the deployment. Once the deployment is completed, the _package.json_ is restored to its original state. 

_now.json:_

```js
{
  "env": {
    "production": {
      "scripts": {
        "start": "NODE_ENV=production node index.js"
      },
      "alias": "yourapp-prod"
    },
    "test": {
      "scripts": {
        "start": "NODE_ENV=test node index.js"
      },
      "alias": "yourapp-test"
    }
  }
}
```

```
nowflow production 
``` 

In the example above, we're making sure that the _package.json_ contains a _start_ script so that _now_ can, for example, correctly start an express server.  

If you're using the serverless web framework [Webfunc](https://github.com/nicolasdao/webfunc), the above command will also make sure that the property `env.active` of the _now.json_ is also set to `production` before deploying. 

# FAQ
## What Problems Does NowFlow Solve?

TL;DR - It removes all the manual steps required before deploying to a specific environment (e.g. updating the `start` task in the package.json, changing the config in the now.json) and it adds support for Google Cloud Functions reacting to other events than an HTTPS request.

Out-of-the-box, [__*Zeit now-CLI*__](https://zeit.co/now) does not offer any opiniated way to organize your variables on a per environment basis (e.g. database credentials, keys, ...). As of version 9.2.5, bugs still exist to deploy to AWS lambdas, and no support is provided to make functions deployed to Google Cloud to react to other events than an HTTPS request (e.g. Google Cloud Functions can react to Pub/Sub topics great for event-driven architecture, Google Storage or Firebase database changes). NowFlow enables all those features by simply configuring your traditional __now.json__. This is an opiniated design choice that contrast with maintaining multiple now.json files (e.g. now.dev.json, now.staging.json, now.prod.json, ...) mainly driven by the desire to make working on the localhost easier as well as complying to what the now infrastructure already understand. If your interested in multiple now.json per environment, check the awesome project created by [Jesse Ditson](https://github.com/jesseditson) called [now-deploy](https://github.com/jesseditson/now-deploy).

To understand a bit more how NowFlow works, let's have a look at all the manual steps that would be required before being able to deploy to a specific environment (e.g. staging vs production) using the simple `now` command line:

1. Update the `start` script in the _package.json_ specific to your environment if you deploy to Zeit Now (e.g. production: `"start": "NODE_ENV=production node index.js"`, staging: `"start": "NODE_ENV=staging node index.js"`, localhost: `"start": "node-dev index.js"`).
2. If you're deploying to [Google Cloud Functions](https://cloud.google.com/functions/), you might need to configure the `gcp` property in the _now.json_.
3. If you're using the [Webfunc](https://github.com/nicolasdao/webfunc) serverless web framework, then you also need to set up the `env.active` property to the target environment in the _now.json_.
4. Run the right command (e.g. `now` if deploying to [Zeit Now](https://zeit.co/now), and `now gcp` if deploying to [Google Cloud Functions](https://cloud.google.com/functions/)).
5. Potentially _alias_ your deployment if your're deploying to [Zeit Now](https://zeit.co/now):
> - Update the `alias` property of the _now.json_ file to the alias name specific to your environment.
> - Run `now alias`

This process is obviously proned to errors. It is also tedious if you're deploying often. This is why we created __*now-flow*__. 

## How Does NowFlow Work?
NowFlow makes sure that both your _package.json_ and your _now.json_ are configured properly based on the environment you're targeting. It does that in 2 steps:
1. Create a temporary backup of your files in case something goes wrong. That's why you should see that during your deployment, the following 2 files are created: __*.package.backup.json*__, __*.now.backup.json*__. Those files will automatically deleted if the deployment is successful.
2. Modify both your _package.json_ and your _now.json_ based on the environment configuration contained in the _now.json_.
3. Invoke the `now` command (or `now <hostingType>`) to deploy.
4. If aliasing is required, then invoke `now alias`.
5. If the deployment is successful, or if an error but is is successfully intercepted and displayed to the terminal, then:
> - Restore both the _package.json_ and your _now.json_ to their original state.
> - Delete the backup files created in step #1.

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
