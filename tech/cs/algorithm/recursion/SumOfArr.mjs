const sumOfArr = (arr) => {
    if (arr.length === 1) return arr[0];
    return sumOfArr(arr.slice(0, -1)) + arr[arr.length - 1];
};

let arr = [1, 2, 3, 4, 5];
console.log(sumOfArr(arr)); // 15