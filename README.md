# parcel-plugin-angular

Complete Angular support for Parcel and TypeScript.

## Features

- [`parcel-plugin-typescript` features](https://github.com/fathyb/parcel-plugin-typescript#features)
- AOT compilation, using the official Angular compiler for smaller and faster applications.
- Lazy Loading, the plugin automagically splits your Angular modules in multiple JavaScript files with Parcel when you use lazy routes.
- Template and style parsing, your templates and style are processed by Parcel to find and replaces resources.
- Transformations (based on [`angular/angular-cli`](https://github.com/angular/angular-cli) transformers) :
	- It removes all your Angular decorators in AOT mode for smaller bundles
	- It replaces JIT bootstrap code with AOT when it's used. You can keep one main file using the `@angular/platform-browser-dynamic` module, see [Entry file](#entry-file)

## Prerequisites

- `@angular/compiler` and `@angular/compiler-cli` should be installed
- `parcel-plugin-typescript` should not be installed

## Installation

`yarn add parcel-plugin-angular --dev`

or

`npm install parcel-plugin-angular --save-dev`

## Configuration

You can pass a `parcelAngularOptions` object in your `tsconfig.json`, here are the defaults :
```js
{
  "compilerOptions": { ... },
  // the plugin options
  "parcelAngularOptions": {
    // What compiler should we use when watching or serving
    "watch": "jit",

    // What compiler should we use when building (parcel build)
    "build": "aot"
  }
}
```

## Entry file

To make it easy to switch between JIT and AOT mode we automatically translate your JIT bootstrap code to AOT if you are using the AOT compiler.

```ts
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic'
import {enableProdMode} from '@angular/core'
import {AppModule} from './app/app.module'

if(process.env.NODE_ENV === 'production') {
  enableProdMode()
}

platformBrowserDynamic().bootstrapModule(AppModule)
```

will be transformed to :

```ts
import {platformBrowser} from '@angular/platform-browser'
import {enableProdMode} from '@angular/core'
import {AppModuleNgFactory} from './app/app.module.ngfactory'

if(process.env.NODE_ENV === 'production') {
  enableProdMode()
}

platformBrowser().bootstrapModuleFactory(AppModuleNgFactory)
```

## Known issues

- AOT mode is highly experimental
- Lazy-loading does not work in JIT
