declare module 'parcel-bundler/src/assets/JSAsset' {
	class JSAsset {
		public name: string
		public contents?: string
		public options?: any
		public package?: any
		public dependencies: Map<string, string>
		public depAssets: Map<string, any>
		public isES6Module: boolean
		public parentBundle: any|null

		constructor(name: string, pkg: string, options: any)

		parse(code: string): Promise<any>
		load(): Promise<string>
		addURLDependency(url: string, from?: string, opts?: {}): string
		addDependency(url: string, opts: {}): string
		collectDependencies(): void
	}

	export = JSAsset
}
declare module 'parcel-bundler/lib/assets/JSAsset' {
	import JSAsset = require('parcel-bundler/src/assets/JSAsset')

	export = JSAsset
}

declare module 'parcel-bundler/src/assets/HTMLAsset' {
	import HTMLAsset = require('parcel-bundler/lib/assets/HTMLAsset')

	export = HTMLAsset
}
declare module 'parcel-bundler/lib/assets/HTMLAsset' {
	class JSAsset {
		public name: string
		public contents?: string
		public options?: any
		public package?: any
		public parentBundle?: any
		public dependencies: Map<string, string>
		public depAssets: Map<string, any>

		constructor(name: string, pkg: string, options: any)

		parse(code: string): Promise<any>
		process(): Promise<any>
		load(): Promise<string>
	}

	export = JSAsset
}
declare module 'normalize-path'
declare module 'posthtml-parser'
declare module 'posthtml/lib/api'
declare module 'line-column' {
	function lineColumn(str: string, index: number): {
		line: number
		col: number
	}

	export = lineColumn
}

declare module '@babel/code-frame' {
	export interface LineAndColumn {
		line: number
		column: number
	}

	export interface Location {
		start: LineAndColumn
		end?: LineAndColumn
	}

	export type Options = Partial<{
		highlightCode: boolean
		linesAbove: number
		linesBelow: number
		forceColor: boolean
	}>

	export function codeFrameColumns(lines: string, location: Location, options?: Options): string
}
