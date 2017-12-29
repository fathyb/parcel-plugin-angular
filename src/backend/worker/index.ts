import {HandlerMethod, readFile, Server, Worker} from 'parcel-plugin-typescript/exports'

import {
	CompileRequest, CompileResult,
	ServerRequest, ServerResponse, WorkerRequest, WorkerResponse
} from '../../interfaces'

import {processResource} from '../../frontend/loaders/template'

export class TypeScriptWorker extends Worker<WorkerRequest, WorkerResponse> {
	constructor(private readonly bundler: any) {
		super(require.resolve('./launcher'))
	}

	@HandlerMethod
	public compile(data: CompileRequest): Promise<CompileResult> {
		try {
			return this.request('compile', data)
		}
		catch(e) {
			console.log('\n\n')
			console.error('Error', e)
			console.log('\n\n')

			throw e
		}
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
}

export class AngularServer extends Server<ServerRequest, ServerResponse> {
	private readonly worker: TypeScriptWorker

	constructor(bundler: any) {
		const worker = new TypeScriptWorker(bundler)

		super('angular', worker)

		this.worker = worker
	}

	public close() {
		this.worker.kill()

		super.close()
	}
}
