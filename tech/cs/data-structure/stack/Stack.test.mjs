import { MyStack, MyStack2 } from "./Stack.mjs";

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

let stack2 = new MyStack2();
stack2.push(1);
stack2.push(2);
stack2.push(3);
stack2.push(4);
stack2.push(5);
console.log(stack2.pop().data); // 5
console.log(stack2.pop().data); // 4
console.log(stack2.pop().data); // 3