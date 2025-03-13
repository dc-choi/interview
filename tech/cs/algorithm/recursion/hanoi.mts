const hanoi = (count: number, from: string, to: string, temp: string) => {
    if (count === 0) return;
    hanoi(count - 1, from, temp, to);
    console.log(`${count}를 ${from}에서 ${to}로 이동`);
    hanoi(count - 1, temp, to, from);
};

hanoi(3, 'A', 'C', 'B');