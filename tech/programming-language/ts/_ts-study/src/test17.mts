interface Config {
    timeout?: number;
    retries?: number;
    debug?: boolean;
}

class ApiClient {
    private readonly config: Config;

    private constructor(config: Config) {
        this.config = config;
    }

    static create(config: Config = {}) {
        return new ApiClient({
            timeout: config.timeout ?? 5000,
            retries: config.retries ?? 3,
            debug: config.debug ?? false
        });
    }
}

const client = ApiClient.create({});
console.log(client);
