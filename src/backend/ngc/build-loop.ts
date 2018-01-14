import * as ts from 'typescript'

import {ParsedConfiguration, readConfiguration} from '@angular/compiler-cli'
import {Diagnostic, EmitFlags, Program} from '@angular/compiler-cli/src/transformers/api'
import {createProgram} from '@angular/compiler-cli/src/transformers/program'

import {AsyncLoop} from '../../utils/async-loop'

import {reportDiagnostics} from '../reporter'
import {removeDecorators} from '../transformers/remove-decorators'
import {replaceBootstrap} from '../transformers/replace-bootstrap'
import {findResources} from '../transformers/resources'

import {resolveEntryModuleFromMain} from './entry-resolver'
import {AngularCompilerHost} from './host'

export class BuildLoop extends AsyncLoop<void> {
	public entryFile: string|null = null

	private readonly resources: {[file: string]: string[]} = {}
	private entryModule: {className: string, path: string}|null = null
	private program: Program|undefined = undefined
	private firstRun = true
	private shouldEmit = false

	constructor(
		private readonly host: AngularCompilerHost,
		private readonly config: ParsedConfiguration,
		private readonly transformers: Array<ts.TransformerFactory<ts.SourceFile>>
	) {
		super(() => this.compile())
	}

	public getProgram(): Program|undefined {
		return this.program
	}

	public getResources(file: string): string[] {
		return this.resources[file] || []
	}

	private async createProgramIfNeeded() {
		const {host} = this
		const {changedFiles} = host.store
		let {program} = this

		if(changedFiles.length > 0 || this.firstRun || !program) {
			const config = readConfiguration(this.config.project)
			const {options, rootNames} = config

			program = createProgram({rootNames, options, host, oldProgram: program})

			this.program = program
			this.shouldEmit = true

			const resource = changedFiles.find(file => !/\.ts$/.test(file))

			if(resource) {
				Object.keys(host.store['sources']).forEach(key => {
					if(!/node_modules/.test(key)) {
						delete host.store['sources'][key]
					}
				})
			}

			changedFiles.splice(0)

			await program.loadNgStructureAsync()

			this.updateResources(program)
		}

		return program
	}

	private async compile() {
		const program = await this.createProgramIfNeeded()

		if(!this.shouldEmit) {
			return
		}

		this.shouldEmit = false

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
			// TODO: this has to be improved or removed
			transformers.push(replaceBootstrap(file => file === entryFile, () => entryModule!, getTypeChecker))
		}

		const result = program.emit({
			emitFlags: EmitFlags.All,
			customTransformers: {
				beforeTs: [...this.transformers, ...transformers]
			}
		})

		diagnostics.push(
			...program
				.getTsSemanticDiagnostics()
				// TODO: whyyyyyyyyyy do i have to do this
				.filter(diag =>
					typeof diag.messageText === 'string'
						? !/^Module '"|'[^('|")]+\.ngfactory'|"' has no exported member '[^']+NgFactory'./.test(diag.messageText)
						: true
				),
			...program.getTsSyntacticDiagnostics(),
			...program.getNgSemanticDiagnostics(),
			...result.diagnostics
		)

		reportDiagnostics(diagnostics)
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
