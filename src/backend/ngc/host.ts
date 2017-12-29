import {CompilerHost, CompilerOptions} from '@angular/compiler-cli/src/transformers/api'

import {CompilerHost as LocalCompilerHost} from 'parcel-plugin-typescript/exports'

export class AngularCompilerHost extends LocalCompilerHost implements CompilerHost {
	public readonly resources: {[path: string]: string} = {}

	constructor(
		options: CompilerOptions,
		private readonly compileResource: (file: string) => Promise<string>
	) {
		super(options)
	}

	public readResource(path: string) {
		return this.compileResource(path).catch(err => {
			console.log('\n\n')
			console.log('Compile error', err)
			console.log('\n\n')

			return this.readFile(path)!
		})
	}
}
