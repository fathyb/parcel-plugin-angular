import {ParsedConfiguration, readConfiguration} from '@angular/compiler-cli'

import * as ts from 'typescript'

import {PathTransform} from 'parcel-plugin-typescript/exports'

import {CompileResult} from '../../interfaces'
import {AngularCompilerHost} from './host'
import {generateRouteLoader} from './route'

import {BuildLoop} from './build-loop'

export class AngularCompiler {
	public readonly host: AngularCompilerHost
	public readonly loop: BuildLoop

	private readonly config: ParsedConfiguration
	private readonly transformers: Array<ts.TransformerFactory<ts.SourceFile>> = []

	constructor(project: string, compileResource: (file: string) => Promise<string>) {
		this.config = readConfiguration(project)

		const {options} = this.config

		this.host = new AngularCompilerHost(this.config.options, compileResource)
		this.loop = new BuildLoop(this.host, this.config, this.transformers)

		this.transformers.push(PathTransform(options))
	}

	/**
	 * Triggers a TypeScript compilation if needed and returns a compiled file
	 * @param path a absolute path to a TypeScript source file to compile
	 */
	public async compile(path: string): Promise<CompileResult<string[]>> {
		const {config, loop} = this

		if(loop.entryFile === null) {
			// We assume the file file included by the project is the entry
			// It is used to inject the generated SystemJS loader
			// TODO: use Parcel dependencies instead
			loop.entryFile = path
		}

		await loop.emit(undefined)

		const {basePath, outDir} = config.options

		if(basePath && outDir) {
			path = path.replace(basePath, outDir)
		}

		let js = this.host.store.readFile(path.replace(/\.tsx?$/, '.js'))!
		const program = loop.getProgram()

		// detect if the file is the main module
		// TODO: use Parcel dependencies
		if(program && path === this.loop.entryFile) {
			js = `${js}\n${generateRouteLoader(path, program)}`
		}

		return {
			sources: {js},
			resources: this.loop.getResources(path)
		}
	}
}
