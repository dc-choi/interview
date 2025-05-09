function solution(numer1, denom1, numer2, denom2) {
    // 분자를 각 상대의 분모를 곱한 값끼리 더함.
    const top = (numer1 * denom2) + (numer2 * denom1);
    // 분모끼리 곱한다.
    const bottom = denom1 * denom2;

    let lcm = 1;

    // 최소공배수(두 자연수의 공통된 배수중 가장 작은 수)를 구하는 로직
    for (let i = 1; i <= bottom && i <= top; i++) {
        if (bottom % i === 0 && top % i === 0) {
            lcm = i;
        }
    }

    // 최소공배수로 약분한다.
    return [top / lcm, bottom / lcm];
}