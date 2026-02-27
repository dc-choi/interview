/**
 * 인터페이스의 상속
 */

// type alias도 상속이 가능하다.
interface Animal {
    name: string;
    age: number;
}

interface Dog extends Animal {
    name: "Dog"; // 리터럴 타입으로 재정의 (서브타입만 재정의 가능)
    breed: string;
}

interface Cat extends Animal {
    color: string;
}

interface Chicken extends Animal {
    eggPerDay: number;
}

// 다중 상속 가능
interface CatChicken extends Cat, Chicken {}

const dog: Dog = {
    name: "Dog",
    age: 3,
    breed: "Golden Retriever",
};

const cat: Cat = {
    name: "Whiskers",
    age: 2,
    color: "Gray",
};

const chicken: Chicken = {
    name: "Clucky",
    age: 1,
    eggPerDay: 5,
};

const dogCat: CatChicken = {
    name: "Dog",
    age: 4,
    color: "Brown",
    eggPerDay: 3,
};

console.log(dog);
console.log(cat);
console.log(chicken);
console.log(dogCat);
