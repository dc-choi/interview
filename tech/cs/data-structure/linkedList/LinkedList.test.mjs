import {LinkedList} from "./LinkedList.mjs";

let list = new LinkedList();
list.insert(0);
list.insert(1);
list.insert(2);
list.insert(3);
list.insert(4);
list.insert(5);
list.print();
list.clearAll();

list.insert(0);
list.insert(1);
list.insert(2);
list.insertAt(1, 3);
list.print();
list.deleteAt(0);
list.print();
list.deleteAt(1);
list.print();
list.delete();
list.print();

console.log(list.getNode(0));
