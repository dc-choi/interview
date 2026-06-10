// ==============================================================================
/**
 * Multiton
 */
// ==============================================================================

class Multiton {
    private static instances: Map<string, Multiton> = new Map();

    private constructor(private key: string) {}

    public static getInstance(key: string): Multiton {
        if (!Multiton.instances.has(key)) {
            Multiton.instances.set(key, new Multiton(key));
        }
        return Multiton.instances.get(key)!;
    }

    public static getKeys(): IterableIterator<string> {
        return this.instances.keys();
    }
}

const db1 = Multiton.getInstance('database1');
const db2 = Multiton.getInstance('database2');
const db1Again = Multiton.getInstance('database1');

console.log(db1 === db1Again); // true
console.log(db1 === db2); // false

for (const key of Multiton.getKeys()) {
    console.log(key);
}

// ==============================================================================
/**
 * SingletonRegistry
 */
// ==============================================================================

class Logger {}
class Config {}
class SingletonRegistry {
    private static instances: Map<string, any> = new Map();

    public static register<T>(key: string, instance: T): void {
        if (!SingletonRegistry.instances.has(key)) {
            SingletonRegistry.instances.set(key, instance);
        }
    }

    public static getInstance<T>(key: string): T | undefined {
        return SingletonRegistry.instances.get(key);
    }

    public static getKeys(): IterableIterator<string> {
        return this.instances.keys();
    }
}

// 사용
SingletonRegistry.register('logger', new Logger());
SingletonRegistry.register('config', new Config());

const logger = SingletonRegistry.getInstance<Logger>('logger');
const config = SingletonRegistry.getInstance<Config>('config');

for (const key of SingletonRegistry.getKeys()) {
    console.log(key);
}
