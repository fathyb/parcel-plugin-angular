import {getSocketPath} from 'parcel-plugin-typescript/exports'

import {AngularServer} from './backend/worker'
import {injectAngularSupport} from './frontend/patch'
import {getPluginConfig} from './utils/environment'

export = (bundler: any) => {
	const {watch} = bundler.options
	const config = getPluginConfig()
	let tsAsset: string|null = null

	if((watch && config.watch === 'aot') || (!watch && config.build === 'aot')) {
		// Workaround for the resolving/cache issues with Angular generated files
		injectAngularSupport(bundler)

		bundler.options.__closureKeepJSAsset = true
		// We register .js files for the generated ngfactory/ngstyles files
		bundler.addAssetType('js', require.resolve('./frontend/assets/virtual'))

		tsAsset = require.resolve('./frontend/assets/aot')
	}
	else {
		tsAsset = require.resolve('./frontend/assets/jit')
	}

	// process.send is only defined on the main process
	if(!process.send) {
		// TODO: fix this
		getSocketPath('angular')

		const server = new AngularServer(bundler)

		bundler.on('buildEnd', () => server.close())
	}

	bundler.addAssetType('ts', tsAsset)
	bundler.addAssetType('tsx', tsAsset)
}
