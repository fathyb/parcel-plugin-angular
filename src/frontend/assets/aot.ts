import {dirname, relative} from 'path'

import {Configuration, JSAsset, loadConfiguration} from 'parcel-plugin-typescript/exports'

import {IPCClient} from '../../backend/worker/client'

export = class AngularAOTTSAsset extends JSAsset {
	private config: Promise<Configuration>
	private resources: string[]|null = null

	constructor(name: string, pkg: string, options: any) {
		super(name, pkg, options)

		this.config = loadConfiguration(name)
	}

	public mightHaveDependencies() {
		return true
	}

	public collectDependencies() {
		super.collectDependencies()

		if(this.options.__minifyUsingClosure) {
			// Keep ES6 imports/exports to improve Closure's tree-shaking
			this.isES6Module = false

			// Disable Uglify, for performances and to keep types annotations
			this.options.minify = false
		}

		const {resources} = this

		if(!resources) {
			return
		}

		const dir = dirname(this.name)

		resources.forEach(resource => {
			let path = relative(dir, resource)

			if(!/^\.\//.test(path)) {
				path = `./${path}`
			}

			this.addDependency(path, {})
		})
	}

	public async parse() {
		const {path: tsConfig} = await this.config
		const result = await IPCClient.compile({tsConfig, file: this.name})

		this.resources = result.resources
		this.contents = result.sources.js

		// Parse result as ast format through babylon
		return super.parse(this.contents)
	}
}
