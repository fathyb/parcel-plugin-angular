import {Configuration, JSAsset, loadConfiguration} from 'parcel-plugin-typescript/exports'

import {IPCClient} from '../../backend/worker/client'
import {Resources} from '../../interfaces'

import {collectDependencies} from '../utils/collect-dependencies'

export = class AngularAOTTSAsset extends JSAsset {
	private readonly config: Promise<Configuration>
	private resources: Resources|null = null

	constructor(name: string, pkg: string, options: any) {
		super(name, pkg, options)

		this.config = loadConfiguration(name)
	}

	public mightHaveDependencies() {
		return true
	}

	public collectDependencies() {
		super.collectDependencies()

		collectDependencies(this, this.resources)
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
