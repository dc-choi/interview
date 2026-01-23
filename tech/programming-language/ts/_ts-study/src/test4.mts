const example = { name: 'example' };
// TS2588: Cannot assign to example because it is a constant.
// example = { name: 'example2' };
example.name = 'test'; // OK

const example2 = { name: 'example2' } as const;
// TS2588: Cannot assign to example2 because it is a constant.
// example2 = { name: 'example2' };
// TS2540: Cannot assign to name because it is a read-only property.
// example2.name = 'testing-quality';

let example3 = { name: 'example3' } as const;
example3 = { name: 'example3' }; // OK
// TS2540: Cannot assign to name because it is a read-only property
// example3.name = 'testing-quality';

interface Test {
    name: string;
}

interface User {
    readonly id: number;
    readonly name?: string;
    readonly children?: User[];
    readonly test?: Test;
}

const test: Test = { name: 'test' };
const bob: User = { id: 1, name: 'Bob' };
const john: User = { id: 2, name: 'John' };
const jane: User = { id: 3, name: 'Jane' };

const me: User = { id: 4, name: 'Me', children: [bob, john, jane], test };
// TS2540: Cannot assign to name because it is a read-only property
// me.name = 'My Own Name';
// TS2540: Cannot assign to children because it is a read-only property.
// me.children = [jane];
// TS2540: Cannot assign to children because it is a read-only property.
// me.children = me.children?.map((child, index) => ({ id: index + 5, name: 'Child' }));
test.name = 'Test'; // OK
