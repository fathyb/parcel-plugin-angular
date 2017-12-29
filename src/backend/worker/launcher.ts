import {FileStore, Handler, LanguageService, loadConfiguration} from 'parcel-plugin-typescript/exports'

import {WorkerRequest, WorkerResponse} from '../../interfaces'
import {AngularCompiler} from '../ngc'

import {IPCClient} from './client'

const compilers = new Map<string, Promise<AngularCompiler>>()
const services = new Map<string, Promise<LanguageService>>()

function getCompiler(tsConfig: string): Promise<AngularCompiler> {
	let compiler = compilers.get(tsConfig)

	if(!compiler) {
		compiler = loadConfiguration(tsConfig).then(config => new AngularCompiler(config.path, IPCClient.processResource))

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

		return service.check(file)
	},
	async readVirtualFile(file) {
		try {
			return FileStore.shared().readFile(file) || null
		}
		catch {
			return null
		}
	}
}

export = handler
