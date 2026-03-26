const solution = (array) => {
    if (array.length === 0) return -1;

    const map = new Map();
    let answer = 0;
    let maxCount = 0;
    let isDuplicate = false;

    for (const num of array) {
        const newCount = (map.get(num) || 0) + 1;
        map.set(num, newCount);

        if (maxCount < newCount) {
            maxCount = newCount;
            answer = num;
            isDuplicate = false;
        } else if (maxCount === newCount && num !== answer) {
            isDuplicate = true;
        }
    }

    return isDuplicate ? -1 : answer;
};
