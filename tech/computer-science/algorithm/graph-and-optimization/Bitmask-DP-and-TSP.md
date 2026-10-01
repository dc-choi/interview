---
tags: [cs, algorithm, bitmask, dynamic-programming, tsp, np-hard]
status: done
category: "CS - 알고리즘"
aliases: ["Bitmask DP and TSP", "비트마스크 DP", "외판원 문제", "Traveling Salesman Problem"]
verified_at: 2026-09-30
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

C++에서는 signed shift와 범위를 벗어난 shift에 기대지 않고 `std::uint64_t{1} << i`처럼 unsigned mask를 사용한다. `i`는 type의 bit 수보다 작아야 한다. `mask & -mask`는 가장 낮은 set bit를 얻는 관용식이지만 unsigned type에서 사용하는 편이 안전하다(원리는 아래 절).

모든 subset은 `for (mask = 0; mask < (1ULL << n); ++mask)`로 열거할 수 있다. 특정 `mask`의 non-empty submask만 돌 때는 `sub = (sub - 1) & mask`를 반복하며, `sub == 0` 종료를 별도로 처리한다.

비트 연산은 자리마다 따로 계산한다. `9 & 14`는 `1001`과 `1110`의 공통 비트만 남아 8이다. `x << k`는 0 이상의 값에서 2ᵏ을 곱하고, `x >> k`는 2ᵏ으로 나눈 몫이다. 음수를 shift하거나 결과가 type 범위를 넘는 shift는 버전에 따라 결과가 다르거나 정의되지 않으므로 0과 양수, 범위 안에서만 쓴다. C++의 `^`는 거듭제곱이 아니라 XOR이다. `a & b == c`는 `==`가 먼저 계산되는 등 비트 연산자 우선순위가 직관과 달라 괄호를 빠짐없이 친다.

### S & -S가 최하위 set bit만 남기는 이유

최하위 set bit는 오른쪽부터 볼 때 처음 만나는 1, 즉 켜진 bit 중 값이 가장 작은 bit다. 2의 보수에서 `-S = ~S + 1`이다([[Digital-Fundamentals|2의 보수]]).

1. S를 `(상위 bit) 1 (0이 k개)`로 쓰면 `~S`는 `(상위 반전) 0 (1이 k개)`다.
2. 1을 더하면 아래 k개의 1이 올림으로 모두 0이 되고, 올림이 k번째 0을 1로 바꾼다. 상위는 반전된 그대로라 `-S = (상위 반전) 1 (0이 k개)`다.
3. S와 AND하면 상위 bit는 서로 반대라 0이 되고 k번째만 남아 결과는 2ᵏ이다.

예를 들어 `S = 18 = 10010`이면 `~S = ...01101`, `-S = ...01110`, `S & -S = 00010 = 2`다. 같은 식을 옮기면 `~S == -S - 1`이라 `~3 == -4`다. Fenwick tree가 구간 길이로 쓰는 `i & -i`가 이 값이다([[Fenwick-Tree]]). C++20부터 signed 정수는 2의 보수로 규정됐지만 signed 최솟값의 부호 반전은 overflow이므로 unsigned에서 쓴다. unsigned의 `-S`는 `2^N - S`(N은 bit 수)로 계산돼 같은 bit pattern이 나온다.

## 언제 유용한가

- subset이 DP state의 핵심이고 원소 수가 작다.
- membership, add/remove를 자주 한다.
- hash key로 compact state가 필요하다.
- 원소가 20개 정도인 집합을 `bool` 배열 대신 정수 하나로 두면, 전체 채우기와 비우기가 한 번의 대입(`mask = (1 << 20) - 1`, `mask = 0`)이 되고 토글은 `^`로 조건문 없이 된다.
- 독립 선택의 모든 조합을 백트래킹 대신 `0`부터 `(1 << n) - 1`까지 세며 볼 수 있다. 예를 들어 기타마다 칠 수 있는 곡을 bit로 저장하면 기타 조합의 연주 가능 곡은 OR로 합치고 곡 수는 `__builtin_popcountll`(C++20 `std::popcount`)로 센다([[Simulation-Implementation|진법 열거]]).
- 켜진 bit 수로 조건을 건다. n명을 n/2명씩 두 팀으로 나누는 경우는 popcount가 n/2인 mask만 보고, 막대를 반씩 잘라 길이 X를 만드는 최소 막대 수는 X의 이진 표현에서 1의 개수다(23은 `10111`이라 4개). GCC의 `__builtin_popcount`는 `unsigned int`, `__builtin_popcountll`은 `unsigned long long`을 받고, C++20 `<bit>`의 `std::popcount`는 unsigned 정수 type만 받으므로 `std::popcount(5)`처럼 `int`를 넘기면 컴파일되지 않는다.
- 옵션 여러 개를 인자 하나로 넘길 때 옵션마다 bit를 정해 호출부는 `A | B`로 묶고, 함수 안에서는 `flags & A`로 포함 여부를 본다.
- 방문 집합을 재귀 인자로 넘기면 호출마다 정수가 값으로 복사되므로 호출 뒤 되돌리는 코드가 필요 없다. 격자에서 알파벳 26개의 방문 여부를 `go(ny, nx, mask | (1 << c))`로 넘기고 `mask & (1 << c)`로 이미 밟은 글자인지 본다([[Exhaustive-Search-and-Backtracking#재귀 상태의 구성|apply와 undo]]).
- 입력이 방향별 flag의 합이면(서 1, 북 2, 동 4, 남 8) 방향 배열을 같은 순서로 두고 `if (wall & (1 << dir)) continue;` 한 줄로 막힌 방향을 거른다.

원소 수가 `n`이면 subset은 `2^n`개다. bit operation이 O(1)에 가까워도 state 수의 exponential growth는 사라지지 않는다. 모든 subset을 보는 열거는 `2^n × 경우 하나의 검증 비용`으로 판단한다. 2^20은 약 100만이라 검증이 가벼우면 충분하지만, 2^30은 약 10.7억이라 경우마다 O(1)이어도 시간 제한을 넘기 쉽다. bit 31 이상은 32-bit `int`의 양수 범위를 넘으므로 위처럼 unsigned 64-bit mask를 쓴다.

## 부분집합 열거로 푸는 완전탐색

원소마다 넣는다와 넣지 않는다 두 상태뿐이고 원소가 적으면 mask 하나가 경우 하나다. 열거 수가 너무 크면 고정할 수 있는 bit나 따로 최적화되는 축을 찾아 열거를 줄인다.

- **열거 뒤 검증과 동률**: 재료 조합 중 영양 하한을 모두 넘는 최소 비용 조합처럼 mask마다 켜진 원소의 합으로 조건을 검사하고, 한 번도 갱신되지 않으면 불가능을 출력한다. 같은 비용 중 번호 목록이 사전순으로 가장 앞선 조합을 요구하면 mask 순서를 믿지 말고 목록끼리 비교한다. 원소 1, 2, 3, 4를 0번부터 3번 bit에 두면 {2, 3}은 6, {1, 4}는 9라 mask로는 {2, 3}이 먼저지만 사전순은 {1, 4}가 앞선다.
- **두 그룹 분할과 연결성**: bit를 정점의 색 0과 1로 보고, 두 그룹이 비지 않도록 `0`과 `(1 << n) - 1`은 뺀다. 색마다 정점 하나에서 같은 색 정점으로만 이동하는 DFS를 돌려 두 방문 수의 합이 n이면 두 그룹이 각각 연결돼 있다. DFS가 (방문 수, 가중치 합)을 함께 반환하면 연결성과 그룹 합을 한 번에 얻는다.
- **반드시 켤 bit 고정**: 모든 단어에 들어 있는 글자 5개처럼 빼는 경우가 없는 원소는 미리 켜 두고 나머지만 고른다. K글자를 가르칠 때 26글자 전체(2^26) 대신 남은 21글자에서 K - 5개를 고르면 최대 C(21, 10) = 352,716가지이고, K < 5면 어떤 단어도 읽을 수 없어 답은 0이다. 단어마다 글자 bit를 OR한 mask를 미리 만들면 읽을 수 있는지는 `(word & learned) == word` 한 번이다.
- **한 축만 열거**: n×n 동전 판에서 행과 열 뒤집기를 모두 열거하면 2^(2n)이지만, 행 뒤집기를 정하면 각 열은 T가 적어지는 쪽으로 따로 정해진다. 열마다 T 개수 cnt에 대해 `min(cnt, n - cnt)`를 더하면 O(2ⁿ × n²)이고, 열을 행 번호 mask로 두면 T 개수가 `popcount(col ^ rowFlip)`이라 O(2ⁿ × n)이다.
- **칸마다 방향 bit**: 칸이 16개 이하인 판을 가로, 세로 조각으로 자를 때 칸마다 0은 가로, 1은 세로로 정하면 2^16개 mask가 모든 자르기다. 가로 합은 행을 왼쪽부터 보며 0인 칸을 `cur = cur * 10 + a[i][j]`로 이어 붙이다가 1인 칸이나 행 끝에서 더하고, 세로 합은 loop 순서를 바꿔 열을 위에서부터 같은 방식으로 본다.

## Traveling Salesman Problem

TSP는 모든 도시를 한 번씩 방문하고 시작점으로 돌아오는 minimum-cost tour를 찾는다. optimization version은 NP-hard이며 완전 탐색은 tour 수가 factorial로 증가한다.

### Held-Karp 형태의 DP

`dp[mask][last]`를 다음처럼 정의한다.

> 시작 도시에서 출발해 `mask`의 도시를 방문했고 현재 `last`에 있을 때의 최소 비용

state에 방문 순서 대신 방문 집합과 현재 도시만 두어도 되는 이유는 남은 도시를 돌고 돌아가는 최소 비용이 지나온 순서와 무관하게 이 둘로만 정해지기 때문이다(최적 부분 구조). 순서를 state로 두면 n!가지지만 집합으로 합치면 2ⁿ가지가 되고, 같은 state를 한 번만 계산하도록 저장하면 DP가 된다.

transition은 아직 방문하지 않은 `next`로 이동한다.

```text
dp[mask | (1 << next)][next]
  = min(current,
        dp[mask][last] + cost[last][next])
```

모든 도시를 방문한 상태에서 `cost[last][start]`를 더해 cycle을 닫는다. top-down recursion과 memoization, bottom-up table 모두 같은 state graph를 푼다.

### Top-down 정의와 출발 도시 고정

같은 state graph를 남은 비용으로 정의하면 top-down 재귀가 된다.

```text
tsp(cur, visited) = cur에 있고 visited의 도시를 방문했을 때,
                    남은 도시를 모두 돌고 출발 도시 0으로 돌아가는 최소 비용
base: visited == (1 << n) - 1 이면 cost[cur][0] (돌아가는 간선이 없으면 INF)
tsp(cur, visited) = min(cost[cur][next] + tsp(next, visited | (1 << next)))
                    (next는 visited에 없고 cur에서 갈 수 있는 도시)
답: tsp(0, 1)
```

출발 도시를 0으로 고정해도 되는 이유는 최적 tour가 모든 도시를 지나는 cycle이라 어느 도시에서 시작해도 같은 cycle이고 비용도 같기 때문이다. 경로가 필요하면 state마다 min을 만든 next를 함께 저장해 `tsp(0, 1)`부터 따라간다.

## 복잡도와 한계

- state: `n × 2^n`
- 각 state에서 next 도시 최대 `n`개 확인
- 시간: O(n²2^n)
- 공간: O(n2^n)

brute force보다 크게 개선되지만 polynomial algorithm은 아니다. 실제 한계는 language overhead, distance matrix와 memory layout에 따라 더 빨리 온다.

완전 탐색은 출발을 고정해도 (n-1)!개의 방문 순서를 본다. 비용이 대칭이면 정방향과 역방향이 같은 tour라 서로 다른 cycle은 (n-1)!/2개다. n = 15면 14! = 87,178,291,200가지지만 Held-Karp는 state n2ⁿ = 491,520개, 전이 n²2ⁿ = 7,372,800번 정도다. 같은 (현재 도시, 방문 집합)을 한 번만 푸는 메모이제이션의 이득이며 여전히 exponential이다.

## 구현 함정

- 갈 수 없는 edge를 0으로 표현하면 실제 zero-cost edge와 충돌한다. `Infinity`나 별도 sentinel을 쓴다.
- start 도시 bit와 base state를 일관되게 포함한다.
- 미계산 표시는 어떤 결과와도 겹치지 않는 값(-1 등)으로 둔다. memo의 0을 미계산과 비용 0으로 동시에 쓰지 않는다. 불가능 state가 INF를 반환하는데 memo도 INF로 초기화하면 불가능 state를 부를 때마다 다시 계산해 memo 효과가 사라진다. 답은 같아도 돌아갈 간선이 없는 state가 많은 입력에서 시간 초과가 날 수 있다([[Algorithm-DP#초기값의 세 역할과 기저 사례|DP 초기값의 세 역할]]).
- 큰 비용 합의 overflow와 floating-point 비교를 확인한다.
- 경로 자체가 필요하면 최소 비용뿐 아니라 predecessor 또는 선택한 next를 저장한다.

## 대안

도시 수가 커지면 exact solution 대신 branch-and-bound, meet-in-the-middle, integer programming, approximation 또는 heuristic을 검토한다. metric TSP처럼 triangle inequality가 있는지에 따라 보장 가능한 approximation도 달라진다.

## 출처

- [바킹독의 실전 알고리즘 부록 C, 비트마스킹 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=gSLf6lMi7kw)
- 인프런, 큰돌 강사, [비트마스킹 개념 #1. 이진수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100311), [비트마스킹 개념 #2-1. 비트연산자의 기초(+, -)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=125045), [비트마스킹 개념 #2-2. 비트연산자의 기초(&, |) AND, OR](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144239), [비트마스킹 개념 #2-3. 비트연산자 기초 (<<, >>) SHIFT](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145028), [비트마스킹 개념 #2-4. 비트연산자의 기초(^, ~) XOR, Ones' complement](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145029)
- 인프런, 큰돌 강사, [비트마스킹 개념 #3-1. 비트연산자 활용법: idx번째 비트끄기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145030), [비트마스킹 개념 #3-2. 비트연산자 활용법: idx번째 비트 XOR 연산](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145031), [비트마스킹 개념 #3-3. 비트연산자 활용법: 최하위 켜져있는 비트 찾기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145032), [비트마스킹 개념 #3-4. 비트연산자 활용법 : 크기가 n인 집합의 모든 비트를 켜기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145033), [비트마스킹 개념 #3-5. 비트연산자 활용법 :  idx번째 비트를 켜기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145034)
- 인프런, 큰돌 강사, [비트마스킹 개념 #3-6. 비트연산자 활용법 : idx번째 비트가 켜져있는지 확인하기](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=145035), [비트마스킹 개념 #4. 비트마스킹, 경우의 수, 매개변수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=125046), [4-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100380), [4-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100381), [4-C와 다양한 타입의 함수](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100382)
- 인프런, 큰돌 강사, [4-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100383), [4-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100385), [4-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100386), [4-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100387), [4-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100388)
- 인프런, 큰돌 강사, [4-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100389), [5-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100407), [7-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100964)
- 인프런, 감자 강사, [외판원 문제 - 구현](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135792)

- [NIST Dictionary of Algorithms and Data Structures — Traveling Salesman](https://www.nist.gov/dads/HTML/travelingSalesman.html)
- [ECMAScript Language Specification — Binary Bitwise Operators](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-binary-bitwise-operators)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 비트마스킹, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135781)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 외판원 문제, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135782)
- [C++ working draft, Fundamental types](https://eel.is/c++draft/basic.fundamental)
- [C++ working draft, Shift operators](https://eel.is/c++draft/expr.shift)
- [cppreference, std::popcount](https://en.cppreference.com/w/cpp/numeric/popcount)
- [C++ working draft, Counting](https://eel.is/c++draft/bit.count)
- [GCC, Bit Operation Builtins](https://gcc.gnu.org/onlinedocs/gcc/Bit-Operation-Builtins.html)

## 관련 문서

- [[Algorithm-DP|Dynamic Programming]]
- [[Algorithm-Complexity|P, NP와 점근 복잡도]]
- [[Graph-Traversal-and-Shortest-Path|그래프 탐색과 최단 경로]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Cpp-Language-Memory-and-STL|C++ 정수와 bit 연산]]
