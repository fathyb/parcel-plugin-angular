import {ParsedConfiguration, readConfiguration} from '@angular/compiler-cli'
import {Diagnostic, EmitFlags, Program} from '@angular/compiler-cli/src/transformers/api'
import {createProgram} from '@angular/compiler-cli/src/transformers/program'

import * as ts from 'typescript'

import {PathTransform} from 'parcel-plugin-typescript/exports'

import {CompileResult} from '../../interfaces'
import {reportDiagnostics} from '../reporter'
import {removeDecorators} from '../transformers/remove-decorators'
import {replaceBootstrap} from '../transformers/replace-bootstrap'
import {findResources} from '../transformers/resources'

import {resolveEntryModuleFromMain} from './entry-resolver'
import {AngularCompilerHost} from './host'
import {generateRouteLoader} from './route'

export class AngularCompiler {
	public readonly host: AngularCompilerHost
	private readonly config: ParsedConfiguration
	private readonly resources: {[file: string]: string[]} = {}
	private readonly transformers: Array<ts.TransformerFactory<ts.SourceFile>> = []

	private entryFile: string|null = null
	private entryModule: {className: string, path: string}|null = null
	private program: Program|undefined = undefined
	private firstRun = true
	private shouldEmit = false

	constructor(project: string, compileResource: (file: string) => Promise<string>) {
		this.config = readConfiguration(project)

		const {options} = this.config

		this.host = new AngularCompilerHost(options, compileResource)
		this.transformers.push(PathTransform(options))
	}

	public async compile(path: string): Promise<CompileResult> {
		if(this.entryFile === null) {
			// We assume the file file included by the project is the entry
			// It is used to inject the generated SystemJS loader
			this.entryFile = path
		}

		const program = await this.emit()

		const {basePath, outDir} = this.config.options

		if(!basePath) {
			throw new Error('basePath should be defined')
		}

		if(!outDir) {
			throw new Error('outDir should be defined')
		}

		let js = this.host.store.readFile(path.replace(/\.tsx?$/, '.js').replace(basePath, outDir))!

		// detect if the file is the main module
		if(program && path === this.entryFile) {
			js = `${js}\n${generateRouteLoader(path, program)}`
		}

		return {
			sources: {
				js
			},
			resources: this.resources[path] || []
		}
	}

	private async getProgram() {
		const {host} = this
		const {changedFiles} = host.store
		let {program} = this

		if(changedFiles.length > 0 || this.firstRun || !program) {
			const config = readConfiguration(this.config.project)
			const {options, rootNames} = config

			// TODO: why passing oldProgram breaks the build?
			program = createProgram({rootNames, options, host})

			this.program = program
			this.shouldEmit = true

			changedFiles.splice(0)

			await program.loadNgStructureAsync()

			this.updateResources(program)
		}

		return program
	}

	private async emit() {
		const program = await this.getProgram()

		if(this.shouldEmit) {
			const getTypeChecker = () => program.getTsProgram().getTypeChecker()
			const transformers: Array<ts.TransformerFactory<ts.SourceFile>> = [removeDecorators(getTypeChecker)]
			const diagnostics: Array<Diagnostic|ts.Diagnostic> = []

			diagnostics.push(...program.getNgStructuralDiagnostics())

			if(this.firstRun) {
				this.firstRun = false

				diagnostics.push(...program.getNgOptionDiagnostics(), ...program.getTsOptionDiagnostics())
			}

			const {entryFile, host} = this
			let {entryModule} = this

			if(!entryModule && entryFile) {
				try {
					const [path, className = 'default'] = resolveEntryModuleFromMain(entryFile, host, program.getTsProgram())
						.split('#')

					entryModule = {className, path}
					this.entryModule = entryModule
				}
				catch(_) {
					entryModule = null
				}
			}

			if(entryModule) {
				transformers.push(replaceBootstrap(file => file === this.entryFile, () => entryModule!, getTypeChecker))
			}

			diagnostics.push(
				...program.getTsSemanticDiagnostics(),
				...program.getTsSyntacticDiagnostics(),
				...program.getNgSemanticDiagnostics()
			)

			const result = program.emit({
				emitFlags: EmitFlags.All,
				customTransformers: {
					beforeTs: [...this.transformers, ...transformers]
				}
			})

			diagnostics.push(...result.diagnostics)

			reportDiagnostics(diagnostics)

			this.shouldEmit = false
		}

		return program
	}

	private updateResources(program: Program) {
		program
			.getTsProgram()
			.getSourceFiles()
			.filter(({text}) => /(templateUrl)|(styleUrls)/.test(text))
			.forEach(sourceFile =>
				this.resources[sourceFile.fileName] = findResources(sourceFile)
					.map(({path}) => typeof path === 'string' ? [path] : path)
					.reduce((a, b) => a.concat(b), [])
			)
	}
}
