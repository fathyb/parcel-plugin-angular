import {readFileSync} from 'fs'

import commentsJson = require('comment-json')
import findUp = require('find-up')

export type AngularBuildMode = 'aot'|'jit'

export interface PluginConfiguration {
	watch: AngularBuildMode
	build: AngularBuildMode
}

const defaultConfig: PluginConfiguration = {
	watch: 'jit',
	build: 'aot'
}

export function getPluginConfig(): PluginConfiguration {
	const path = findUp.sync('tsconfig.json')

	if(!path) {
		return defaultConfig
	}

	try {
		const {
			build = defaultConfig.build,
			watch = defaultConfig.watch
		} = commentsJson.parse(readFileSync(path, {encoding: 'utf-8'})).parcelAngularOptions || {} as PluginConfiguration

		if(build !== 'aot' && build !== 'jit') {
			throw new Error('[ParcelTypeScriptPlugin] parcelTsPluginOptions.angular.build should be a "jit" or "aot"')
		}

		if(watch !== 'aot' && watch !== 'jit') {
			throw new Error('[ParcelTypeScriptPlugin] parcelTsPluginOptions.angular.watch should be a "jit" or "aot"')
		}

		return {build, watch}
	}
	catch(_) {
		return defaultConfig
	}
}
