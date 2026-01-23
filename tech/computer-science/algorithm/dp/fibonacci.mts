const fibonacci = (n: number) => {
    return n <= 1 ? n : fibonacci(n - 2) + fibonacci(n - 1);
};

const fibonacciWithMemo = (n: number, memo: object) => {
    if (n <= 1) return n;

    if (memo[n] == null) {
        memo[n] = fibonacciWithMemo(n - 2, memo) + fibonacciWithMemo(n - 1, memo);
    }

    return memo[n];
};

const fibonacciWithTable = (n: number) => {
    if (n <= 1) return n;

    let table = [0, 1];

    for (let i = 2; i <= n; i++) {
        table[i] = table[i - 2] + table[i - 1];
    }

    return table[n];
};

let start = new Date();
console.log(fibonacci(40));
let end = new Date();
console.log(end.getTime() - start.getTime());

start = new Date();
console.log(fibonacciWithMemo(40, {}));
end = new Date();
console.log(end.getTime() - start.getTime());

start = new Date();
console.log(fibonacciWithTable(40));
end = new Date();
console.log(end.getTime() - start.getTime());
