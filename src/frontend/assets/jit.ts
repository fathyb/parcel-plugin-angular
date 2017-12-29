import JSAsset = require('parcel-bundler/lib/assets/JSAsset')

import {Configuration, loadConfiguration, Transpiler} from 'parcel-plugin-typescript/exports'

import {replaceResources} from '../../backend/transformers/resources'
import {IPCClient} from '../../backend/worker/client'
import {Resources} from '../../interfaces'
import {getFileResources, processResource} from '../loaders/template'
import {collectDependencies} from '../utils/collect-dependencies'

declare global {
	interface PreProcessor {
		findExpr: RegExp
		replaceExpr: RegExp
		transform: (path: string) => Promise<string>
	}
}

export = class TSAsset extends JSAsset {
	private readonly config: Promise<Configuration>
	private readonly transpiler: Promise<Transpiler>
	private readonly resources: Resources = {
		bundled: [],
		external: []
	}

	private readonly templatePreProcessor: PreProcessor = {
		findExpr: /_PRAGMA_PARCEL_TYPESCRIPT_PLUGIN_PREPROCESS_TEMPLATE\(([^\)]*)\)/g,
		replaceExpr: /._PRAGMA_PARCEL_TYPESCRIPT_PLUGIN_PREPROCESS_TEMPLATE\(([^\)]*)\)./g,
		transform: path => processResource(path, this.package, this.options, this.options.parser)
	}
	private readonly stylePreProcessor: PreProcessor = {
		findExpr: /_PRAGMA_PARCEL_TYPESCRIPT_PLUGIN_PREPROCESS_STYLE\(([^\)]*)\)/g,
		replaceExpr: /._PRAGMA_PARCEL_TYPESCRIPT_PLUGIN_PREPROCESS_STYLE\(([^\)]*)\)./g,
		// TODO: preprocess CSS
		transform: path => processResource(path, this.package, this.options, this.options.parser)
	}

	constructor(name: string, pkg: string, options: any) {
		super(name, pkg, options)

		this.config = loadConfiguration(name)
		this.transpiler = this.config.then(config => new Transpiler(config, [replaceResources(() => true)]))
	}

	public async parse(code: string) {
		const {path: tsConfig} = await this.config

		IPCClient.typeCheck({tsConfig, file: this.name})

		const transpiler = await this.transpiler
		const {sources} = transpiler.transpile(code, this.name)

		this.resources.bundled.splice(0)
		this.resources.external.splice(0)

		this.contents = await this.preProcessResources(sources.js, this.templatePreProcessor, this.stylePreProcessor)

		// Parse result as ast format through babylon
		return super.parse(this.contents)
	}

	public collectDependencies() {
		super.collectDependencies()

		collectDependencies(this, this.resources)
	}

	private async preProcessResources(code: string, ...preProcessors: PreProcessor[]): Promise<string> {
		const results = preProcessors
			.map(preProcessor => ({
				matches: code.match(preProcessor.findExpr) || [],
				preProcessor
			}))

		const resources: {[key: string]: string} = {}

		await Promise.all(
			results
				.map(({matches, preProcessor}) =>
					matches.map(match => {
						const found = preProcessor.findExpr.exec(match)

						if(found) {
							return found.pop()
						}
					})
					.filter(match => !!match)
					.map(async match => {
						const path = new Buffer(match!, 'base64').toString('utf-8')

						resources[match!] = await preProcessor.transform(path)

						this.resources.external.push(...getFileResources(path))
						this.resources.bundled.push(path)
					})
				)
				.reduce((a, b) => a.concat(b), [])
		)

		results.forEach(({preProcessor}) =>
			code = code.replace(preProcessor.replaceExpr, (_, path) =>
				JSON.stringify(resources[path])
			)
		)

		return code
	}
}
