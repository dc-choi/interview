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

memo key가 state를 완전히 표현한다는 것은 함수가 같은 인자에 늘 같은 값을 돌려준다는 뜻이다([[Types-And-Functions-As-Category|참조 투명성]]). 인자에 없는 전역 변수나 외부 상태에 결과가 의존하면 memo할 수 없다. 그래서 DP 재귀 함수는 전역 변수를 갱신하는 void 함수가 아니라 하위 결과를 돌려받아 합치는 값 반환 함수로 쓴다. 완전탐색 재귀를 먼저 세우고 같은 인자로 반복되는 호출을 memo로 바꾸는 것이 top-down DP의 흔한 출발점이다.

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

이동 주체의 위치가 항상 과거 사건 중 하나의 좌표라면 좌표 대신 마지막으로 처리한 사건 index를 state로 둔다. 두 차량이 사건을 순서대로 처리하며 총 이동 거리를 최소화할 때 `dp[a][b]`를 차량 1과 2가 마지막으로 처리한 사건이 a, b일 때 남은 최소 거리로 두면, 다음 사건은 `max(a, b) + 1`로 정해지고 state는 좌표 범위와 무관하게 사건 수 W에 대해 O(W²)다. 두 차량의 시작 위치를 0번, 1번 가짜 사건으로 넣으면 시작 state가 `dp[0][1]` 하나로 정리된다. 어느 차량이 맡았는지 출력할 때는 완성된 table에서 두 선택의 값을 다시 비교하며 따라간다.

최솟값만 저장한 table에서 실제 선택을 복원하려면 최적 transition을 만든 predecessor나 choice를 함께 저장한다. 또는 완성된 table에서 recurrence equality를 만족하는 이전 state를 역추적한다. rolling array는 중간 state를 버리므로 복원이 필요하면 별도 정보를 유지한다.

## 초기값의 세 역할과 기저 사례

table의 초기값과 base case의 반환값은 서로 다른 세 역할을 한다. 한 값이 두 역할을 겸하면 memo가 불가능 결과를 미계산으로 오인해 같은 state를 반복 계산하거나, 불가능한 경로가 답에 섞인다.

| 역할 | 고르는 기준 | 예 |
|---|---|---|
| 미계산 표시(memo sentinel) | 어떤 정상 결과와도 겹치지 않는 값 | 비용이나 경우의 수가 0일 수 있으면 0이 아니라 -1 |
| 불가능 state의 반환값 | min/max에서 저절로 탈락하는 값 | 최솟값 문제는 INF, 최댓값 문제는 아주 작은 값 |
| 최종 출력의 불가능 표시 | 문제가 정한 출력 | 끝까지 INF로 남은 `dp[k]`를 -1로 출력 |

INF는 비용을 더해도 넘치지 않을 크기로 잡는다([[Cpp-Coding-Test-Workflow|상태와 초기화]]). 불가능 state와 미계산을 같은 INF로 두는 실수는 [[Bitmask-DP-and-TSP|비트마스크 DP]]의 구현 함정에서 다룬다.

문제 조건이 base case를 바꾼다.

- **최대 W번과 정확히 W번**: 이동 횟수가 최대 W번이면 수열 끝에서 남은 횟수와 무관하게 0을 반환한다. 정확히 W번 써야 하면 남은 횟수가 0이 아닌 끝 state에 불가능 값을 반환해 배제한다.
- **strict 경계**: 체력이 0 이하가 되면 안 되는 knapsack은 체력 100에서 정확히 0에 닿는 선택까지 막아야 하므로 용량을 99로 두고 계산하는 것과 같다.
- **cycle이 곧 무한인 문제**: 칸의 숫자만큼 점프하며 최대 이동 횟수를 구할 때 같은 칸으로 돌아올 수 있으면 답이 무한이다. 현재 재귀 경로의 state에 표시를 했다가 호출이 끝나면 해제하고, 경로 위 state를 다시 만나면 무한으로 판정해 즉시 끝낸다. 끝난 state는 memo로 재사용한다. 위 Memoization의 계산 중 표시를 답 판정에 쓰는 형태다.

## 입문 점화식 예제

코딩 테스트 수준의 DP는 테이블 정의, 점화식, 초기값 세 가지를 정하고 나면 반복문으로 배열을 채우는 구현만 남는다. 어려운 부분은 테이블 정의와 점화식을 찾는 것이며, 이는 여러 유형을 풀며 익힌다.

| 문제 | 테이블 정의 | 점화식 | 초기값 |
|---|---|---|---|
| n을 1로 만드는 최소 연산(÷3, ÷2, -1) | `D[i]` = i를 1로 만드는 최소 횟수 | `D[i] = min(D[i-1], D[i/2] (i%2==0), D[i/3] (i%3==0)) + 1` | `D[1] = 0` |
| n을 1, 2, 3의 합으로 나타내는 방법 수 | `D[i]` = 방법 수 | 마지막 수가 1, 2, 3인 경우로 나눠 `D[i] = D[i-1] + D[i-2] + D[i-3]` | `D[1]=1, D[2]=2, D[3]=4` |
| 연속 세 칸을 밟을 수 없는 계단 오르기 최대 점수 | `D[i][j]` = i번째 계단을 반드시 밟고 j칸째 연속으로 밟았을 때 최대 점수(j = 1, 2) | `D[i][1] = max(D[i-2][1], D[i-2][2]) + s[i]`, `D[i][2] = D[i-1][1] + s[i]` | `D[1][1]=s[1], D[2][1]=s[2], D[2][2]=s[1]+s[2]` |
| 인접한 집이 같은 색이면 안 되는 칠하기 최소 비용 | `D[k][c]` = k번째 집을 색 c로 칠했을 때 최소 비용 | `D[k][c] = min(다른 두 색의 D[k-1]) + cost[k][c]` | 첫 집의 비용 |
| 2 × n 직사각형을 1 × 2, 2 × 1 타일로 채우는 방법 수 | `D[n]` = 방법 수 | 맨 왼쪽이 세로 타일 하나냐 가로 타일 두 개냐로 나눠 `D[n] = D[n-1] + D[n-2]` | `D[1]=1, D[2]=2` |
| 구간 합 질의 | `D[i]` = 앞에서 i개의 합 | `D[i] = D[i-1] + a[i]`, 구간 `[i, j]`의 합은 `D[j] - D[i-1]` | `D[0] = 0` ([[Prefix-Sum-and-Range-Queries\|누적합]]) |

- 1로 만들기는 3이나 2로 나눌 수 있으면 먼저 나누는 greedy가 틀린다. 10은 greedy로 10, 5, 4, 2, 1(4번)이지만 10, 9, 3, 1(3번)이 최소다. 선택이 이후에 미치는 영향을 모두 비교해야 하므로 DP다.
- 계단 문제처럼 규칙(연속 세 칸 금지)을 1차원 테이블에 담을 수 없으면 필요한 정보(연속 횟수)를 차원으로 추가한다. 위의 상태 설계 원칙과 같다. 이 문제는 밟지 않을 계단들의 점수 합을 최소화하는 문제로 바꿔 풀 수도 있다.
- 방법 수가 커지면 문제에서 요구한 수로 매번 나눈 나머지를 저장한다.
- 값만이 아니라 경로가 필요하면 `pre[i]`에 최적값을 만든 이전 상태를 함께 저장하고, 목표에서 `pre`를 따라 거슬러 올라간다. BFS의 경로 복원과 같은 방식이다.

## 심화 유형: 채우는 순서가 핵심일 때

- **2차원 격자 DP**: 0과 1로 된 격자에서 가장 큰 1의 정사각형은 `d[i][j]` = (i, j)를 오른쪽 아래 꼭짓점으로 하는 최대 정사각형 한 변으로 두면, 칸이 1일 때 `d[i][j] = min(d[i-1][j], d[i][j-1], d[i-1][j-1]) + 1`이다. LCS처럼 왼쪽과 위쪽만 참조하면 이중 loop로 위에서부터 채우면 된다. 경우의 수가 2³¹에 가까울 만큼 많아 백트래킹으로 셀 수 없는 문제도 DP 후보다.
- **top-down이 편한 경우**: 각 칸이 더 큰 값의 이웃에서 온다처럼 참조 방향이 입력마다 달라 채우는 순서를 정하기 어려우면, 값 순으로 정렬해 채우는 대신 메모이제이션 재귀로 필요한 칸만 계산한다. 정렬은 O(n log n)이 추가되고 위상 정렬은 구현이 복잡하다. 미계산 표시는 나올 수 없는 값(음수가 가능하면 최솟값보다 작은 값)으로 둔다. 재귀 호출 비용과 깊이는 감안한다.
- **트리 DP**: 트리는 루트를 정하면 자식에서 부모로 가는 DAG라 DP가 자연스럽게 정의된다. 각 정점을 루트로 하는 subtree의 가중치 합은 정점마다 subtree를 다시 훑으면 O(n²)이지만, `d[v] = w[v] + Σ d[자식]`으로 DFS 후위 순서에서 채우면 각 값이 부모에 한 번만 더해져 O(n)이다. 인접한 두 정점을 동시에 고를 수 없는 선택 문제는 `d[v][1]`(v를 고름) = `w[v] + Σ d[자식][0]`, `d[v][0]` = `Σ max(d[자식][0], d[자식][1])`로 두고, 리프에서 초기값이 정해진다.
- **위상 정렬 DP**: 선후 관계가 DAG로 주어지고 값이 앞선 작업에서만 결정되면(작업 완료 최소 시각 = 선행 작업 완료 시각의 최댓값 + 자기 시간), [[Topological-Sort|위상 정렬]]을 돌며 꺼낸 정점의 값을 이웃에 전파해 테이블을 채운다.

합으로 세는 경우의 수 DP와 확률 DP, 팰린드롬 구간 DP, 답이 정수 범위를 넘어 문자열을 DP 값으로 쓰는 경우는 [[Algorithm-DP-Patterns|DP 응용 패턴]]에서 다룬다.

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

연속 구간 곱의 최댓값도 같은 틀이다. 모든 값이 양수면 `bestEnding = max(a[i], bestEnding * a[i])`이고, 누적 곱이 1보다 작아지는 순간 버리고 새로 시작하는 것과 같다. `[100, 0.5, 8]`은 0.5를 곱해 줄어도 이어 가야 400이 되고, `[0.9, 0.5, 2, 3]`은 0.45가 된 누적을 버리고 2부터 시작해야 6이 된다. 0이나 음수가 섞이면 이 식은 틀린다. `[-2, 3, -4]`의 답은 24지만 식은 3을 낸다. 음수를 곱하면 최대와 최소가 뒤바뀌므로 i에서 끝나는 최대 곱과 최소 곱을 함께 들고 `a[i]`, `최대 * a[i]`, `최소 * a[i]` 중 최댓값과 최솟값으로 둘 다 갱신한다. 모든 구간을 직접 곱하는 이중 loop는 n이 1만이면 약 5천만 번이라 가능하지만 10만이면 약 50억 번이다.

## 선택 기준

- reachable state가 전체에서 일부뿐이고 재귀적 recurrence가 자연스러우면 memoization
- 계산 순서가 명확하고 stack 깊이 또는 locality가 중요하면 tabulation
- 둘 다 가능하면 asymptotic complexity뿐 아니라 constant cost, memory peak, 구현 오류 가능성과 경로 복원 요구를 비교

## 예제 코드

`dp/fibonacci.mts`

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Recursion|재귀 (기저 조건, 콜스택, 하향식 계산)]]
- [[Algorithm-DP-Patterns|DP 응용 패턴 (경우의 수, 확률, 구간, 큰 값)]]
- [[Bitmask-DP-and-TSP|비트마스크 DP와 외판원 문제]]
- [[Binary-Search-and-LIS|LIS와 이분탐색]]
- [[Exhaustive-Search-and-Backtracking|상태 공간 탐색]]

## 출처

- 인프런, 큰돌 강사, [5-W](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100418), [7주차 개념 DP(Dynamic Programming)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100314), [7-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100964), [7-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100965), [7-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100966)
- 인프런, 큰돌 강사, [7-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100967), [7-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100968), [7-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100969), [7-G와 냅색(knapsack)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100970), [7-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100971)
- 인프런, 큰돌 강사, [7-I와 실수형연산의 한계](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100972), [7-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100973), [7-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100974), [7-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100975), [7-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100980)
- 인프런, 큰돌 강사, [7-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100981), [7-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100982), [7-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100983), [7-V](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100985), [7-W](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100986)
- 인프런, 큰돌 강사, [7-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100987), [7-Y 최소값풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=155366), [8-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101054), [8-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101055), [8-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101056)
- 인프런, 큰돌 강사, [8-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101058), [8-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101059), [8-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101060), [#2. LCS(최장공통부분수열)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=331811), [6-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100958)

- 인프런, 감자 강사, [동적 프로그래밍과 메모이제이션](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117692), [동적 프로그래밍과 타뷸레이션](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117694)
- [바킹독의 실전 알고리즘 0x10강, 다이나믹 프로그래밍 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=5leTtB3PQu0)
- [바킹독의 실전 알고리즘 부록 E, 다이나믹 프로그래밍 심화 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=cLpFW_ykJ6U)
- [NIST DADS, dynamic programming](https://xlinux.nist.gov/dads/HTML/dynamicprog.html)
- [NIST DADS, LCS](https://xlinux.nist.gov/dads/HTML/LCS.html)
- [MIT OpenCourseWare 6.006, Dynamic Programming](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2008/resources/lecture-notes/)
