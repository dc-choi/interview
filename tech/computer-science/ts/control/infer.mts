/**
 * infer
 *
 * 특정 타입 안에서 추론된 타입을 변수처럼 빼내서 사용하는 것
 */

type FuncA = () => string;
type FuncB = () => number;

type ReturnType<T> = T extends () => infer R ? R : never;

type A = ReturnType<FuncA>; // string
type B = ReturnType<FuncB>; // number
type C = ReturnType<number>; // never

type PromiseReturnType<T> = T extends Promise<infer R> ? R : never;
type PromiseA = PromiseReturnType<Promise<number>>; // number
type PromiseB = PromiseReturnType<Promise<string>>;