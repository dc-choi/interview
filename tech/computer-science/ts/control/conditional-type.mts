/**
 * 조건부 타입
 */

type ObjA = { a: string; common: number };
type ObjB = { a: string; };

type ObjectType = ObjA extends ObjB ? number : string;

/**
 * 제네릭과 조건부 타입
 */

type StringNumberSwitch<T> = T extends string ? number : string;
let val: StringNumberSwitch<number>; // string
let val2: StringNumberSwitch<string>; // number

function removeSpaces<T>(text: T): T extends string ? string : undefined;
function removeSpaces<T>(text: T) {
    if (typeof text === 'string') {
        return text.replace(/\s/g, '');
    } else {
        return undefined;
    }
}

/**
 * 분산적인 조건부 타입
 */

type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

// 이렇게 하면 분산적인 조건부 타입이 적용되지 않음
type StringNumberSwitch2<T> = [T] extends [string] ? number : string;

type A = Exclude<number | string | boolean, string>;
type B = Extract<number | string | boolean, string>;

let val3: StringNumberSwitch2<string | number>; // string
