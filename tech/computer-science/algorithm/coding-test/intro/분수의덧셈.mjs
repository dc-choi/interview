import assert from 'node:assert/strict';

const solution = (numer1, denom1, numer2, denom2) => {
    // 분자를 각 상대의 분모를 곱한 값끼리 더함.
    const top = (numer1 * denom2) + (numer2 * denom1);
    // 분모끼리 곱한다.
    const bottom = denom1 * denom2;

    let gcd = 1;

    // 분자와 분모의 최대공약수를 구한다.
    for (let i = 1; i <= bottom && i <= top; i++) {
        if (bottom % i === 0 && top % i === 0) {
            gcd = i;
        }
    }

    // 최대공약수로 약분한다.
    return [top / gcd, bottom / gcd];
};

assert.deepEqual(solution(1, 2, 3, 4), [5, 4]);
