import {getSocketPath} from 'parcel-plugin-typescript/exports'
import rp = require('request-promise')

import {ServerRequest, ServerResponse} from '../../interfaces'

async function request<RQ, RS, K extends Keys<RQ, RS> = Keys<RQ, RS>>(
	name: string, endpoint: K, data: RQ[K]
): Promise<RS[K]> {
	const response: {result?: RS[K], error?: any} = await rp({
		uri: `http://unix:${getSocketPath(name)}:/${endpoint}`,
		method: 'POST',
		body: {data},
		json: true
	})

	if(response.error) {
		throw new Error(response.error)
	}

	return response.result!
}

export type Keys<T, U> = (keyof T) & (keyof U)
export type Client<RQ, RS, K extends Keys<RQ, RS> = Keys<RQ, RS>> = {
	[P in K]: (data: RQ[P]) => Promise<RS[P]>
}

function makeClient<RQ, RS, K extends Keys<RQ, RS> = Keys<RQ, RS>>(name: string, keys: K[]): Client<RQ, RS, K> {
	const object: Partial<Client<RQ, RS>> = {}

	keys.forEach(key => object[key] = data => request<RQ, RS>(name, key, data))

	return object as Client<RQ, RS>
}

// TODO: use type introspection
export const IPCClient = makeClient<ServerRequest, ServerResponse>('angular', [
	'compile', 'typeCheck', 'processResource', 'readVirtualFile'
])
