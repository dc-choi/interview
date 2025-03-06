import { Deque } from "./Deque.mjs";

let deque = new Deque();

deque.addFirst(1);
deque.addFirst(2);
deque.addFirst(3);
deque.addFirst(4);
deque.addFirst(5);
deque.print();

deque.removeFirst();
deque.print();
deque.removeFirst();
deque.print();
deque.removeFirst();
deque.print();
deque.removeFirst();
deque.print();

deque.addLast(2);
deque.addLast(3);
deque.addLast(4);
deque.addLast(5);
deque.print();

deque.removeLast();
deque.print();
deque.removeLast();
deque.print();
deque.removeLast();
deque.print();
deque.removeLast();
deque.print();

console.log(deque.isEmpty());
deque.removeLast();
console.log(deque.isEmpty());
