export interface Resources {
	external: string[]
	bundled: string[]
}

export interface CompileRequest {
	file: string
	tsConfig: string
}

export interface CompileResult<R = Resources> {
	sources: {
		js: string
		sourceMap?: string
	}
	resources: R
}

export interface Request {
	typeCheck: CompileRequest
	compile: CompileRequest
	readVirtualFile: string
	invalidate: string[]
}

export interface Response<R = string[]> {
	typeCheck: void
	compile: CompileResult<R>
	readVirtualFile: string|null
	invalidate: void
}

export interface ServerRequest extends Request {
	processResource: string
}

export interface ServerResponse extends Response<Resources> {
	processResource: string
}

export interface WorkerRequest extends Request {
	wait: void
	getFactories: void
}

export interface WorkerResponse extends Response {
	wait: void
	getFactories: string[]
}
