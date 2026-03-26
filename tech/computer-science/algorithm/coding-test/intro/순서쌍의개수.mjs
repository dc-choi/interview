const solution = (n) => {
    let count = 0;

    // i * i <= n 까지만 확인 (제곱근 최적화)
    for (let i = 1; i * i <= n; i++) {
        if (n % i === 0) {
            if (i * i === n) count++; // n이 완전제곱수일 때 (예: 4*4=16)
            else count+=2; // (i, n/i)와 (n/i, i) 두 쌍 추가
        }
    }

    return count;
}