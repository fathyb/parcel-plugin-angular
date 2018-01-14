export class AsyncLoop<T> {
	private running = false
	private readonly queue: T[] = []
	private readonly watchers: Array<() => void> = []

	constructor(
		private readonly work: (data: T[]) => Promise<void>
	) {}

	public async emit(data: T): Promise<void> {
		this.queue.push(data)

		if(this.running) {
			return this.wait()
		}

		this.running = true

		try {
			await this.work(this.queue.splice(0))
		}
		finally {
			this.running = false

			while(this.watchers.length > 0) {
				this.watchers.pop()!()
			}
		}
	}

	public wait(): Promise<void> {
		if(!this.running) {
			return Promise.resolve()
		}

		return this.waitCurrentOrNext()
	}

	public waitCurrentOrNext(): Promise<void> {
		return new Promise<void>(resolve =>
			this.watchers.push(resolve)
		)
	}
}
