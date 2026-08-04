---
tags: [cs, algorithm, greedy, line-sweep, two-pointers, sliding-window]
status: done
category: "CS - 알고리즘"
aliases: ["Greedy Sweep and Two Pointers", "그리디 라인스위핑 투포인터"]
---

# Greedy, line sweep와 two pointers

세 기법은 모두 불필요한 후보를 되돌아보지 않는다는 공통점이 있지만 근거가 다르다. greedy는 선택의 최적성을 증명하고, line sweep는 event 순서로 공간을 압축하며, two pointers는 pointer 이동의 단조성을 이용한다.

## Greedy 선택을 증명하기

매 단계의 국소 최선이 전역 최선이 되는지는 코드가 아니라 증명으로 결정한다.

- exchange argument: 어떤 최적해의 첫 선택을 greedy 선택으로 바꿔도 나빠지지 않음을 보인다.
- stays ahead: 매 단계까지 greedy 해가 다른 해보다 뒤처지지 않음을 보인다.
- cut property: 현재 경계를 건너는 안전한 선택을 추가해도 최적해가 존재함을 보인다.
- optimal substructure만으로는 부족하다. DP에도 같은 성질이 있으므로 greedy-choice property가 따로 필요하다.

Interval scheduling에서 종료 시간이 가장 이른 호환 구간을 고르면, 임의 최적해의 첫 구간을 이 구간으로 바꿔도 이후 사용할 수 있는 시간이 줄지 않는다. 반대로 시작 시간이 빠르거나 길이가 짧다는 기준은 쉽게 반례가 생긴다.

## 정렬과 Priority Queue

deadline과 reward 문제는 event를 deadline 순으로 훑으며 지금까지 선택한 reward를 min heap에 넣는 형태가 자주 나온다. 용량을 넘으면 가장 작은 reward를 버린다. 정렬 기준, heap에 넣는 값과 언제 제거하는지가 greedy invariant를 이룬다.

가방마다 담을 수 있는 물건 중 가치가 가장 큰 것을 고르는 문제도 가방과 물건을 무게 순으로 정렬한 뒤 현재 가방에 들어오는 후보만 max heap에 추가할 수 있다. 매번 전체 후보를 다시 훑지 않는다.

## Line sweep

좌표 전체를 배열로 만들지 않고 시작점, 끝점과 교차 같은 event만 정렬해 왼쪽에서 오른쪽으로 처리한다.

구간 합집합 길이는 구간을 시작점 순으로 정렬하고 현재 `[left, right]`를 유지한다.

- 다음 시작점이 `right` 이하면 `right`를 더 큰 끝점으로 확장한다.
- 분리되어 있으면 기존 길이를 답에 더하고 새 구간을 시작한다.

같은 좌표의 start/end event 순서는 문제의 구간 정의에 따라 달라진다. 닫힌 구간인지 half-open 구간인지 정하고 tie-break를 그 의미에 맞춘다. 좌표 차와 총 길이는 넓은 정수 type을 쓴다.

## Two pointers

두 pointer가 각자 한 방향으로만 움직이고, 한 pointer를 움직였을 때 조건 변화가 단조로우면 중첩 loop처럼 보여도 총 이동은 O(n)이다.

### 정렬된 배열의 두 수 합

합이 target보다 작으면 left를 오른쪽으로, 크면 right를 왼쪽으로 옮긴다. 정렬로 인해 그 반대쪽 후보들을 한꺼번에 버려도 안전하다. 원래 index가 필요하면 값과 index를 함께 정렬한다.

### Sliding window

연속 구간을 유지하며 right를 확장하고 조건을 위반하는 동안 left를 줄인다. 모든 값이 non-negative일 때 합의 증감이 단조로운 유형이 대표적이다. 음수가 섞이면 합이 pointer 이동에 따라 단조롭지 않아 같은 로직이 깨질 수 있다.

중복 없는 subarray 개수는 window 안 빈도를 유지하고, 새 원소가 중복인 동안 left를 이동한 뒤 현재 right에서 끝나는 유효 구간 수를 더한다.

## 구분 체크리스트

| 질문 | 판단 |
|---|---|
| 현재 선택을 최적해로 교환해도 안전한가? | greedy 증명 |
| 값 전체가 아니라 event 좌표만 중요한가? | line sweep |
| pointer가 뒤로 돌아갈 필요가 없음을 보일 수 있는가? | two pointers |
| 합이나 조건이 음수/삭제 때문에 비단조가 되는가? | 다른 기법 검토 |
| 정렬로 원래 순서 정보가 사라져도 되는가? | index 보존 여부 결정 |

## 출처

- 인프런, 큰돌 강사, [5주차 개념 #1. 그리디의 기초](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238520), [5주차 개념 #2. 그리디의 조건과 팁](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238528), [5주차 개념 #3. 큰돌은 욕심많은 도서관 사서야!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100312), [5주차 개념 #4. 골동품 수집가 큰돌은 욕심쟁이야!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238404), [5주차 개념 #5. 큰돌 교수님의 과제는 너무 어려워!!!](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242051)
- 인프런, 큰돌 강사, [5주차 개념 #6. 라인스위핑](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242050), [5주차 개념 #7. 투포인터](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=242052), [5-A](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100396), [5-C](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100398), [5-D](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100399)
- 인프런, 큰돌 강사, [5-E](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100400), [5-F](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100401), [5-G](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100402), [5-H](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100403), [5-I](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100404)
- 인프런, 큰돌 강사, [5-J](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100405), [5-Q](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100412), [5-Z](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100421), [6-F 그리디를 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152628), [6-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100958)
- 인프런, 큰돌 강사, [7-Y 최대값풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100988), [8-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=101073)

- [Princeton Algorithms, greedy algorithms](https://algs4.cs.princeton.edu/lectures/keynote/64GreedyAlgorithms.pdf)
- [NIST DADS, sweep line](https://xlinux.nist.gov/dads/HTML/sweepline.html)

## 관련 문서

- [[Graph-Optimization-Algorithms|Greedy와 최소 신장 트리]]
- [[Prefix-Sum-and-Range-Queries|누적합과 sliding window]]
- [[Algorithm-Sorting|정렬]]
- [[Heap|Priority queue]]
- [[Problem-Solving-Techniques|문제 해결 기법 인덱스]]
