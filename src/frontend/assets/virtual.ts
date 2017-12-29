import {JSAsset} from 'parcel-plugin-typescript/exports'

import {IPCClient} from '../../backend/worker/client'

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
		super.collectDependencies()

		if(this.options.__minifyUsingClosure) {
			// Keep ES6 imports/exports to improve Closure's tree-shaking
			this.isES6Module = false

			// Disable Uglify, for performances and to keep types annotations
			this.options.minify = false
		}
	}
}
