---
tags: [cs, algorithm, brute-force, backtracking, permutation, combination]
status: done
category: "CS - 알고리즘"
aliases: ["Exhaustive Search and Backtracking", "완전탐색과 백트래킹"]
---

# 완전탐색과 백트래킹

완전탐색은 유효한 후보를 빠짐없이 검사한다. 백트래킹은 아직 완성되지 않은 후보가 어떤 답으로도 이어질 수 없음을 알았을 때 그 subtree를 버리는 완전탐색이다.

## 먼저 상태 공간을 센다

`n`만 보고 판단하지 말고 실제 후보 수와 후보 하나를 검증하는 비용을 곱한다.

- 모든 binary 선택: `2^n`
- 길이 `r`의 순열: `P(n, r)`
- 크기 `r`의 조합: `C(n, r)`
- grid에서 매 단계 최대 `b`개 선택, 깊이 `d`: 상한 `O(b^d)`

대칭, 중복 값, 이미 고정된 선택과 조기 종료 조건을 반영하면 실제 상태 수는 줄 수 있다. 고정된 연산 횟수 기준만 외우지 말고 입력 상한, 검증 비용과 언어 실행 비용을 함께 본다.

## 재귀 상태의 구성

backtracking 함수는 보통 다음 네 요소를 가진다.

1. 지금까지 내린 선택을 표현하는 state
2. 다음에 고를 후보를 만드는 transition
3. 답을 기록하는 base case
4. 더 진행해도 답이 없다는 pruning predicate

```text
search(state):
  if complete(state): record(state); return
  for choice in candidates(state):
    if invalid(choice): continue
    apply(choice)
    search(next state)
    undo(choice)
```

`apply`와 `undo`는 한 쌍이다. `visited`, vector, 누적합과 grid를 수정했다면 같은 stack frame에서 원복한다. immutable state를 복사하면 원복 실수는 줄지만 복사 비용을 계산해야 한다.

## 순열과 조합

순열은 순서가 결과를 바꾸고, 조합은 선택 집합만 중요하다.

- 모든 순열을 사전식으로 열거할 때는 정렬된 상태에서 `std::next_permutation`을 반복한다.
- 재귀 순열은 선택한 위치를 swap하고 호출 뒤 다시 swap한다.
- 조합은 다음 탐색 시작 index를 넘겨 같은 집합의 다른 순서를 만들지 않는다.
- 중복 값이 있으면 같은 recursion depth에서 동일한 값을 다시 고르지 않는 규칙을 명시한다.

## 안전한 pruning

pruning은 빠를 것 같다는 추측이 아니라 버린 subtree에 최적해가 없다는 논거가 있어야 한다.

- 제약 위반: 이미 제한을 넘었고 이후 선택이 되돌릴 수 없음
- bound: 현재 값과 가능한 최선의 남은 값을 합쳐도 incumbent보다 나쁨
- dominance: 같은 상태에 더 나은 비용으로 이미 도달함
- symmetry: 서로 바꿔도 같은 결과인 후보 중 대표 하나만 탐색

잘못된 greedy 선택을 pruning처럼 넣으면 완전성이 깨진다. 먼저 pruning 없는 작은 입력 버전과 결과를 대조하는 것이 안전하다.

## Meet in the middle

선택 수가 n개라서 O(2^n)은 크지만 절반의 O(2^(n/2))은 가능한 경우, 입력을 두 집합으로 나눠 각 절반의 모든 결과를 만든다. 한쪽 결과를 정렬한 뒤 다른 쪽 결과마다 binary search하거나 two pointers로 합치는 방식이 대표적이다.

시간과 memory는 문제에 따라 대략 O(2^(n/2)) 규모로 줄지만, 두 절반의 결과를 어떻게 합쳐야 원래 제약과 중복 개수를 보존하는지 증명해야 한다. 부분집합 합에서는 같은 합의 빈도를 유지하고 빈 subset 포함 여부를 확인한다.

## BFS도 상태 공간 탐색이다

가중치가 모두 같은 상태 전이에서 최소 횟수를 찾으면 BFS를 쓴다. 좌표뿐 아니라 열쇠 보유, 남은 체력, 시간의 parity처럼 미래 선택에 영향을 주는 값을 정점 상태에 포함한다. `visited[position]`만 두면 서로 다른 상태를 합쳐 오답이 될 수 있다.

경로를 복원하려면 처음 방문할 때 predecessor를 기록하고 목표에서 시작점까지 거슬러 올라간 뒤 뒤집는다. 여러 최단 경로의 수가 필요하면 같은 최단 거리에 다시 도착한 경우 count를 합산한다.

## 대표 실패 원인

- base case 전에 array 범위를 벗어남
- 전역 accumulator를 sibling 호출 사이에 복구하지 않음
- 중복 순열을 모두 생성함
- 이론적 상한만 보고 실제 검증 비용을 빠뜨림
- pruning 조건이 최적해도 제거함
- grid의 `(y, x)`와 방향 vector 순서를 섞음

## 출처

- 인프런, 큰돌 강사, [2-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100340), [3주차 개념 #1. 완전탐색과 백트래킹](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100310), [3주차개념 #2. 완탐과 원복](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=160119), [3-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100356), [3-B](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100357)
- 인프런, 큰돌 강사, [3-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100358), [3-D와 반례](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100359), [3-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100360), [3-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100361), [3-G 와 테스트케이스 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100362)
- 인프런, 큰돌 강사, [3-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100363), [3-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100364), [3-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100365), [3-K와 문제의 단순화](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100366), [3-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100367)
- 인프런, 큰돌 강사, [3-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100368), [3-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100369), [3-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100370), [3-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100371), [3-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100372)
- 인프런, 큰돌 강사, [맞왜틀팁 : 전역변수를 사용할 때 주의할 점 | 3-Q 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144194), [5-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100410), [5-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100413), [5-S](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100414), [5-X](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100419)
- 인프런, 큰돌 강사, [7-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100977), [7-U meet in the middle](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100984)

- [NIST DADS, backtracking](https://xlinux.nist.gov/dads/HTML/backtrack.html)
- [NIST DADS, brute force](https://xlinux.nist.gov/dads/HTML/bruteForce.html)

## 관련 문서

- [[Algorithm-Recursion|재귀와 call stack]]
- [[Graph-Traversal-and-Shortest-Path|DFS/BFS와 경로 복원]]
- [[Bitmask-DP-and-TSP|부분집합을 bit mask로 표현하기]]
- [[Cpp-Coding-Test-Workflow|구현과 반례 점검]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]
