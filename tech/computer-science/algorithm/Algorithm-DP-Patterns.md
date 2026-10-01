---
tags: [cs, algorithm, dp, counting, probability, interval-dp]
status: done
category: "CS - 알고리즘"
aliases: ["DP Patterns", "DP 응용 패턴", "경우의 수 DP", "확률 DP", "구간 DP", "팰린드롬 DP"]
---

# DP 응용 패턴: 경우의 수, 확률, 구간, 큰 값

[[Algorithm-DP|동적 프로그래밍]]의 설계 순서와 초기값 규칙을 전제로, 값을 합치는 방식이나 값의 표현이 달라지는 패턴을 모은다. 최적화 DP는 선택지 중 min/max를 고르지만 여기서는 합, 확률 가중 합, 불리언 table, 문자열 비교가 그 자리에 들어간다.

## 경우의 수 DP

서로 겹치지 않고 빠짐없이 나뉜 선택지의 경우의 수는 더하고(합의 법칙), 서로 독립인 부분의 경우의 수는 곱한다(곱의 법칙). 최적화 DP의 min/max 자리에 합이 들어간 형태다.

- **종료 state의 반환값**: 조건을 만족하는 완성 state는 1, 조건을 어긴 state나 범위 밖은 0을 반환해 그 경로를 배제한다. 재귀가 돌아오며 1들이 합산된다.
- **미계산 표시**: 0이 정상 답이므로 memo는 -1처럼 답이 될 수 없는 값으로 초기화한다([[Algorithm-DP#초기값의 세 역할과 기저 사례|초기값의 세 역할]]).
- **범위**: 경우의 수는 빠르게 커지므로 `long long`을 쓰고, 문제가 요구하면 더할 때마다 나머지를 취한다.
- **빈 선택은 1가지**: 동전 종류로 금액 K를 만드는 방법 수는 `dp[0] = 1`(아무것도 고르지 않는 1가지)에서 시작해 `dp[i] += dp[i - coin]`으로 누적한다. 동전 종류를 바깥 loop에 두면 구성이 같고 순서만 다른 경우를 한 번만 센다(조합). 금액을 바깥 loop에 두고 안쪽에서 모든 동전을 보면 순서가 다른 나열을 따로 센다(순열). 1원과 2원으로 4원을 만들면 앞의 방식은 3가지(1+1+1+1, 1+1+2, 2+2), 뒤의 방식은 5가지다.
- **미래 전이를 바꾸는 이력은 state 차원으로**: 파이프 끝점에서 다음에 갈 수 있는 방향이 현재 방향(가로, 대각선, 세로)에 따라 달라지면 `dp[y][x][dir]`로 두고 목표 칸의 세 방향을 합한다. 특정 칸들을 번호 오름차순으로만 방문해야 하면 직전에 방문한 번호를 state에 넣는다.
- **이력 대신 개수로 압축**: 온전한 알약 n개에서 매일 하나를 꺼내, 온전하면 반을 먹고 반쪽을 다시 넣고 반쪽이면 그대로 먹는 과정의 순서 문자열을 모두 만들면 길이 2n이라 n = 30에서 2⁶⁰ 규모다. 남은 온전한 알약 수 W와 반쪽 수 H만 state로 두면 온전한 알약을 꺼낼 때 `(W-1, H+1)`, 반쪽을 꺼낼 때 `(W, H-1)`로 가고 둘 다 0이면 1을 반환한다. state는 O(n²)개이고 답은 Catalan 수(n = 30에서 3,814,986,502,092,304)다.
- **중간값 범위 제약**: 수 사이에 +, -를 넣으며 중간 결과가 0에서 20 사이여야 하면 (index, 현재 값) state에서 두 선택을 더하고, 범위를 벗어나면 0을 반환한다.
- **독립 구간의 곱**: 각자 자기 자리나 바로 옆자리에만 앉을 수 있고(이웃끼리 자리 교환) 일부 고정석은 움직일 수 없으면, 위치 pos에서 그대로 두면 pos+1, 옆과 바꾸면 pos+2로 가는 두 경우를 더한다. 고정석이 좌석을 독립 구간으로 나누므로 구간 길이별 경우의 수(피보나치형)를 곱해도 같은 답이다.

## 확률 DP

확률은 경우의 수에 가중치를 붙인 것이다. 서로 배타적인 분기로 나누고 각 분기의 결과에 그 분기의 확률을 곱해 더한다(전확률 공식). 종료 state가 조건을 만족하면 1, 아니면 0을 반환하면 결과가 곧 그 조건의 확률이다.

- 경기를 5분씩 18구간으로 나누고 구간마다 두 팀이 각각 확률 `pA`, `pB`로 최대 한 골을 넣는다면, (구간 index, A 득점, B 득점) state에서 `pA × pB`, `pA × (1 - pB)`, `(1 - pA) × pB`, `(1 - pA) × (1 - pB)`를 가중치로 네 분기를 더한다. 마지막 구간 뒤 득점 수가 조건(예: 소수)을 만족하면 1을 반환한다. 입력이 퍼센트면 100으로 나누고, 소수 판정 표는 체로 미리 만든다([[Number-Theory-Basics|정수론 기초]]).
- memo는 `double`이다. 확률은 0 이상이므로 -1을 미계산 표시로 두고 `dp >= 0`이면 계산된 값으로 본다. `std::fill`로 넣은 -1.0은 정확히 표현되므로 `== -1` 비교도 동작하지만, `memset(dp, -1, sizeof dp)`는 모든 바이트를 0xFF로 채워 -1.0이 아니라 NaN을 만든다([[Cpp-Language-Memory-and-STL|memset은 바이트 단위]]). NaN은 `!=`를 뺀 모든 비교가 false라 `== -1` 판정은 깨지고 `dp >= 0` 판정은 여전히 미계산으로 본다. 계산으로 만든 실수 값끼리는 `==`로 비교하지 않는다([[Cpp-Coding-Test-Workflow|실수 계산]]).

## 구간 DP: 팰린드롬 table

한 문자열의 여러 구간 (i, j)가 팰린드롬인지 반복해서 물으면 질의마다 양 끝부터 검사하는 대신 모든 구간의 불리언 table을 미리 만든다.

```text
pal[i][i]   = true                              # 길이 1
pal[i][i+1] = (s[i] == s[i+1])                  # 길이 2
pal[i][j]   = (s[i] == s[j]) && pal[i+1][j-1]   # 길이 3 이상
```

안쪽 구간이 팰린드롬이고 양 끝 문자가 같으면 바깥 구간도 팰린드롬이다. `pal[i][j]`가 더 짧은 `pal[i+1][j-1]`을 읽으므로 길이를 1부터 늘려 가며 채운다. 전처리는 O(N²), 질의는 table 조회 O(1)이다. N이 2천이고 질의가 100만 개면 질의마다 검사하는 방식은 최대 약 10억 번 비교하지만 table은 i ≤ j인 약 200만 칸을 채우면 끝난다.

**최소 팰린드롬 분할**: 문자열을 팰린드롬 조각으로 나눌 때 최소 조각 수는 위 table을 먼저 만든 뒤 `d[i]` = 앞 i글자의 최소 조각 수로 두고, `s[j..i]`가 팰린드롬인 모든 j에 대해 `d[i] = min(d[j-1] + 1)`, `d[0] = 0`으로 구한다. 조각마다 팰린드롬 판정을 O(1) 조회로 바꿔 전체 O(N²)이다. 한 DP의 결과 table을 다른 DP의 전이 판정에 쓰는 2단계 구조는 어려운 DP에서 흔하다. 입력을 구간별 필요량 같은 다른 형태로 먼저 가공한 뒤 DP를 돌리는 것도 같은 발상이다.

## 답이 정수 범위를 넘는 DP

답이 수십 자리 수나 긴 문자열이면 DP 값을 문자열로 두고 min/max를 비교 함수로 갱신한다.

- 성냥개비 n개를 모두 써서 만드는 가장 작은 수는 `dp[k]` = 성냥 k개로 만드는 최소 수(문자열)로 두고, 마지막에 붙일 숫자 d마다 `dp[k - 성냥(d)] + d`의 최솟값을 취한다. 맨 앞자리 0은 금지하고 성냥이 모자란 숫자는 건너뛴다. 숫자 0부터 9의 성냥 수가 6, 2, 5, 5, 4, 5, 6, 3, 7, 6개면 10개로 22, 11개로 20, 15개로 108이 최소다. n = 100이면 최대 50자리라 `long long`에 담을 수 없다.
- 수를 뜻하는 문자열은 길이를 먼저 비교하고 길이가 같을 때만 사전식으로 비교한다. 사전식만 쓰면 `"9" > "10"`이 된다. 선행 0이 없다는 전제다([[Cpp-Coding-Test-Workflow|큰 정수 비교]]). 최솟값 DP의 초기값은 가능한 어떤 답보다 큰 문자열로 둔다.
- 같은 문제의 최댓값은 greedy로 풀린다. 자릿수가 많을수록 크다는 자명한 명제가 있으므로 성냥 2개인 1로 자릿수를 최대화하고, n이 홀수면 맨 앞만 3개짜리 7로 둔다(7개면 711). 최솟값에는 그런 명제가 없어 모든 조합을 비교해야 하므로 DP다. 목표가 바뀌면 greedy 가능성도 바뀐다([[Greedy-Sweep-and-Two-Pointers|greedy 증명]]).
- 값이 N인 가장 작은 괄호 표현처럼 답이 수천 자인 문자열이면, 옆에 이어 붙이는 분할과 한 겹 감싸는 전이로 후보 문자열을 만들어 같은 방식으로 비교한다.

## 출처

- [인프런, 큰돌, 7주차 개념 DP(Dynamic Programming)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100314)
- [인프런, 큰돌, 7-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100965)
- [인프런, 큰돌, 7-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100968)
- [인프런, 큰돌, 7-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100971)
- [인프런, 큰돌, 7-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100974)
- [인프런, 큰돌, 7-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100980)
- [인프런, 큰돌, 7-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100981)
- [인프런, 큰돌, 7-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100982)
- [인프런, 큰돌, 7-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100983)
- [인프런, 큰돌, 7-Y 최대값풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100988)
- [인프런, 큰돌, 7-Y 최소값풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=155366)
- [인프런, 큰돌, 8-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101056)
- [인프런, 큰돌, 8-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101058)
- [인프런, 큰돌, 8-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101060)

## 관련 문서

- [[Algorithm-DP|동적 프로그래밍 (설계 순서, 초기값, 상태 설계)]]
- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]
- [[Greedy-Sweep-and-Two-Pointers|Greedy 증명]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]
