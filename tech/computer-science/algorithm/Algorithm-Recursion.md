---
tags: [cs, algorithm, recursion]
status: done
category: "CS - 알고리즘"
aliases: ["재귀", "Recursion"]
---

# 재귀

재귀 함수는 직접 또는 다른 함수를 거쳐 간접적으로 자신을 다시 호출한다. 핵심은 호출 문법이 아니라 문제를 같은 형태의 더 작은 subproblem으로 정의하고 그 답으로 원래 답을 구성하는 데 있다.

## 종료와 정당성

재귀 설계에는 다음 세 요소가 필요하다.

1. 더 나누지 않고 답을 낼 수 있는 base case
2. 각 호출이 base case에 가까워진다고 보일 수 있는 감소량 또는 well-founded order
3. subproblem의 답을 현재 문제의 답으로 결합하는 규칙

base case가 코드에 있어도 입력이 그 조건으로 수렴하지 않으면 종료하지 않는다. 종료 전에 runtime의 call stack 한도를 넘으면 stack overflow가 날 수 있다.

## Call stack과 비용

일반적인 함수 호출은 parameter, local state와 return 위치를 activation record로 관리한다. 재귀 깊이가 `d`이면 호출 frame 때문에 보통 O(d)의 추가 공간을 사용한다. 언어와 runtime이 tail-call optimization을 보장하지 않는다면 tail recursion도 이 공간을 줄인다고 가정하지 않는다.

재귀와 반복 중 어느 쪽이 빠른지는 문제와 구현에 달려 있다. 같은 factorial 계산은 둘 다 Θ(n) 시간이지만 단순 재귀는 Θ(n) call stack을, 반복 구현은 Θ(1) 추가 공간을 쓸 수 있다. 반면 tree traversal, divide-and-conquer와 backtracking은 재귀 구조가 문제 정의를 직접 드러내기 쉽다. 명시적 stack을 사용하면 같은 top-down 탐색을 반복문으로도 구현할 수 있으므로 top-down 접근이 재귀에만 가능한 것은 아니다.

## 대표 패턴

### 선형 재귀

한 단계에서 subproblem 하나를 호출한다. factorial, 배열 합과 문자열 길이 계산이 예다. index나 slice가 매 호출마다 줄어드는지 확인한다.

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
- [NIST DADS, recursion](https://xlinux.nist.gov/dads/HTML/recursion.html)
- [Princeton Algorithms, Programming Model](https://algs4.cs.princeton.edu/11model/)
