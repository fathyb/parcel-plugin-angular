import {HandlerMethod, readFile, Server, setSocketPath, Worker} from 'parcel-plugin-typescript/exports'

import {
	CompileRequest, CompileResult,
	ServerRequest, ServerResponse, WorkerRequest, WorkerResponse
} from '../../interfaces'

import {getFileResources, processResource} from '../../frontend/loaders/template'
import {getWatcher} from '../../utils/get-watcher'

export class AngularWorker extends Worker<WorkerRequest, WorkerResponse> {
	public readonly resources: Map<string, string[]>
	private readonly bundler: any

	constructor(bundler: any) {
		// We append the socket path to process.env beforce spawning the worker
		setSocketPath('angular')

		super(require.resolve('./launcher'))

		this.bundler = bundler
		this.resources = new Map()
	}

	public async getFactories(file: string): Promise<string[]> {
		try {
			const factories = await this.request('getFactories', undefined)
			const base = file.replace(/\.tsx?/, '')

			return factories.filter(factory => factory.indexOf(base) === 0)
		}
		catch {
			return []
		}
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
	private readonly worker: AngularWorker

	constructor(bundler: any) {
		const worker = new AngularWorker(bundler)

		super('angular', worker)

		this.worker = worker

		this.watch(bundler)
	}

	public close() {
		this.worker.kill()

		super.close()
	}

	private async watch(bundler: any) {
		const watcher = await getWatcher(bundler)

		if(!watcher) {
			return
		}

		const {worker} = this

		watcher.on('change', async (file: string) => {
			const deps = worker.resources.get(file)
			const files: string[] = []

			worker.invalidate([file])

			if(deps) {
				files.push(...deps)
			}

			files.forEach(depFile => bundler.onChange(depFile))

			const factories = await Promise.all(
				files.map(depFile => worker.getFactories(depFile))
			)

			factories
				.reduce((a, b) => a.concat(b), [])
				.forEach(factory => bundler.onChange(factory))

			// TODO: batch this
			worker.invalidate(files)
		})
	}
}
