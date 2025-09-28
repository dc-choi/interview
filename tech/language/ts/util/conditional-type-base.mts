/**
 * Exclude<T, U>
 *
 * T에서 U를 제외한 타입을 반환하는 유틸리티 타입
 */

type MyExclude<Type, Remove> = Type extends Remove ? never : Type;

/**
 * Extract<T, U>
 *
 * T에서 U를 할당한 타입을 반환하는 유틸리티 타입
 */

type Extract<Type, Add> = Type extends Add ? Type : never;

/**
 * ReturnType<T>
 *
 * 함수 타입 T의 반환 타입을 추출하는 유틸리티 타입
 */

type ReturnType<Type extends (...args: any) => any> =
    Type extends (...args: any) =>
        infer Result ? Result : never;

function add(x: number, y: number): number;
function add(x: number, y: number, z: number): number;
function add(x: number, y: number, z: number, xy: number): number;
function add(x: number, y: number, z: number, xy: number, xz: number): number;
function add(x: number, y: number, z: number, xy: number, xz: number, yz: number): number;
function add(...args: number[]): number {
    return args.reduce((acc, curr) => acc + curr, 0);
}

type AddReturnType = ReturnType<typeof add>; // number