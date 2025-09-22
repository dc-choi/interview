/**
 * myMap()
 */
const myMap = <T, U>(arr: T[], fn: (item: T) => U): U[] => {
    const result: U[] = [];

    for (const element of arr) {
        result.push(fn(element));
    }

    return result;
}

const result = myMap([1, 2, 3], (item) => item * 2);
const result2 = myMap([1, 2, 3], (item) => item.toFixed(2));
console.log(result); // [2, 4, 6]
console.log(result2); // ['1.00', '2.00', '3.00']

/**
 * myForEach()
 */
const myForEach = <T>(arr: T[], fn: (item: T, index: number) => void): void => {
    for (let index = 0; index < arr.length; index++) {
        fn(arr[index], index);
    }
};

myForEach(['a', 'b', 'c'], (item, index) => {
    console.log(`${index}: ${item}`);
});

/**
 * myReduce()
 */
const myReduce = <T, U>(arr: T[], fn: (acc: U, item: T) => U, initialValue: U): U => {
    let accumulator = initialValue;

    for (const element of arr) {
        accumulator = fn(accumulator, element);
    }

    return accumulator;
};

const sum = myReduce([1, 2, 3, 4], (acc, item) => acc + item, 0);
console.log(sum); // 10

/**
 * myFilter()
 */
const myFilter = <T>(arr: T[], fn: (item: T) => boolean): T[] => {
    const result: T[] = [];

    for (const element of arr) {
        if (fn(element)) {
            result.push(element);
        }
    }

    return result;
};

const evens = myFilter([1, 2, 3, 4, 5, 6], (item) => item % 2 === 0);
console.log(evens); // [2, 4, 6]

/**
 * myFind()
 */
const myFind = <T>(arr: T[], fn: (item: T) => boolean): T | undefined => {
    for (const element of arr) {
        if (fn(element)) {
            return element;
        }
    }

    return undefined;
};

const found = myFind([1, 2, 3, 4, 5], (item) => item > 3);
console.log(found); // 4

/**
 * mySome()
 */
const mySome = <T>(arr: T[], fn: (item: T) => boolean): boolean => {
    for (const element of arr) {
        if (fn(element)) {
            return true;
        }
    }

    return false;
};

const hasEven = mySome([1, 3, 5, 6], (item) => item % 2 === 0);
console.log(hasEven); // true

/**
 * myEvery()
 */
const myEvery = <T>(arr: T[], fn: (item: T) => boolean): boolean => {
    for (const element of arr) {
        if (!fn(element)) {
            return false;
        }
    }

    return true;
};

const allPositive = myEvery([1, 2, 3, 4], (item) => item > 0);
console.log(allPositive); // true

/**
 * myFlatMap()
 */
const myFlatMap = <T, U>(arr: T[], fn: (item: T) => U[]): U[] => {
    const result: U[] = [];

    for (const element of arr) {
        result.push(...fn(element));
    }

    return result;
};

const flatMapped = myFlatMap([1, 2, 3], (item) => [item, item * 2]);
console.log(flatMapped); // [1, 2, 2, 4, 3, 6]
