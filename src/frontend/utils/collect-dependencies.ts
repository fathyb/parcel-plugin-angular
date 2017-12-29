import {dirname, relative} from 'path'

import JSAsset = require('parcel-bundler/src/assets/JSAsset')

import {Resources} from '../../interfaces'

export function collectDependencies(asset: JSAsset, resources: Resources|null) {
	if(asset.options.__minifyUsingClosure) {
		// Keep ES6 imports/exports to improve Closure's tree-shaking
		asset.isES6Module = false

		// Disable Uglify, for performances and to keep types annotations
		asset.options.minify = false
	}

	if(!resources) {
		return
	}

	const dir = dirname(asset.name)

	resources.external.forEach(resource => {
		let path = relative(dir, resource)

		if(!/^\.\//.test(path)) {
			path = `./${path}`
		}

		asset.addDependency(path, {})
	})
	resources.bundled.forEach(resource =>
		asset.addDependency(resource, {includedInParent: true})
	)
}
