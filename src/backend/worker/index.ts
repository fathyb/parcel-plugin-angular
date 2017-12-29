import {HandlerMethod, readFile, Server, setSocketPath, Worker} from 'parcel-plugin-typescript/exports'

import {
	CompileRequest, CompileResult,
	ServerRequest, ServerResponse, WorkerRequest, WorkerResponse
} from '../../interfaces'

import {getFileResources, processResource} from '../../frontend/loaders/template'

export class TypeScriptWorker extends Worker<WorkerRequest, WorkerResponse> {
	public readonly resources: Map<string, string[]>
	private readonly bundler: any

	constructor(bundler: any) {
		// We append the socket path to process.env beforce spawning the worker
		setSocketPath('angular')

		super(require.resolve('./launcher'))

		this.bundler = bundler
		this.resources = new Map()
	}

	@HandlerMethod
	public async compile(data: CompileRequest): Promise<CompileResult> {
		const {resources, sources} = await this.request('compile', data)
		const result = {
			sources,
			resources: {
				bundled: resources,
				external: resources
					.map(resource => getFileResources(resource))
					.reduce((a, b) => a.concat(b), [])
			}
		}

		for(const dep of resources.concat(result.resources.external)) {
			const deps = this.resources.get(dep)

			if(!deps) {
				this.resources.set(dep, [data.file])
			}
			else {
				deps.push(data.file)
			}
		}

		return result
	}

	@HandlerMethod
	public typeCheck(data: CompileRequest): Promise<void> {
		return this.request('typeCheck', data)
	}

	@HandlerMethod
	public readVirtualFile(file: string) {
		return this.request('readVirtualFile', file)
	}

	@HandlerMethod
	public async processResource(file: string) {
		const {package: pkg, options, parser} = this.bundler

		const source = await readFile(file)

		return processResource(file, pkg, options, parser, source)
	}

	@HandlerMethod
	public invalidate(files: string[]) {
		return this.request('invalidate', files)
	}
}

export class AngularServer extends Server<ServerRequest, ServerResponse> {
	private readonly worker: TypeScriptWorker

	constructor(bundler: any) {
		const worker = new TypeScriptWorker(bundler)

		super('angular', worker)

		this.worker = worker

		process.nextTick(() => {
			if(bundler.watcher) {
				bundler.watcher.on('change', (file: string) => {
					const deps = worker.resources.get(file)
					const files = [file]

					if(deps) {
						files.push(...deps)
					}

					// TODO: batch this
					worker.invalidate(files)
				})
			}
		})
	}

	public close() {
		this.worker.kill()

		super.close()
	}
}
