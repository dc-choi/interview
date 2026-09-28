// 표준 IteratorResult처럼 done으로 값과 종료를 구분하는 유니언이다.
// 원소 자체가 undefined여도 done이 false면 값으로 취급한다.
type MyIteratorResult<T> =
    | { value: T; done: false }
    | { value: undefined; done: true };

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
            result.push(iterResult.value);
            iterResult = this.next();
        }
        return result;
    }

    take(count: number): T[] {
        const result: T[] = [];
        for (let i = 0; i < count && this.hasNext(); i++) {
            const iterResult = this.next();
            if (!iterResult.done) {
                result.push(iterResult.value);
            }
        }
        return result;
    }

    forEach(callback: (value: T, index: number) => void): void {
        let index = 0;
        let result = this.next();
        while (!result.done) {
            callback(result.value, index++);
            result = this.next();
        }
    }

    map<U>(callback: (value: T) => U): U[] {
        const result: U[] = [];
        let iterResult = this.next();
        while (!iterResult.done) {
            result.push(callback(iterResult.value));
            iterResult = this.next();
        }
        return result;
    }

    filter(predicate: (value: T) => boolean): T[] {
        const result: T[] = [];
        let iterResult = this.next();
        while (!iterResult.done) {
            if (predicate(iterResult.value)) {
                result.push(iterResult.value);
            }
            iterResult = this.next();
        }
        return result;
    }

    find(predicate: (value: T) => boolean): T | undefined {
        let iterResult = this.next();
        while (!iterResult.done) {
            if (predicate(iterResult.value)) {
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
            accumulator = callback(accumulator, iterResult.value);
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

// Aggregate 역할이다. Iterator 인스턴스 하나를 보관하면 첫 연산이 순회 위치를 옮겨
// 다음 연산이 중간부터 이어지거나 빈 결과를 내므로, Iterator를 만드는 함수를 보관하고
// 연산마다 처음부터 시작하는 새 Iterator를 만든다.
class MyIterable<T> {
    private readonly createIterator: () => MyIterator<T>;

    constructor(createIterator: () => MyIterator<T>) {
        this.createIterator = createIterator;
    }

    static fromArray<T>(array: T[]): MyIterable<T> {
        return new MyIterable(() => new ArrayIterator(array));
    }

    static fromRange(start: number, end: number, step?: number): MyIterable<number> {
        return new MyIterable(() => new RangeIterator(start, end, step));
    }

    static fromString(str: string): MyIterable<string> {
        return new MyIterable(() => new StringIterator(str));
    }

    // 연산마다 새 Iterator를 만들어 위임한다
    forEach(callback: (value: T, index: number) => void): void {
        this.createIterator().forEach(callback);
    }

    map<U>(callback: (value: T) => U): U[] {
        return this.createIterator().map(callback);
    }

    filter(predicate: (value: T) => boolean): T[] {
        return this.createIterator().filter(predicate);
    }

    find(predicate: (value: T) => boolean): T | undefined {
        return this.createIterator().find(predicate);
    }

    reduce<U>(callback: (acc: U, current: T) => U, initialValue: U): U {
        return this.createIterator().reduce(callback, initialValue);
    }

    take(count: number): T[] {
        return this.createIterator().take(count);
    }

    toArray(): T[] {
        return this.createIterator().toArray();
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
// 같은 MyIterable을 다시 순회해도 새 Iterator로 처음부터 순회한다
console.log("다시 순회:", fruits.toArray()); // ['apple', 'banana', 'cherry']

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

// undefined 원소도 done으로 종료를 판단하므로 빠지지 않는다
const withUndefined = MyIterable.fromArray([1, undefined, 3]).toArray();
console.log("undefined 원소 보존:", withUndefined); // [1, undefined, 3]
