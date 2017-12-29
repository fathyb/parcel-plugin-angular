import {dirname} from 'path'

import {JSAsset} from 'parcel-plugin-typescript/exports'
import resolve = require('resolve')

import {IPCClient} from '../../backend/worker/client'

let ClosureAsset: any|null = null

export = class VirtualAsset extends JSAsset {
	public async load(): Promise<string> {
		if(/\.ng(factory|style)\.js$/.test(this.name)) {
			const file = await IPCClient.readVirtualFile(this.name)

			if(file) {
				return file
			}
		}

		return super.load()
	}

	public collectDependencies() {
		if(this.options.__minifyUsingClosure) {
			try {
				if(!ClosureAsset) {
					const assetPath = resolve.sync('parcel-plugin-closure/build/javascript/parcel/asset', {
						basedir: dirname(this.name)
					})

					ClosureAsset = require(assetPath)
				}

				ClosureAsset.prototype.collectDependencies.call(this)
			}
			catch(err) {
				// Keep ES6 imports/exports to improve Closure's tree-shaking
				this.isES6Module = false

				// Disable Uglify, for performances and to keep types annotations
				this.options.minify = false
			}
		}
		else {
			super.collectDependencies()
		}
	}
}
