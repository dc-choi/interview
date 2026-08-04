---
tags: [cs, algorithm, dp]
status: done
category: "CS - 알고리즘"
aliases: ["동적 프로그래밍", "Dynamic Programming", "DP"]
---

# 동적 프로그래밍 (DP)

동적 프로그래밍은 문제를 state와 recurrence로 표현하고, 같은 subproblem의 답을 한 번만 계산해 재사용하는 설계 기법이다. 최적화 문제에서는 optimal substructure가 필요하고, 일반적으로는 subproblem이 겹쳐 결과 재사용의 이득이 있어야 한다. subproblem이 독립적이면 divide-and-conquer만으로 충분할 수 있다.

## 설계 순서

1. state가 무엇을 의미하는지 정의한다.
2. base state와 답을 구할 target state를 정한다.
3. 더 작은 state의 답으로 현재 state를 구하는 recurrence를 세운다.
4. state dependency가 acyclic인지, 계산 순서가 dependency를 지키는지 확인한다.
5. state 수와 state당 transition 수로 시간, 저장할 state 수로 공간을 계산한다.

DP를 적용했다고 시간복잡도가 항상 O(n)이 되는 것은 아니다. 대략 `도달 가능한 state 수 × state당 transition 비용`으로 분석하며 state 차원이 늘면 O(n²), O(n * 2^n) 등도 가능하다.

## Memoization

top-down으로 target state부터 시작해 필요한 subproblem만 계산하고 결과를 table에 저장한다. 재귀와 함께 쓰기 쉽지만 memo key가 state를 완전히 표현해야 하고, 계산 중임을 구분하지 않으면 cyclic dependency에서 재귀가 끝나지 않을 수 있다.

- 실제로 도달한 state만 계산할 수 있음
- recurrence를 문제 정의와 비슷하게 적기 쉬움
- lookup overhead와 recursion stack이 생길 수 있음

메모이제이션은 계산 결과 재사용이라는 넓은 cache 아이디어를 사용하지만 CPU cache와 동일한 메커니즘은 아니다. key, eviction, consistency와 lifetime을 알고리즘이 직접 정의한다.

## Tabulation

bottom-up으로 dependency가 먼저 계산되도록 table을 채운다. base state에서 시작해 반복문으로 target까지 진행하는 경우가 많다.

- 호출 stack이 필요 없고 순차 memory 접근을 만들기 쉬움
- dependency order를 명시적으로 설계해야 함
- target에 필요 없는 state까지 채우면 불필요한 계산이 생길 수 있음

이전 몇 개 state만 다음 계산에 필요하다면 rolling array나 변수 몇 개로 table을 줄일 수 있다. 다만 경로 복원처럼 중간 state 전체가 필요하면 버리면 안 된다.

## Fibonacci로 보는 차이

`F(0)=0`, `F(1)=1`, `F(n)=F(n-1)+F(n-2)` convention에서 단순 재귀는 같은 값을 반복 계산해 지수적으로 많은 호출을 만든다.

- memoization: 각 `F(k)`를 한 번 계산해 Θ(n) 시간, Θ(n) memo와 최대 Θ(n) call stack
- tabulation: `0`부터 `n`까지 채우면 Θ(n) 시간, table은 Θ(n) 공간
- 두 값만 유지하는 tabulation: Θ(n) 시간, Θ(1) 추가 공간

이 복잡도는 Fibonacci recurrence의 결과이지 모든 memoization과 tabulation의 공통 복잡도가 아니다.

## 상태 설계와 경로 복원

미래의 선택 가능성과 비용이 같다면 두 실행 이력을 같은 state로 합칠 수 있다. 반대로 위치가 같아도 남은 횟수, 마지막 선택, 보유한 자원이나 time parity가 미래에 영향을 주면 state 차원에 포함해야 한다.

최솟값만 저장한 table에서 실제 선택을 복원하려면 최적 transition을 만든 predecessor나 choice를 함께 저장한다. 또는 완성된 table에서 recurrence equality를 만족하는 이전 state를 역추적한다. rolling array는 중간 state를 버리므로 복원이 필요하면 별도 정보를 유지한다.

## Knapsack update 방향

1차원 table로 공간을 줄일 때 loop 방향이 물건의 재사용 여부를 결정한다.

- 0/1 knapsack: capacity를 큰 값부터 줄여 같은 물건을 한 번만 반영한다.
- unbounded knapsack: capacity를 작은 값부터 늘려 현재 물건으로 갱신한 state를 다시 사용할 수 있다.

방향을 암기하기보다 transition이 이전 stage의 table을 읽어야 하는지, 현재 stage에서 갱신한 값을 다시 읽어도 되는지 확인한다.

## Longest Common Subsequence

`dp[i][j]`를 두 sequence의 prefix `A[0..i)`, `B[0..j)`의 LCS 길이로 둔다.

```text
A[i-1] == B[j-1]: dp[i][j] = dp[i-1][j-1] + 1
otherwise:        dp[i][j] = max(dp[i-1][j], dp[i][j-1])
```

시간과 table 공간은 O(nm)이다. 길이만 필요하면 두 row로 공간을 O(min(n,m))까지 줄일 수 있다. 실제 LCS는 full table 또는 선택 정보를 따라 역추적한다. substring과 달리 문자가 연속할 필요는 없지만 순서는 보존한다.

## 최대 연속 부분합

Kadane 알고리즘은 `bestEnding[i]`를 i에서 반드시 끝나는 최대 연속합으로 보는 1차원 DP다.

```text
bestEnding = max(a[i], bestEnding + a[i])
bestOverall = max(bestOverall, bestEnding)
```

이전 값 두 개만 필요해 O(n) 시간과 O(1) 추가 공간으로 계산한다. 빈 구간을 허용하지 않고 모든 값이 음수일 수 있으면 첫 원소로 초기화해야 한다. `0`으로 시작하면 존재하지 않는 빈 구간을 답으로 선택할 수 있다.

## 선택 기준

- reachable state가 전체에서 일부뿐이고 재귀적 recurrence가 자연스러우면 memoization
- 계산 순서가 명확하고 stack 깊이 또는 locality가 중요하면 tabulation
- 둘 다 가능하면 asymptotic complexity뿐 아니라 constant cost, memory peak, 구현 오류 가능성과 경로 복원 요구를 비교

## 예제 코드

`dp/fibonacci.mts`

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Recursion|재귀 (기저 조건, 콜스택, 하향식 계산)]]
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]
- [[Binary-Search-and-LIS|LIS와 이분탐색]]
- [[Exhaustive-Search-and-Backtracking|상태 공간 탐색]]

## 출처

- 인프런, 큰돌 강사, [5-W](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100418), [7주차 개념 DP(Dynamic Programming)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100314), [7-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100964), [7-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100965), [7-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100966)
- 인프런, 큰돌 강사, [7-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100967), [7-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100968), [7-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100969), [7-G와 냅색(knapsack)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100970), [7-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100971)
- 인프런, 큰돌 강사, [7-I와 실수형연산의 한계](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100972), [7-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100973), [7-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100974), [7-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100975), [7-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100980)
- 인프런, 큰돌 강사, [7-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100981), [7-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100982), [7-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100983), [7-V](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100985), [7-W](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100986)
- 인프런, 큰돌 강사, [7-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100987), [7-Y 최소값풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=155366), [8-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101054), [8-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101055), [8-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101056)
- 인프런, 큰돌 강사, [8-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101058), [8-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101059), [8-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101060), [#2. LCS(최장공통부분수열)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=331811)

- 인프런, 감자 강사, [동적 프로그래밍과 메모이제이션](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117692), [동적 프로그래밍과 타뷸레이션](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117694)
- [NIST DADS, dynamic programming](https://xlinux.nist.gov/dads/HTML/dynamicprog.html)
- [NIST DADS, LCS](https://xlinux.nist.gov/dads/HTML/LCS.html)
- [MIT OpenCourseWare 6.006, Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2008/resources/lecture-notes/)
