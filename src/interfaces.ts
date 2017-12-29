export interface CompileRequest {
	file: string
	tsConfig: string
}

export interface CompileResult {
	sources: {
		js: string
		sourceMap?: string
	}
	resources: string[]
}

export interface WorkerRequest {
	typeCheck: CompileRequest
	compile: CompileRequest
	readVirtualFile: string
}

export interface WorkerResponse {
	typeCheck: void
	compile: CompileResult
	readVirtualFile: string|null
}

export interface ServerRequest extends WorkerRequest {
	processResource: string
}

export interface ServerResponse extends WorkerResponse {
	processResource: string
}
