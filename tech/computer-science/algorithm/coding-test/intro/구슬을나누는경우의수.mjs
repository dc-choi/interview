import assert from 'node:assert/strict';

function solution(balls, share) {
    const count = Math.min(share, balls - share);
    let answer = 1;

    for (let i = 1; i <= count; i++) {
        answer = answer * (balls - i + 1) / i;
    }

    return answer;
}

assert.equal(solution(3, 2), 3);
