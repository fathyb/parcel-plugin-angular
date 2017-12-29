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

export interface WorkerRequest {
	typeCheck: CompileRequest
	compile: CompileRequest
	readVirtualFile: string
	invalidate: string[]
}

export interface WorkerResponse<R = string[]> {
	typeCheck: void
	compile: CompileResult<R>
	readVirtualFile: string|null
	invalidate: void
}

export interface ServerRequest extends WorkerRequest {
	processResource: string
}

export interface ServerResponse extends WorkerResponse<Resources> {
	processResource: string
}
