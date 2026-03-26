// 1번 풀이 방법
// const solution = (n) => {
//     const answer = [];
//
//     for (let i = 1; i <= n; i+= 2) answer.push(i);
//
//     return answer;
// };

// 2번 풀이 방법
const solution = (n) => Array.from({ length: Math.floor((n + 1) / 2) }, (_, i) => i * 2 + 1);