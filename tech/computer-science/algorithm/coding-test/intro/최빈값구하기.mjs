const solution = (array) => {
    if (array.length === 0) return -1;

    const map = new Map();
    let answer = 0;
    let maxCount = 0;
    let isDuplicate = false;

    // O(N)의 시간복잡도
    for (const num of array) {
        const newCount = (map.get(num) || 0) + 1;
        map.set(num, newCount);

        if (maxCount < newCount) { // 새로운 최대값이 나온 경우
            maxCount = newCount;
            answer = num;
            isDuplicate = false;
        } else if (maxCount === newCount && num !== answer) { // 최대값이 중복되는 경우
            isDuplicate = true;
        }
    }

    return isDuplicate ? -1 : answer;
};
