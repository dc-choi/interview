const myFunc = (n) => {
    if (n > 10) return;
    console.log(n);
    myFunc(n + 1);
};

myFunc(1);