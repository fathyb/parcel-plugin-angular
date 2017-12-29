import HTMLAssetLib = require('parcel-bundler/lib/assets/HTMLAsset')
import HTMLAssetSrc = require('parcel-bundler/src/assets/HTMLAsset')

import parse = require('posthtml-parser')
import api = require('posthtml/lib/api')

export const HTMLAsset = parseInt(process.versions.node, 10) < 8 ? HTMLAssetLib : HTMLAssetSrc

/// Same as HTMLAsset but uses case-sensitive attribute names
export class TemplateAsset extends HTMLAsset {
	public parse(code: string) {
		const res = parse(code)

		res.walk = api.walk
		res.match = api.match

		return res
	}
}
