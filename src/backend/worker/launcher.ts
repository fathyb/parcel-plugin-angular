import {FileStore, Handler, LanguageService, loadConfiguration} from 'parcel-plugin-typescript/exports'

import {WorkerRequest, WorkerResponse} from '../../interfaces'
import {AngularCompiler} from '../ngc'

import {IPCClient} from './client'

const compilers = new Map<string, Promise<AngularCompiler>>()
const services = new Map<string, Promise<LanguageService>>()

const store = FileStore.shared()

function getCompiler(tsConfig: string): Promise<AngularCompiler> {
	let compiler = compilers.get(tsConfig)

	if(!compiler) {
		compiler = loadConfiguration(tsConfig).then(config =>
			new AngularCompiler(config.path, IPCClient.processResource)
		)

		compilers.set(tsConfig, compiler)
	}

	return compiler
}

function getService(tsConfig: string): Promise<LanguageService> {
	let service = services.get(tsConfig)

	if(!service) {
		service = loadConfiguration(tsConfig).then(config => new LanguageService(config))

		services.set(tsConfig, service)
	}

	return service
}

const handler: Handler<WorkerRequest, WorkerResponse> = {
	async compile({file, tsConfig}) {
		const compiler = await getCompiler(tsConfig)

		return compiler.compile(file)
	},
	async typeCheck({file, tsConfig}) {
		const service = await getService(tsConfig)

		// TODO: support noEmitOnError
		await service.check(file, true)
	},
	async wait() {
		await Promise.all(
			Array
				.from(compilers.values())
				.map(promise =>
					promise.then(compiler =>
						compiler.loop.wait()
					)
				)
		)
	},
	async readVirtualFile(file) {
		try {
			await handler.wait(undefined)

			return store.readFile(file) || null
		}
		catch {
			return null
		}
	},
	async invalidate(files: string[]) {
		for(const file of files) {
			store.invalidate(file)
		}
	},
	async getFactories() {
		await Promise.all(
			Array
				.from(compilers.values())
				.map(promise =>
					promise.then(compiler =>
						compiler.loop.waitCurrentOrNext()
					)
				)
		)

		return store
			.getFiles()
			.filter(file => /\.ng(factory)|(style)\.js$/.test(file))
	}
}

export = handler
