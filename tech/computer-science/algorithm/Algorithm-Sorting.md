---
tags: [cs, algorithm, sorting]
status: done
category: "CS - 알고리즘"
aliases: ["정렬", "Sorting", "버블 정렬", "선택 정렬", "삽입 정렬", "병합 정렬", "퀵 정렬", "분할 정복"]
---

# 정렬 (Sorting)

정렬은 데이터셋을 정해진 순서로 재배치하는 것이다. 별도 index가 없는 unsorted array의 comparison search는 worst-case Θ(n)이지만, 정렬된 random-access array에서는 binary search로 worst-case Θ(log n)에 찾을 수 있다. 정렬 비용과 이후 search, merge, range 처리의 이득을 함께 비교한다. 성능 표기인 Big O는 [[Algorithm-Complexity]].

## 다섯 알고리즘 비교

아래 표는 흔히 쓰는 array 구현 기준이다. stability와 in-place 여부는 알고리즘 이름만이 아니라 실제 partition, merge와 tie 처리 방식에 따라 달라질 수 있다.

| 알고리즘 | 최선 | 평균 | 최악 | 공간 | 안정 | 제자리 |
|---|---|---|---|---|---|---|
| 버블 | O(n)¹ | O(n^2) | O(n^2) | O(1) | O | O |
| 선택 | O(n^2) | O(n^2) | O(n^2) | O(1) | X | O |
| 삽입 | O(n) | O(n^2) | O(n^2) | O(1) | O | O |
| 병합 | O(n log n) | O(n log n) | O(n log n) | O(n) | O | X |
| 퀵 | O(n log n) | O(n log n) | O(n^2)² | 평균 O(log n), 최악 O(n) | X | O |

¹ 한 순회에 교환이 한 번도 없으면 종료하는 최적화 기준. 최적화 없는 단순 구현은 항상 O(n^2).
² 피벗이 한쪽으로 치우치면(이미 정렬된 입력에 끝값을 피벗으로 잡는 등) 분할이 1:n-1로 무너진다. random shuffle이나 randomized pivot은 그 가능성을 낮추지만 deterministic worst-case bound 자체를 O(n log n)으로 바꾸지는 않는다.

- **제자리(in-place)**: 입력 배열 외 추가 메모리를 거의 안 쓰는가
- **안정(stable)**: 값이 같은 원소들의 원래 순서가 보존되는가 (2차 키로 다시 정렬할 때 중요)

## 단순 정렬 (O(n^2))

### 버블 정렬 (Bubble sort)
인접한 두 원소를 비교해 순서가 어긋나면 교환하며 끝까지 훑는다. 한 번 순회할 때마다 가장 큰 값이 거품처럼 맨 뒤로 떠올라 자리를 확정한다(이름의 유래). 직관적이고 구현이 쉽지만 교환이 잦아 비효율적이다. 이미 정렬된 입력에서 교환이 한 번도 없으면 그 순회에서 멈추도록 최적화하면 최선 O(n)이 된다.

### 선택 정렬 (Selection sort)
전체에서 최솟값을 찾아 맨 앞과 교환하고, 다음 위치부터 같은 일을 반복한다. 한 순회마다 한 자리가 확정된다. 입력 상태와 무관하게 항상 전체를 훑으므로 최선이든 최악이든 한결같이 O(n^2)이다. 교환 횟수는 적지만(최대 n번) 비교는 늘 전부 한다.

### 삽입 정렬 (Insertion sort)
앞에서부터 한 원소씩 꺼내, 이미 정렬된 앞부분에서 제자리를 찾아 끼워 넣는다. 손에 든 카드를 정렬하는 방식과 가장 비슷하다. 거의 정렬된 데이터에선 이동이 거의 없어 최선 O(n)으로 빠르고, 작은 입력에 효율적이라 실무 정렬의 작은 구간 처리에 자주 쓰인다.

## 분할 정복 정렬 (O(n log n))

분할 정복(Divide and Conquer)은 큰 문제를 작은 문제로 쪼개 각각 풀고 합쳐 원래 문제를 푸는 전략이다([[Algorithm-Recursion|재귀]]로 구현). 병합 정렬과 퀵 정렬은 둘 다 이 전략이지만 정렬 작업이 일어나는 단계가 정반대다.

### 병합 정렬 (Merge sort)
리스트를 길이 1이 될 때까지 반으로 쪼갠 뒤, 두 정렬된 리스트를 합치며 정렬한다. 합칠 때 양쪽 맨 앞을 비교해 작은 값부터 결과에 넣으면, 두 입력이 이미 정렬돼 있으므로 결과도 정렬된 채로 커진다. 분할 단계에선 아무 일도 안 하고 **병합 단계에서 정렬이 일어난다.** 대표적인 array 구현은 입력 상태와 무관하게 Θ(n log n) 비교와 O(n) auxiliary buffer를 사용한다. 같은 key일 때 왼쪽 항목을 먼저 고르는 식으로 구현하면 stable하다.

### 퀵 정렬 (Quick sort)
피벗(pivot) 한 개를 골라 그보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 나누는 분할(partition)을 한 뒤, 양쪽을 재귀로 같은 방식으로 정렬한다. 병합 정렬과 반대로 **분할 단계에서 핵심 작업이 일어나고** 합치는 단계엔 할 일이 없다. 균형 분할이면 Θ(n log n), 계속 0:n-1로 치우치면 Θ(n^2)이다. 제자리 partition은 별도 array를 줄일 수 있지만 call stack은 평균 O(log n), 최악 O(n)이다. randomization, median-of-three와 작은 구간의 insertion sort 전환은 실무 성능을 개선하지만 비교 방식, 입력 분포와 memory hierarchy에 따라 merge sort보다 빠르다고 일반화하지 않는다.

## 예제 코드
`sort/` 폴더 — `bubble.mts`, `selection.mts`, `insert.mts`, `merge.mts`, `quick.mts`

## 면접 체크포인트
- 정렬의 실익 = 이진 탐색 등 빠른 탐색의 전제 (순차 O(n) → 이진 O(log n))
- 버블, 선택, 삽입 정렬의 평균은 Θ(n^2), 병합 정렬은 Θ(n log n), 퀵 정렬의 평균은 Θ(n log n)
- 버블, 삽입은 거의 정렬된 입력에서 최선 O(n), 선택은 입력 무관 항상 O(n^2)
- 병합 vs 퀵: 정렬이 일어나는 단계(병합은 합칠 때, 퀵은 쪼갤 때), 대표 array 구현의 공간(병합 O(n), 퀵 평균 O(log n) stack), 최악(병합 Θ(n log n), 퀵 Θ(n^2))
- 퀵 정렬 최악의 원인(치우친 피벗)과 완화책(randomization, median-of-three, introspective fallback)
- 대표 구현에서 병합, 삽입, 버블은 stable하고 선택, in-place quick sort는 unstable하지만 실제 구현 계약을 확인

## 관련 문서
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Algorithm-Recursion|재귀 (분할 정복의 구현 토대)]]
- [[Heap|힙 (힙 정렬 O(n log n)의 토대)]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]

## 출처

- 인프런, 감자 강사, [버블정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116713), [선택정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116820), [삽입정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116893)
- 인프런, 감자 강사, [병합정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117350), [퀵정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117552)
- [Princeton Algorithms, Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/)
- [Princeton Algorithms, Mergesort](https://algs4.cs.princeton.edu/22mergesort/)
- [Princeton Algorithms, Quicksort](https://algs4.cs.princeton.edu/23quicksort/)
