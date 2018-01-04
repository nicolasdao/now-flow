# NowFlow - Automate your Zeit Now Deployments &middot;  [![NPM](https://img.shields.io/npm/v/now-flow.svg?style=flat)](https://www.npmjs.com/package/now-flow) [![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](https://opensource.org/licenses/BSD-3-Clause) [![Neap](https://neap.co/img/made_by_neap.svg)](#this-is-what-we-re-up-to)

Define your alias and all your environment variables inside your traditional __*now.json*__, and let __*now-flow*__ do the rest.

_now.json_
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

The above will make sure that the _package.json_ that is being deployed will contain the _start_ script `"NODE_ENV=production node index.js"` and that once the deployment to [Zeit](https://zeit.co/now) is finished, it is automatically aliased to `yourapp-prod`. 

No more deployment then aliasing steps. No more worries that some environment variables have been properly deployed to the right environment. 


# Install
Either install it globally
```
npm install now-flow -g
```

Or embed it inside your project to run it through npm

```
npm install now-flow --save-dev
```

# How To Use It
## Basic
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
If you do not want to alias your deployment, use the following:
```
nowflow production --noalias
```

## Modifying The package.json's "scripts" property For Each Environment
As described in the intro, this is one of the key feature of _now-flow_. In the _now.json_, under each specific environment, you can add a __*"script"*__ property that will completely override the one defined inside the _package.json_ during the deployment. Once the deployment is completed, the _package.json_ is restored to its original state. 

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

# This Is What We re Up To
<a href="https://neap.co" target="_blank"><img src="https://neap.co/img/neap_color_horizontal.png" alt="Neap Pty Ltd logo" title="Neap" height="89" width="200" style="float: right" align="right" /></a>
We are Neap, an Australian Technology consultancy powering the startup ecosystem in Sydney. We simply love building Tech and also meeting new people, so don't hesitate to connect with us at [https://neap.co](https://neap.co).

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
