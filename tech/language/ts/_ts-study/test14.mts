type Callback = (num: number, num2: number) => void
const callWithRandomNumber = (callback: Callback) => {
    callback(Math.random(), Math.random());
}

callWithRandomNumber((num, num2) => {
    console.log(num, num2);
});

const callback: Callback = (num: number, num2: number) => {
    console.log(num, num2);
}
callWithRandomNumber(callback);
