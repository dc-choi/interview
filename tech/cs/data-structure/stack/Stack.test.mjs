import { MyStack } from "./Stack.mjs";

let stack = new MyStack();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.pop().data); // 3
console.log(stack.pop().data); // 2
console.log(stack.pop().data); // 1

stack.push(4);
stack.push(5);
console.log(stack.peek().data); // 5
stack.pop();
console.log(stack.peek().data); // 4
stack.pop();
console.log(stack.isEmpty()); // null
console.log(stack.pop()); // null