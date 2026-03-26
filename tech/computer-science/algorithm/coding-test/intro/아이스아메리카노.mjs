const solution = (money) => {
    const coffee = Math.floor(money / 5500);
    const fee = money % 5500;

    return [coffee, fee];
};
