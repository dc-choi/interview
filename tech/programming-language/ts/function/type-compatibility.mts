/**
 * 함수 타입 호환성
 *
 * 특정 합수 타입을 다른 함수 타입으로 취급해도 괜찮은가 판단하는 것.
 *
 * 1. 반환값의 타입이 호환되는가?
 * 2. 매개변수의 타입이 호환되는가?
 */

// 반환값이 호환되는가?
type A = () => number;
type B = () => 10;

let a: A = () => 10;
let b: B = () => 10;

a = b; // OK: B의 반환값은 A의 반환값에 할당 가능
// b = a; // Error: A의 반환값은 B의 반환값에 할당 불가능

console.log(a());
console.log(b());

// 매개변수가 호환되는가?
// 1. 매개변수의 개수가 같을 때
// 이 경우 다운캐스팅은 가능한데 업캐스팅은 불가능하다.
type C = (x: number) => void;
type D = (x: 10) => void;

let c: C = (x) => console.log(x);
let d: D = (x) => console.log(x);

c(20);
// d(20);

// 2. 매개변수의 개수가 다를 때
type Animal = { name: string; };
type Dog = { name: string; breed: string; };
type AnimalFunc = (a: Animal) => void;
type DogFunc = (d: Dog) => void;

let animalFunc: AnimalFunc = (a) => console.log(a.name);
let dogFunc: DogFunc = (d) => console.log(d.name, d.breed);

// animalFunc({ name: 'Buddy', breed: 'Golden Retriever' });
dogFunc({ name: 'Buddy', breed: 'Golden Retriever' });

type Func1 = (x: number, y: number) => void;
type Func2 = (x: number) => void;

let func1: Func1 = (x, y) => console.log(x, y);
let func2: Func2 = (x) => console.log(x);

func1 = func2; // OK: func2는 func1의 매개변수 개수에 맞출 수 있음
// func2 = func1; // Error: func1은 func2의 매개변수 개수에 맞출 수 없음