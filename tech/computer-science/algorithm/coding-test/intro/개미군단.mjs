const solution = (hp) => {
    let count = Math.floor(hp / 5);
    hp %= 5;

    count += Math.floor(hp / 3);
    hp %= 3;

    count += Math.floor(hp / 1);

    return count;
}