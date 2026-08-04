---
tags: [cs, algorithm, bitmask, dynamic-programming, tsp, np-hard]
status: done
category: "CS - 알고리즘"
aliases: ["Bitmask DP and TSP", "비트마스크 DP", "외판원 문제", "Traveling Salesman Problem"]
---

# 비트마스크 DP와 외판원 문제

선택 대상이 적을 때 정수의 각 bit를 포함 여부로 쓰면 subset을 작고 빠르게 표현할 수 있다. 도시 `i`를 방문했는지는 `mask`의 `i`번째 bit로 나타낸다.

## 기본 연산

```text
포함 확인:   (mask & (1 << i)) != 0
추가:        mask | (1 << i)
제거:        mask & ~(1 << i)
toggle:      mask ^ (1 << i)
전체 집합:   (1 << n) - 1
```

operator precedence가 헷갈리므로 괄호를 명시한다. JavaScript의 Number bitwise 연산은 operand를 32-bit integer로 변환하므로 큰 set에는 그대로 쓸 수 없다. `BigInt` bitwise 연산, bitset library나 word array를 검토한다.

C++에서는 signed shift와 범위를 벗어난 shift에 기대지 않고 `std::uint64_t{1} << i`처럼 unsigned mask를 사용한다. `i`는 type의 bit 수보다 작아야 한다. `mask & -mask`는 가장 낮은 set bit를 얻는 관용식이지만 unsigned type에서 사용하는 편이 안전하다.

모든 subset은 `for (mask = 0; mask < (1ULL << n); ++mask)`로 열거할 수 있다. 특정 `mask`의 non-empty submask만 돌 때는 `sub = (sub - 1) & mask`를 반복하며, `sub == 0` 종료를 별도로 처리한다.

## 언제 유용한가

- subset이 DP state의 핵심이고 원소 수가 작다.
- membership, add/remove를 자주 한다.
- hash key로 compact state가 필요하다.

원소 수가 `n`이면 subset은 `2^n`개다. bit operation이 O(1)에 가까워도 state 수의 exponential growth는 사라지지 않는다. `n`이 수십을 넘어가면 memory와 실행 시간이 급격히 커진다.

## Traveling Salesman Problem

TSP는 모든 도시를 한 번씩 방문하고 시작점으로 돌아오는 minimum-cost tour를 찾는다. optimization version은 NP-hard이며 완전 탐색은 tour 수가 factorial로 증가한다.

### Held-Karp 형태의 DP

`dp[mask][last]`를 다음처럼 정의한다.

> 시작 도시에서 출발해 `mask`의 도시를 방문했고 현재 `last`에 있을 때의 최소 비용

transition은 아직 방문하지 않은 `next`로 이동한다.

```text
dp[mask | (1 << next)][next]
  = min(current,
        dp[mask][last] + cost[last][next])
```

모든 도시를 방문한 상태에서 `cost[last][start]`를 더해 cycle을 닫는다. top-down recursion과 memoization, bottom-up table 모두 같은 state graph를 푼다.

## 복잡도와 한계

- state: `n × 2^n`
- 각 state에서 next 도시 최대 `n`개 확인
- 시간: O(n²2^n)
- 공간: O(n2^n)

brute force보다 크게 개선되지만 polynomial algorithm은 아니다. 실제 한계는 language overhead, distance matrix와 memory layout에 따라 더 빨리 온다.

## 구현 함정

- 갈 수 없는 edge를 0으로 표현하면 실제 zero-cost edge와 충돌한다. `Infinity`나 별도 sentinel을 쓴다.
- start 도시 bit와 base state를 일관되게 포함한다.
- memo의 0을 미계산과 비용 0으로 동시에 쓰지 않는다.
- 큰 비용 합의 overflow와 floating-point 비교를 확인한다.
- 경로 자체가 필요하면 최소 비용뿐 아니라 predecessor 또는 선택한 next를 저장한다.

## 대안

도시 수가 커지면 exact solution 대신 branch-and-bound, meet-in-the-middle, integer programming, approximation 또는 heuristic을 검토한다. metric TSP처럼 triangle inequality가 있는지에 따라 보장 가능한 approximation도 달라진다.

## 출처

- 인프런, 큰돌 강사, [비트마스킹 개념 #1. 이진수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100311), [비트마스킹 개념 #2-1. 비트연산자의 기초(+, -)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=125045), [비트마스킹 개념 #2-2. 비트연산자의 기초(&, |) AND, OR](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144239), [비트마스킹 개념 #2-3. 비트연산자 기초 (<<, >>) SHIFT](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145028), [비트마스킹 개념 #2-4. 비트연산자의 기초(^, ~) XOR, Ones' complement](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145029)
- 인프런, 큰돌 강사, [비트마스킹 개념 #3-1. 비트연산자 활용법: idx번째 비트끄기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145030), [비트마스킹 개념 #3-2. 비트연산자 활용법: idx번째 비트 XOR 연산](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145031), [비트마스킹 개념 #3-3. 비트연산자 활용법: 최하위 켜져있는 비트 찾기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145032), [비트마스킹 개념 #3-4. 비트연산자 활용법 : 크기가 n인 집합의 모든 비트를 켜기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145033), [비트마스킹 개념 #3-5. 비트연산자 활용법 :  idx번째 비트를 켜기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145034)
- 인프런, 큰돌 강사, [비트마스킹 개념 #3-6. 비트연산자 활용법 : idx번째 비트가 켜져있는지 확인하기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145035), [비트마스킹 개념 #4. 비트마스킹, 경우의 수, 매개변수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=125046), [4-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100380), [4-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100381), [4-C와 다양한 타입의 함수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100382)
- 인프런, 큰돌 강사, [4-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100383), [4-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100385), [4-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100386), [4-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100387), [4-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100388)
- 인프런, 큰돌 강사, [4-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100389), [5-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100407)

- [NIST Dictionary of Algorithms and Data Structures — Traveling Salesman](https://www.nist.gov/dads/HTML/travelingSalesman.html)
- [ECMAScript Language Specification — Binary Bitwise Operators](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-binary-bitwise-operators)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 비트마스킹, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135781)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 외판원 문제, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135782)

## 관련 문서

- [[Algorithm-DP|Dynamic Programming]]
- [[Algorithm-Complexity|P, NP와 점근 복잡도]]
- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Cpp-Language-Memory-and-STL|C++ 정수와 bit 연산]]
