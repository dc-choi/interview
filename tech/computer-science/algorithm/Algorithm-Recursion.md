---
tags: [cs, algorithm, recursion]
status: done
category: "CS - 알고리즘"
aliases: ["재귀", "Recursion"]
---

# 재귀

재귀 함수는 직접 또는 다른 함수를 거쳐 간접적으로 자신을 다시 호출한다. 호출 문법이 아니라 문제를 같은 형태의 더 작은 subproblem으로 정의하고 그 답으로 원래 답을 구성하는 방식이 중요하다.

## 종료와 정당성

재귀 설계에는 다음 세 요소가 필요하다.

1. 더 나누지 않고 답을 낼 수 있는 base case
2. 각 호출이 base case에 가까워진다고 보일 수 있는 감소량 또는 well-founded order
3. subproblem의 답을 현재 문제의 답으로 결합하는 규칙

base case가 코드에 있어도 입력이 그 조건으로 수렴하지 않으면 종료하지 않는다. 종료 전에 runtime의 call stack 한도를 넘으면 stack overflow가 날 수 있다.

## 귀납적으로 읽고 설계하기

재귀 코드는 호출을 한 줄씩 따라가며 이해하려 하면 조금만 깊어져도 머릿속이 꼬인다. 도미노 전체가 쓰러지는 이유를 1번이 쓰러지고, k번이 쓰러지면 k+1번도 쓰러진다는 두 문장으로 설명하듯, 재귀도 수학적 귀납법으로 읽는다. n부터 1까지 출력하는 함수라면 `f(1)`은 1을 출력하고, `f(k)`가 k부터 1까지 출력한다고 가정하면 `f(k+1)`은 k+1을 출력한 뒤 `f(k)`를 부르므로 k+1부터 1까지 출력한다. 이 두 문장이 참이면 모든 n에서 맞다.

설계도 같은 세 단계로 한다.

1. **함수 정의**: 무엇을 인자로 받고 무엇을 돌려주는지 정한다. 이 정의가 작은 문제에 그대로 재사용될 수 있어야 한다. 하노이 탑을 `f(n) = n개를 1번에서 3번 기둥으로`로 정의하면 n-1개를 2번으로 옮기는 부분 문제를 표현할 수 없으므로 `f(a, b, n) = n개를 a에서 b로`처럼 출발과 도착을 인자로 받아야 한다(남은 기둥은 `6 - a - b`).
2. **base condition**: 더 나누지 않고 답하는 입력. n = 0처럼 아무것도 하지 않는 경우로 두면 코드가 짧아지는 경우가 많다.
3. **재귀식**: 부분 문제의 답으로 현재 답을 만드는 규칙. 이것만 맞으면 나머지는 귀납법이 보장한다.

설계 중에는 재귀 호출이 이미 올바르게 구현돼 있다고 가정하고 그 결과를 쓰며, 호출을 끝까지 따라가지 않는다. 호출 추적은 설계가 끝난 뒤 검증과 디버깅에 쓴다. 작은 입력으로 call stack을 그려 호출이 쌓이고 반환되는 순서가 의도와 같은지 확인한다.

### 분할 정복 거듭제곱

`a^b mod m`을 a를 b번 곱해 구하면 O(b)이고, 중간 곱이 넘치므로 매 곱셈마다 m으로 나눈 나머지를 유지한다(`(x * y) mod m = ((x mod m)(y mod m)) mod m`). b가 20억 수준이면 O(b)도 느리다. `a^k`를 알면 `a^2k = a^k * a^k`, `a^(2k+1) = a^2k * a`이므로 지수를 절반씩 줄이는 재귀로 O(log b)가 된다. 이때 `pow(a, b/2)`를 한 번만 호출해 변수에 받아 제곱해야 하며, 두 번 호출하면 O(b)로 돌아간다. 중간 곱은 `long long`으로 하고, m이 2³²를 넘으면 그 곱도 넘칠 수 있다.

```cpp
long long pow_mod(long long a, long long b, long long m) {
  if (b == 0) return 1 % m;
  long long half = pow_mod(a, b / 2, m);
  long long result = half * half % m;
  return b % 2 == 0 ? result : result * (a % m) % m;
}
```

### 사분면으로 나누는 재귀

2ⁿ × 2ⁿ 격자를 Z 모양으로 방문할 때 (r, c)의 방문 순서처럼, 격자를 네 사분면으로 나누면 각 사분면이 한 단계 작은 같은 문제가 되는 경우가 있다. 한 변의 절반을 `half = 2^(n-1)`이라 하면 (r, c)가 속한 사분면 번호 q(0부터 3)에 대해 답은 `q * half * half + f(n-1, r mod half, c mod half)`다. base condition은 n = 0에서 0이다.

영역을 나눠 결과를 합치는 압축도 같은 틀이다. 0과 1로 된 N × N 영역(N은 2의 거듭제곱)이 모두 같은 값이면 그 값 하나로 줄이고, 아니면 네 사분면을 같은 규칙으로 압축해 정해진 순서로 이어 붙인다(쿼드트리 압축). 같은 로직이 매개변수만 바뀌며 반복되므로 재귀로 쓰고, 매개변수는 시작점 (y, x)와 한 변 size다. size가 1이면 그 칸의 값이 base condition이다. 영역을 먼저 훑고 불균일할 때만 쪼개면 같은 깊이의 영역들이 합쳐서 N²칸을 최대 한 번씩 보므로 최악 O(N² log N)이다.

### 전체를 만들지 않고 k번째 원소 찾기

재귀적으로 정의된 거대한 문자열이나 수열에서 k번째 원소만 필요하면 전체를 만들지 않는다. `S(1)`, `S(2)`가 주어지고 `S(n) = S(n-1) + 구분자 + S(n-2)`처럼 정의되면 길이 `L(n) = L(n-1) + 1 + L(n-2)`만 `L(n) ≥ k`가 될 때까지 계산한다. 그다음 k가 앞부분(`k ≤ L(n-1)`)이면 `S(n-1)`로, 구분자 위치면 구분자를 답하고, 뒷부분이면 `k - L(n-1) - 1`을 들고 `S(n-2)`로 내려가 결국 기본 문자열에서 글자를 꺼낸다. 길이가 피보나치처럼 지수적으로 늘어 k가 2³⁰ 수준이어도 필요한 항은 수십 개이고, 내려가는 횟수도 항 수를 넘지 않는다. 결과 대신 크기만 계산하고 답이 있는 쪽 하위 문제로만 내려가는, 한쪽만 따라가는 분할 정복이다.

## Call stack과 비용

일반적인 함수 호출은 parameter, local state와 return 위치를 activation record로 관리한다. 재귀 깊이가 `d`이면 호출 frame 때문에 보통 O(d)의 추가 공간을 사용한다. 언어와 runtime이 tail-call optimization을 보장하지 않는다면 tail recursion도 이 공간을 줄인다고 가정하지 않는다.

같은 호출을 여러 번 하는 재귀는 겹치는 부분 문제를 다시 계산해 폭발한다. `fib(n) = fib(n-1) + fib(n-2)`를 그대로 구현하면 호출 수가 약 1.618ⁿ에 비례해 n = 100도 사실상 끝나지 않지만, 앞에서부터 더하면 n번 덧셈으로 끝난다. 이런 경우는 [[Algorithm-DP|동적 프로그래밍]]으로 바꾼다. 호출 수를 세는 일반적인 방법은 [[Algorithm-Complexity#재귀 호출 수 세기|재귀 호출 수 세기]]에 있다.

call stack 크기는 문제의 메모리 제한과 별도로 작게 잡혀 있을 수 있다. 일부 컴파일러와 OS의 기본 스택은 1MB에서 수 MB 수준이고, 채점 환경에 따라 스택 제한을 따로 두기도 한다. 깊이가 10만 수준인 재귀나 함수 안에 선언한 큰 지역 배열(`int a[2000][2000]`은 16MB)이 로컬에서만 runtime error를 내는 흔한 원인이다. 스택이 작게 제한된 환경에서 깊은 재귀가 필요하면 반복문이나 명시적 stack으로 바꾸고, 큰 배열은 전역에 둔다.

재귀와 반복 중 어느 쪽이 빠른지는 문제와 구현에 달려 있다. 같은 factorial 계산은 둘 다 Θ(n) 시간이지만 단순 재귀는 Θ(n) call stack을, 반복 구현은 Θ(1) 추가 공간을 쓸 수 있다. 반면 tree traversal, divide-and-conquer와 backtracking은 재귀 구조가 문제 정의를 직접 드러내기 쉽다. 명시적 stack을 사용하면 같은 top-down 탐색을 반복문으로도 구현할 수 있으므로 top-down 접근이 재귀에만 가능한 것은 아니다.

## 대표 패턴

### 선형 재귀

한 단계에서 subproblem 하나를 호출한다. 분해식과 base case를 함께 정한다.

- factorial: `f(n) = f(n-1) × n`, `n ≤ 1`이면 1
- 배열 합: `sum(a[0..n)) = sum(a[0..n-1)) + a[n-1]`, 빈 배열이면 0
- 문자열 길이: `len(s) = len(마지막 문자를 뺀 s) + 1`, 빈 문자열이면 0
- 거듭제곱: `pow(x, n) = pow(x, n-1) × x`, `n = 0`이면 1. 지수를 절반으로 줄이는 정의로 바꾸면 호출이 Θ(n)에서 Θ(log n)으로 준다(위 분할 정복 거듭제곱). 하위 문제를 어떻게 정의하느냐가 비용을 정한다.

base case를 원소 1개로 두면 빈 입력은 base case에 닿지 않는다. 빈 입력도 유효하면 빈 입력을 base case로 둔다. index나 slice가 매 호출마다 줄어드는지와 함께 줄이는 비용도 확인한다. `arr.slice(1)`처럼 호출마다 남은 부분을 새 배열로 복사하면 복사량이 n-1, n-2, ...로 이어져 전체 Θ(n²) 시간과 할당이 든다. 시작 index를 인자로 넘기면 Θ(n)이다(`recursion/SumOfArr.mts`는 읽기 쉽게 slice를 쓴 예다).

### 분할 정복

둘 이상의 독립 subproblem으로 나누고 결과를 결합한다. merge sort가 대표적이다. subproblem이 겹치면 같은 계산이 반복될 수 있으며, 이때 [[Algorithm-DP|메모이제이션 또는 동적 프로그래밍]]을 검토한다.

### 하노이 탑

원반 `n`개를 옮기려면 위의 `n-1`개를 임시 기둥으로 옮기고, 가장 큰 원반을 목표 기둥으로 옮긴 뒤, `n-1`개를 목표 기둥으로 옮긴다. 이동 횟수 recurrence는 `T(n) = 2T(n-1) + 1`이고 해는 `2^n - 1`이므로 시간은 Θ(2^n), 최대 호출 깊이는 Θ(n)이다.

### 순열과 조합

순열 재귀는 현재 위치에 올 원소를 고르고 swap한 뒤, 자식 호출이 끝나면 다시 swap해 원복한다. 조합 재귀는 다음 시작 index를 넘겨 같은 원소 집합의 순서만 다른 후보를 만들지 않는다. 종료 조건에서 정확히 필요한 개수를 골랐는지 확인한다.

side effect를 쓰는 재귀에서는 `push -> call -> pop`, `visited=true -> call -> visited=false`가 한 쌍이다. 이 규칙을 일반화한 탐색은 [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]에서 다룬다.

## 점검 순서

- base case가 모든 유효 입력을 다루는가
- 매 호출에서 문제 크기가 실제로 줄어드는가
- subproblem이 겹쳐 중복 계산을 만드는가
- 최대 깊이가 입력 상한에서 stack 한도를 넘는가
- 결과 결합과 side effect 순서가 요구사항과 일치하는가

## 예제 코드

`recursion/` 폴더의 `Factorial.mts`, `hanoi.mts`, `pow.mts`, `SumOfArr.mts`

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-DP|동적 프로그래밍 (메모이제이션, 타뷸레이션)]]
- [[Algorithm-Sorting|병합 정렬과 퀵 정렬]]
- [[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]

## 출처

- 인프런, 큰돌 강사, [(필수개념) 재귀함수(recursion)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123497), [(필수개념) 순열 : 개념과 next_permutation](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123523), [(필수개념) 순열 : 재귀함수로 만드는 순열](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123530), [(필수개념) 조합(combination)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=123557), [1주차 개념 #5-2. 문제로 연습하는 시간복잡도 Q3 점화식 설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146893)
- 인프런, 큰돌 강사, [1-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100293), [1-A : 재귀함수로 푸는 방법](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=151225), [1-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100302), [1-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100304), [1 - L 재귀로 푸는 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=228311)
- 인프런, 큰돌 강사, [2-E와 분할정복(Divide & Conquer)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100329), [8-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101061)

- 인프런, 감자 강사, [재귀](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116184), [재귀적으로 생각하기](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116362), [재귀와 하노이 탑](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116528)
- [바킹독의 실전 알고리즘 0x0B강, 재귀 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=8vDDJm5EewM)
- [NIST DADS, recursion](https://xlinux.nist.gov/dads/HTML/recursion.html)
- [Princeton Algorithms, Programming Model](https://algs4.cs.princeton.edu/11model/)
- [MDN, Array.prototype.slice()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)
