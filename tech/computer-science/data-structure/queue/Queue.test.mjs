import { MyQueue } from "./Queue.mjs";

let queue = new MyQueue();

queue.enqueue(1);
queue.enqueue(2);
queue.enqueue(3);

console.log(queue.front());

console.log(queue.dequeue().data);
console.log(queue.dequeue().data);
console.log(queue.dequeue().data);
console.log(queue.dequeue());

console.log(queue.isEmpty());