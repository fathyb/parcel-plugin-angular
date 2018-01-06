// This is directly copy-pasted from https://github.com/zinserjan/ts-diagnostic-formatter
// The original code throws errors because of es6-error

import {EOL} from 'os'

import {Diagnostic} from '@angular/compiler-cli/src/transformers/api'
import {codeFrameColumns, Location} from '@babel/code-frame'

import chalk from 'chalk'
import lineColumn = require('line-column')
import normalizePath = require('normalize-path')
import * as ts from 'typescript'

export function formatDiagnostics(diagnostics: Array<ts.Diagnostic|Diagnostic>, context: string): string {
	return diagnostics.map(diagnostic => {
		if(diagnostic.source === 'angular') {
			return formatAngularDiagnostic(diagnostic as Diagnostic, context)
		}
		else {
			return formatTypeScriptDiagnostic(diagnostic as ts.Diagnostic, context)
		}
	}).join(EOL) + EOL
}

function formatTypeScriptDiagnostic(diagnostic: ts.Diagnostic, context: string) {
	const messageText = formatDiagnosticMessage(diagnostic.messageText, '', context)
	const {file} = diagnostic
	let message = messageText

	if(file != null && diagnostic.start != null) {
		const lineChar = file.getLineAndCharacterOfPosition(diagnostic.start)
		const source = file.text || diagnostic.source
		const start = {
			line: lineChar.line + 1,
			column: lineChar.character + 1
		}
		const location: Location = {start}
		const red = chalk.red(`🚨  ${file.fileName}(${start.line},${start.column})`)

		const messages = [`${red}\n${chalk.redBright(messageText)}`]

		if(source != null) {
			if(typeof diagnostic.length === 'number') {
				const end = file.getLineAndCharacterOfPosition(diagnostic.start + diagnostic.length)

				location.end = {
					line: end.line + 1,
					column: end.character + 1
				}
			}

			const frame = codeFrameColumns(source, location, {
				linesAbove: 1,
				linesBelow: 1,
				highlightCode: true
			})

			messages.push(
				frame
					.split('\n')
					.map(str => `  ${str}`)
					.join('\n')
			)
		}

		message = messages.join('\n')
	}

	return message + EOL
}

function formatAngularDiagnostic(diag: Diagnostic, context: string) {
	const diagnostic = diag as Diagnostic & {
		file?: {text: string, fileName: string}
		start?: number
		length?: number
	}
	const messageText = formatDiagnosticMessage(diagnostic.messageText, '', context)
	const {file, span} = diagnostic

	interface LineColumn {line: number, col: number}
	let fileName: string|null = null
	let source: string|null = null
	let start: LineColumn|null = null
	let end: LineColumn|null = null

	if(file && typeof diagnostic.start === 'number' && typeof diagnostic.length === 'number') {
		source = file.text
		fileName = file.fileName
		start = lineColumn(source, diagnostic.start)
		end = lineColumn(source, diagnostic.start + diagnostic.length)
	}
	else if(span) {
		source = span.start.file.content
		fileName = span.start.file.url
		start = span.start
		end = span.end

		start.line++
		start.col++
		end.line++
		end.col++
	}
	else {
		return
	}

	const location: Location = {
		start: {
			line: start.line ,
			column: start.col
		},
		end: {
			line: end.line,
			column: end.col
		}
	}
	const red = chalk.red(`🚨  ${fileName}(${start.line},${start.col})`)

	const messages = [`${red}\n${chalk.redBright(messageText)}`]

	const frame = codeFrameColumns(source, location, {
		linesAbove: 1,
		linesBelow: 1,
		highlightCode: true
	})

	messages.push(
		frame
			.split('\n')
			.map(str => `  ${str}`)
			.join('\n')
	)

	return messages.join('\n') + EOL
}

function replaceAbsolutePaths(message: string, context: string) {
	const contextPath = normalizePath(context)

	return message.replace(new RegExp(contextPath, 'g'), '.')
}

function formatDiagnosticMessage(diagnostic: string|ts.DiagnosticMessageChain, delimiter: string, context: string) {
	return replaceAbsolutePaths(ts.flattenDiagnosticMessageText(diagnostic, delimiter), context)
}
