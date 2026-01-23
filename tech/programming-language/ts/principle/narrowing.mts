/**
 * 타입 좁히기
 *
 * 조건문 등을 사용햇 넓은 타입에서 좁은 타입트로 상황에 따라 좁히는 방법
 */

type Person = {
    name: string;
    age: number;
    occupation?: string;
};

const func = (x: string | number | Date | Person) => {
    switch (typeof x) {
        case "string":
            console.log(x.toUpperCase());
            break;
        case "number":
            console.log(x.toFixed());
            break;
        case "object":
            if (x instanceof Date) { // 가능
                console.log(x.getTime());
            // } else if (x instanceof Person) { // 런타임에 활용할 수 없어서 불가능
            } else if (x && "age" in x && "name" in x) { // 가능
                console.log(x);
            }
            break;
        default:
            console.log(x);
    }
};
func("hello");
func(1234);
func(new Date());
func({ name: "Alice", age: 30, occupation: "Engineer" });