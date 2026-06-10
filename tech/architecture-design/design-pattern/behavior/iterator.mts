type MyIteratorResult<T> = {
    value: T | undefined;
    done: boolean;
};

abstract class MyIterator<T> {
    abstract next(): MyIteratorResult<T>;

    hasNext(): boolean {
        const currentState = this.saveState();
        const result = this.next();
        this.restoreState(currentState);
        return !result.done;
    }

    protected abstract saveState(): any;
    protected abstract restoreState(state: any): void;

    toArray(): T[] {
        const result: T[] = [];
        let iterResult = this.next();
        while (!iterResult.done) {
            if (iterResult.value !== undefined) {
                result.push(iterResult.value);
            }
            iterResult = this.next();
        }
        return result;
    }

    take(count: number): T[] {
        const result: T[] = [];
        for (let i = 0; i < count && this.hasNext(); i++) {
            const iterResult = this.next();
            if (iterResult.value !== undefined) {
                result.push(iterResult.value);
            }
        }
        return result;
    }

    forEach(callback: (value: T, index: number) => void): void {
        let index = 0;
        let result = this.next();
        while (!result.done) {
            if (result.value !== undefined) {
                callback(result.value, index++);
            }
            result = this.next();
        }
    }

    map<U>(callback: (value: T) => U): U[] {
        const result: U[] = [];
        let iterResult = this.next();
        while (!iterResult.done) {
            if (iterResult.value !== undefined) {
                result.push(callback(iterResult.value));
            }
            iterResult = this.next();
        }
        return result;
    }

    filter(predicate: (value: T) => boolean): T[] {
        const result: T[] = [];
        let iterResult = this.next();
        while (!iterResult.done) {
            if (iterResult.value !== undefined && predicate(iterResult.value)) {
                result.push(iterResult.value);
            }
            iterResult = this.next();
        }
        return result;
    }

    find(predicate: (value: T) => boolean): T | undefined {
        let iterResult = this.next();
        while (!iterResult.done) {
            if (iterResult.value !== undefined && predicate(iterResult.value)) {
                return iterResult.value;
            }
            iterResult = this.next();
        }
        return undefined;
    }

    reduce<U>(callback: (acc: U, current: T) => U, initialValue: U): U {
        let accumulator = initialValue;
        let iterResult = this.next();
        while (!iterResult.done) {
            if (iterResult.value !== undefined) {
                accumulator = callback(accumulator, iterResult.value);
            }
            iterResult = this.next();
        }
        return accumulator;
    }
}

class RangeIterator extends MyIterator<number> {
    private current: number;
    private readonly max: number;
    private readonly step: number;

    constructor(start: number, end: number, step: number = 1) {
        super();
        this.current = start;
        this.max = end;
        this.step = step;
    }

    next(): MyIteratorResult<number> {
        if ((this.step > 0 && this.current <= this.max) ||
            (this.step < 0 && this.current >= this.max)) {
            const value = this.current;
            this.current += this.step;
            return { value, done: false };
        }
        return { value: undefined, done: true };
    }

    protected saveState() {
        return { current: this.current };
    }

    protected restoreState(state: any) {
        this.current = state.current;
    }
}

class ArrayIterator<T> extends MyIterator<T> {
    private index: number = 0;
    private readonly array: T[];

    constructor(array: T[]) {
        super();
        this.array = array;
    }

    next(): MyIteratorResult<T> {
        if (this.index < this.array.length) {
            return { value: this.array[this.index++], done: false };
        }
        return { value: undefined, done: true };
    }

    peek(): T | undefined {
        return this.index < this.array.length ? this.array[this.index] : undefined;
    }

    reset(): void {
        this.index = 0;
    }

    protected saveState() {
        return { index: this.index };
    }

    protected restoreState(state: any) {
        this.index = state.index;
    }
}

class StringIterator extends MyIterator<string> {
    private index: number = 0;
    private readonly content: string;

    constructor(content: string) {
        super();
        this.content = content;
    }

    next(): MyIteratorResult<string> {
        if (this.index < this.content.length) {
            return { value: this.content[this.index++], done: false };
        }
        return { value: undefined, done: true };
    }

    protected saveState() {
        return { index: this.index };
    }

    protected restoreState(state: any) {
        this.index = state.index;
    }
}

class MyIterable<T> {
    private iterator: MyIterator<T>;

    constructor(iterator: MyIterator<T>) {
        this.iterator = iterator;
    }

    static fromArray<T>(array: T[]): MyIterable<T> {
        return new MyIterable(new ArrayIterator(array));
    }

    static fromRange(start: number, end: number, step?: number): MyIterable<number> {
        return new MyIterable(new RangeIterator(start, end, step));
    }

    static fromString(str: string): MyIterable<string> {
        return new MyIterable(new StringIterator(str));
    }

    // Iterator 메서드들 위임
    forEach(callback: (value: T, index: number) => void): void {
        this.iterator.forEach(callback);
    }

    map<U>(callback: (value: T) => U): U[] {
        return this.iterator.map(callback);
    }

    filter(predicate: (value: T) => boolean): T[] {
        return this.iterator.filter(predicate);
    }

    find(predicate: (value: T) => boolean): T | undefined {
        return this.iterator.find(predicate);
    }

    reduce<U>(callback: (acc: U, current: T) => U, initialValue: U): U {
        return this.iterator.reduce(callback, initialValue);
    }

    take(count: number): T[] {
        return this.iterator.take(count);
    }

    toArray(): T[] {
        return this.iterator.toArray();
    }
}

// 숫자 범위
const range = MyIterable.fromRange(1, 10, 2);
console.log("홀수들:", range.toArray()); // [1, 3, 5, 7, 9]

// 배열
const fruits = MyIterable.fromArray(["apple", "banana", "cherry"]);
console.log("과일들:");
fruits.forEach((fruit, index) => {
    console.log(`${index}: ${fruit}`);
});

// 문자열
const chars = MyIterable.fromString("Hello");
const upperChars = chars.map(c => c.toUpperCase());
console.log("대문자 변환:", upperChars); // ['H', 'E', 'L', 'L', 'O']

// 복합 연산
const numbers = MyIterable.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const evenSquares = numbers
    .filter(n => n % 2 === 0)
    .map(n => n * n);
console.log("짝수의 제곱:", evenSquares); // [4, 16, 36, 64, 100]

// reduce 사용
const sum = MyIterable.fromRange(1, 100).reduce((acc, curr) => acc + curr, 0);
console.log("1부터 100까지의 합:", sum); // 5050

// find 사용
const firstEven = MyIterable.fromArray([1, 3, 5, 8, 9, 12]).find(n => n % 2 === 0);
console.log("첫 번째 짝수:", firstEven); // 8
