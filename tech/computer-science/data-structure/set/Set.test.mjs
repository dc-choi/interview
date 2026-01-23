import { MySet } from "./Set.mjs";

let mySet = new MySet();
console.log(mySet.isEmpty());

mySet.add(1);
mySet.add(1);
mySet.add(2);
mySet.add(3);

mySet.print();
console.log(mySet.isEmpty());

console.log(mySet.isContains(1));

mySet.remove(1);
mySet.print();
console.log(mySet.isEmpty());

console.log(mySet.isContains(1));

mySet.clear();
console.log(mySet.isEmpty());
