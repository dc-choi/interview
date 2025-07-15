// never
// 존재하지 않는, 불가능한 타입.

function error(message: string): never {
    throw new Error(message);
}

error('hello');

// 아래는 불가능.
// let never: never;
// never = 1;
// never = 'hello';
// never = true;