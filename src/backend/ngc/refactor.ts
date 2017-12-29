import * as path from 'path'
import * as ts from 'typescript'

/**
 * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
 * @param node The root node to check, or null if the whole tree should be searched.
 * @param sourceFile The source file where the node is.
 * @param kind The kind of nodes to find.
 * @param recursive Whether to go in matched nodes to keep matching.
 * @param max The maximum number of items to return.
 * @return all nodes of kind, or [] if none is found
 */
// TODO: replace this with collectDeepNodes and add limits to collectDeepNodes
export function findAstNodes<T extends ts.Node>(
	node: ts.Node | null,
	sourceFile: ts.SourceFile,
	kind: ts.SyntaxKind,
	recursive = false,
	max = Infinity
): T[] {
	// TODO: refactor operations that only need `refactor.findAstNodes()` to use this instead.
	if(max === 0) {
		return []
	}
	if(!node) {
		node = sourceFile
	}

	const arr: T[] = []

	if(node.kind === kind) {
		// If we're not recursively looking for children, stop here.
		if(!recursive) {
			return [node as T]
		}

		arr.push(node as T)
		max--
	}

	if(max > 0) {
		for(const child of node.getChildren(sourceFile)) {
			findAstNodes(child, sourceFile, kind, recursive, max).forEach((astNode: ts.Node) => {
				if(max > 0) {
					arr.push(astNode as T)
				}
				max--
			})

			if(max <= 0) {
				break
			}
		}
	}
	return arr
}

function resolve(filePath: string, program: ts.Program) {
	if(path.isAbsolute(filePath)) {
		return filePath
	}

	const compilerOptions = program.getCompilerOptions()
	const basePath = compilerOptions.baseUrl || compilerOptions.rootDir

	if(!basePath) {
		throw new Error(`Trying to resolve '${filePath}' without a basePath.`)
	}

	return path.join(basePath, filePath)
}

export class TypeScriptFileRefactor {
	public readonly fileName: string
	public readonly sourceFile: ts.SourceFile

	constructor(fileName: string, host: ts.CompilerHost, program?: ts.Program, source?: string | null) {
		fileName = resolve(fileName, program!).replace(/\\/g, '/')

		this.fileName = fileName

		if(program) {
			if(source) {
				this.sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
			}
			else {
				this.sourceFile = program.getSourceFile(fileName)
			}
		}

		if(!this.sourceFile) {
			this.sourceFile = ts.createSourceFile(
				fileName, source || host.readFile(fileName)!, ts.ScriptTarget.Latest, true
			)
		}
	}

	/**
	 * Find all nodes from the AST in the subtree of node of SyntaxKind kind.
	 * @param node The root node to check, or null if the whole tree should be searched.
	 * @param kind The kind of nodes to find.
	 * @param recursive Whether to go in matched nodes to keep matching.
	 * @param max The maximum number of items to return.
	 * @return all nodes of kind, or [] if none is found
	 */
	public findAstNodes(node: ts.Node | null, kind: ts.SyntaxKind, recursive = false, max = Infinity): ts.Node[] {
		return findAstNodes(node, this.sourceFile, kind, recursive, max)
	}
}
