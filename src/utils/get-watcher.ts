const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// TODO: find a better way to do this
export async function getWatcher(bundler: any): Promise<any|null> {
	if(!bundler.options.watch) {
		return null
	}

	while(!bundler.watcher) {
		await sleep(5)
	}

	return bundler.watcher
}
