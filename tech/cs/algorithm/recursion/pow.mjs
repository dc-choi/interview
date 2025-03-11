const pow = (x, n) => {
    if (n === 0) return 1;
    return pow(x, n - 1) * x;
}

console.log(pow(2, 5)); // 32