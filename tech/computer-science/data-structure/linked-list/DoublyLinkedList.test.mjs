import { DoublyLinkedList } from "./DoublyLinkedList.mjs";

let list = new DoublyLinkedList();
list.insert(0);
list.insert(1);
list.insert(2);
list.insert(3);
list.print();

list.delete();
list.print();
list.delete();
list.print();
list.delete();
list.print();
