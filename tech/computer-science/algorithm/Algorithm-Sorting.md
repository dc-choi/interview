---
tags: [cs, algorithm, sorting]
status: done
category: "CS - 알고리즘"
aliases: ["정렬", "Sorting", "계수 정렬", "Counting Sort", "기수 정렬", "Radix Sort", "버블 정렬", "선택 정렬", "삽입 정렬", "병합 정렬", "퀵 정렬", "힙 정렬", "Heap Sort", "분할 정복"]
verified_at: 2026-09-30
---

# 정렬 (Sorting)

정렬은 데이터셋을 정해진 순서로 재배치하는 것이다. 별도 index가 없는 unsorted array의 comparison search는 worst-case Θ(n)이지만, 정렬된 random-access array에서는 binary search로 worst-case Θ(log n)에 찾을 수 있다. 정렬 비용과 이후 search, merge, range 처리의 이득을 함께 비교한다. 성능 표기인 Big O는 [[Algorithm-Complexity]].

## 알고리즘 비교

아래 표는 흔히 쓰는 array 구현 기준이다. stability와 in-place 여부는 알고리즘 이름만이 아니라 실제 partition, merge와 tie 처리 방식에 따라 달라질 수 있다.

| 알고리즘 | 최선 | 평균 | 최악 | 공간 | 안정 | 제자리 |
|---|---|---|---|---|---|---|
| 버블 | O(n)¹ | O(n^2) | O(n^2) | O(1) | O | O |
| 선택 | O(n^2) | O(n^2) | O(n^2) | O(1) | X | O |
| 삽입 | O(n) | O(n^2) | O(n^2) | O(1) | O | O |
| 병합 | O(n log n) | O(n log n) | O(n log n) | O(n) | O | X |
| 퀵 | O(n log n) | O(n log n) | O(n^2)² | 평균 O(log n), 최악 O(n) | X | O |
| 힙 | O(n log n)³ | O(n log n) | O(n log n) | O(1) | X | O |

¹ 한 순회에 교환이 한 번도 없으면 종료하는 최적화 기준. 최적화 없는 단순 구현은 항상 O(n^2).
² 피벗이 한쪽으로 치우치면(이미 정렬된 입력에 끝값을 피벗으로 잡는 등) 분할이 1:n-1로 무너진다. random shuffle이나 randomized pivot은 그 가능성을 낮추지만 deterministic worst-case bound 자체를 O(n log n)으로 바꾸지는 않는다.
³ 서로 다른 key 기준. 모든 key가 같으면 sift-down이 바로 멈춰 선형 시간에 끝난다. 공간 O(1)은 배열 안에서 heap을 만드는 in-place 구현 기준이다.

- **제자리(in-place)**: 입력 배열 외 추가 메모리를 거의 안 쓰는가
- **안정(stable)**: 값이 같은 원소들의 원래 순서가 보존되는가 (2차 키로 다시 정렬할 때 중요)

## 단순 정렬 (O(n^2))

### 버블 정렬 (Bubble sort)
인접한 두 원소를 비교해 순서가 어긋나면 교환하며 끝까지 훑는다. 한 번 순회할 때마다 가장 큰 값이 거품처럼 맨 뒤로 떠올라 자리를 확정한다(이름의 유래). 직관적이고 구현이 쉽지만 교환이 잦아 비효율적이다. 이미 정렬된 입력에서 교환이 한 번도 없으면 그 순회에서 멈추도록 최적화하면 최선 O(n)이 된다. 회차 i의 안쪽 비교 범위는 `0..n-2-i`로 한 칸씩 줄어, 조기 종료가 없으면 비교는 모두 `n(n-1)/2`번이다([[Algorithm-Complexity|시간복잡도]]의 삼각합). 앞 값이 뒤 값보다 클 때(`a[j] > a[j+1]`)만 교환하므로 같은 값은 서로를 넘지 않아 stable하다. 조건을 `>=`로 바꾸면 같은 값끼리 자리를 바꿔 안정성이 깨진다.

### 선택 정렬 (Selection sort)
전체에서 최솟값을 찾아 맨 앞과 교환하고, 다음 위치부터 같은 일을 반복한다. 한 순회마다 한 자리가 확정된다. 입력 상태와 무관하게 항상 전체를 훑으므로 비교는 늘 `n(n-1)/2`번이고 최선이든 최악이든 한결같이 O(n^2)이다. 교환은 회차당 한 번 이하라 최대 n-1번으로 적다(회차마다 제자리 교환까지 하는 구현은 n번으로 센다). 대신 멀리 떨어진 두 원소를 맞바꾸므로 같은 값의 순서가 뒤집힐 수 있다. `[2a, 2b, 1]`은 첫 회차에 2a와 1이 바뀌어 `[1, 2b, 2a]`가 된다.

### 삽입 정렬 (Insertion sort)
앞에서부터 한 원소씩 꺼내, 이미 정렬된 앞부분에서 제자리를 찾아 끼워 넣는다. 손에 든 카드를 정렬하는 방식과 가장 비슷하다. 거의 정렬된 데이터에선 이동이 거의 없어 최선 O(n)으로 빠르고, 작은 입력에 효율적이라 실무 정렬의 작은 구간 처리에 자주 쓰인다.

구현은 `current = a[i]`를 꺼내 정렬된 영역을 `j = i-1`부터 거꾸로 보며, `a[j] > current`인 동안 `a[j]`를 한 칸 뒤로 덮어써 밀고, current 이하인 값을 만나면 멈춰 그 뒤에 current를 한 번만 쓴다. 교환 대신 밀기를 쓰고 같은 값을 넘어가지 않으므로 stable하다. 이미 정렬된 입력은 회차마다 비교 1번에 멈춰 총 n-1번(최선 O(n)), 역순 입력은 비교와 밀기가 각각 `n(n-1)/2`번이다.

## 분할 정복 정렬 (O(n log n))

분할 정복(Divide and Conquer)은 큰 문제를 작은 문제로 쪼개 각각 풀고 합쳐 원래 문제를 푸는 전략이다([[Algorithm-Recursion|재귀]]로 구현). 병합 정렬과 퀵 정렬은 둘 다 이 전략이지만 정렬 작업이 일어나는 단계가 정반대다.

### 병합 정렬 (Merge sort)
리스트를 길이 1이 될 때까지 반으로 쪼갠 뒤, 두 정렬된 리스트를 합치며 정렬한다. 합칠 때 양쪽 맨 앞을 비교해 작은 값부터 결과에 넣으면, 두 입력이 이미 정렬돼 있으므로 결과도 정렬된 채로 커진다. 분할 단계에선 아무 일도 안 하고 **병합 단계에서 정렬이 일어난다.** 대표적인 array 구현은 입력 상태와 무관하게 Θ(n log n) 비교와 O(n) auxiliary buffer를 사용한다. 같은 key일 때 왼쪽 항목을 먼저 고르는 식으로 구현하면 stable하다.

`merge(lo, mid, hi)`는 다음 순서로 동작한다.

1. 두 구간의 현재 원소를 비교해 작은 값을 임시 배열에 쓰고 그 구간의 index를 한 칸 옮긴다. 같으면 왼쪽을 먼저 쓴다.
2. 한쪽이 소진되면 다른 쪽의 남은 원소를 비교 없이 순서대로 복사한다. 남은 원소는 이미 정렬돼 있고 모두 결과 끝에 온다.
3. 임시 배열의 `[lo, hi]`를 원본 구간으로 되돌려 쓴다. 결과를 원본에 바로 쓰면 아직 비교하지 않은 원소를 덮어쓴다.

2를 빠뜨리면 원소가 사라지고, 3을 빠뜨리면 결과가 원본에 반영되지 않는다. 원소 k개를 병합하는 비교는 최대 k-1번이고, 임시 배열에 쓰기와 원본으로 되돌려 쓰기는 각각 k번이다. `[2, 5, 7]`과 `[1, 3, 9]`는 비교 5번으로 1, 2, 3, 5, 7을 채운 뒤 9를 그대로 복사한다. 같은 깊이의 merge들이 다루는 원소 수의 합은 n이고 구간이 절반씩 줄어 깊이는 약 log₂ n이므로 `T(n) = 2T(n/2) + Θ(n)`, 즉 Θ(n log n)이다. 비교 수는 입력에 따라 ½ n lg n에서 n lg n 사이지만 단계 수와 단계당 이동 수는 입력과 무관하다.

### 퀵 정렬 (Quick sort)
피벗(pivot) 한 개를 골라 그보다 작은 값은 왼쪽, 큰 값은 오른쪽으로 나누는 분할(partition)을 한 뒤, 양쪽을 재귀로 같은 방식으로 정렬한다. 병합 정렬과 반대로 **분할 단계에서 핵심 작업이 일어나고** 합치는 단계엔 할 일이 없다. 균형 분할이면 Θ(n log n), 계속 0:n-1로 치우치면 Θ(n^2)이다. 제자리 partition은 별도 array를 줄일 수 있지만 call stack은 평균 O(log n), 최악 O(n)이다. randomization, median-of-three와 작은 구간의 insertion sort 전환은 실무 성능을 개선하지만 비교 방식, 입력 분포와 memory hierarchy에 따라 merge sort보다 빠르다고 일반화하지 않는다.

첫 원소를 pivot으로 쓰는 양끝 포인터 partition(`sort/quick.mts`)은 다음과 같이 동작한다.

1. `pivot = a[lo]`로 두고 왼쪽 포인터는 `lo+1`에서 오른쪽으로 가며 pivot보다 큰 값에서, 오른쪽 포인터는 `hi`에서 왼쪽으로 가며 pivot보다 작은 값에서 멈춘다.
2. 두 포인터가 교차하지 않았으면 두 값을 교환하고 탐색을 이어 간다.
3. 교차하면 pivot과 오른쪽 포인터 위치의 값을 교환하고 그 index를 반환한다. 오른쪽 포인터는 pivot보다 작은 값에서만 멈추므로 교차 시점에는 작은 값 영역의 마지막 칸을 가리킨다.

pivot은 최종 위치에 고정되므로 재귀 범위 `[lo, p-1]`, `[p+1, hi]`에서 빠지고, partition마다 원소 하나가 영구히 고정돼 재귀가 반드시 끝난다. `[7, 2, 1, 6, 8, 5, 3, 4]`에서 pivot 7이면 8과 4를 교환한 뒤 포인터가 교차해 `[3, 2, 1, 6, 4, 5, 7, 8]`이 되고 7이 index 6에 고정된다.

- 이 방식은 pivot과 같은 값을 두 포인터가 모두 건너뛴다. 모든 key가 같으면 오른쪽 포인터가 lo까지 내려가 매번 1 : n-1로 나뉜다. n = 2000에서 직접 세어 보면 비교 약 400만 번과 재귀 깊이 1999였고, 같은 key에서 두 스캔을 모두 멈추는 방식(algs4)은 약 2만 번과 깊이 10이었다. 중복 key가 많은 입력에서 이차 시간을 피하려면 같은 key에서 멈추거나 3-way partition을 쓴다.
- 이미 정렬된 입력은 두 방식 모두 첫 원소 pivot 때문에 깊이 n-1로 퇴화한다(표 각주 ²). 깊이가 n에 비례하면 call stack 한도를 넘을 수 있다([[Algorithm-Recursion#Call stack과 비용|call stack]]).
- 서로 다른 key에서 퀵 정렬의 평균 비교 수는 약 2n ln n(≈ 1.39 n lg n)으로 병합 정렬(½ n lg n에서 n lg n)보다 많다. 퀵 정렬의 실무 이점은 비교 수가 아니라 제자리 partition과 연속 메모리 접근에서 온다.

### 병합과 라이브러리 정렬을 쓸 때

- **정렬된 두 리스트 합치기**는 병합 정렬과 별개로 자주 쓰는 기법이다. 두 리스트의 맨 앞만 비교해 작은 쪽을 결과에 옮기면 비교 한 번에 원소 하나가 자리를 찾으므로 길이 n, m이면 O(n + m)이다. 한쪽이 먼저 끝나면 남은 쪽을 그대로 붙이는 처리를 빠뜨리기 쉽다.
- 병합 정렬의 합치는 단계는 결과를 임시로 담을 공간이 필요하다. 호출마다 새 배열을 만들지 말고 입력 크기만 한 버퍼를 한 번 잡아 재사용한다.
- 퀵 정렬은 분할이 1:99처럼 일정 비율로 치우쳐도 여전히 O(n log n)이고, 제자리에서 연속 구간을 다뤄 캐시 적중률이 높아 평균적으로 빠르다. 하지만 정렬된 입력처럼 매번 0:n-1로 갈리면 O(n²)이다. 코딩 테스트에서 정렬을 직접 짜야 한다면 최악이 보장되는 병합 정렬을 쓴다.
- 표준 라이브러리 정렬은 이 약점을 보완해 두었으므로 직접 구현보다 우선한다. C++ `std::sort`는 최악에도 O(n log n) 비교를 요구하며(결함 보고 LWG 713 반영, 그 전에는 순수 퀵 정렬 구현도 허용됐다), 보통 퀵 정렬로 시작해 재귀가 일정 깊이를 넘으면 힙 정렬로 바꾸는 introsort로 구현한다. `std::sort`는 안정 정렬이 아니므로 같은 key의 원래 순서를 지켜야 하면 `std::stable_sort`를 쓴다.

## 힙 정렬 (Heap sort)

root가 항상 최댓값(또는 최솟값)인 [[Heap|heap]]으로 정렬한다.

- 가장 단순한 형태는 모든 값을 min heap에 넣고 빌 때까지 꺼내는 것이다. 삽입과 추출이 각각 O(log n)이라 O(n log n)이지만 별도 heap에 O(n) 공간이 든다.
- 표준 in-place 구현은 배열 자체를 max heap으로 만든다. 마지막 internal node(0-based index `⌊n/2⌋ - 1`)부터 root까지 거꾸로 sift-down하면 heap 구성은 O(n)이다(비교 2n번, 교환 n번 이하). 그다음 root와 범위 끝을 교환하고 범위를 하나 줄여 sift-down하기를 반복하면 추가 공간 O(1)로 오름차순이 된다. 전체 비교와 교환은 2n lg n번 이하다.
- pivot이 없어 입력과 무관하게 최악도 O(n log n)이다. 이 예측 가능성을 성능이 안정적이라고 표현하기도 하지만 정렬의 안정성(stable)과는 다른 개념이다. root와 끝 원소를 교환하며 같은 key의 순서가 바뀌므로 unstable하다. 같은 key 두 개인 `[1a, 1b]`도 `[1b, 1a]`가 된다.
- 최악 보장과 제자리 정렬을 함께 갖춘 드문 비교 정렬이지만, 부모와 자식 index가 멀어 cache를 잘 쓰지 못하고 inner loop도 퀵 정렬보다 길어 평균적으로는 퀵 정렬보다 느린 경우가 많다. 그래서 단독보다 introsort에서 재귀가 깊어질 때의 fallback으로 쓰인다(위 `std::sort`).

## 비교하지 않는 정렬

원소끼리 비교하지 않고 값 자체를 index로 써서 정렬하면 비교 정렬의 Ω(n log n) 하한을 받지 않는다.

- **counting sort**: 값의 범위가 0부터 K-1이면 각 값의 등장 횟수를 세고 작은 값부터 횟수만큼 출력한다. 시간 O(n + K), 공간 O(K)다. K가 크면 배열을 잡을 수 없으므로 값 범위가 수백만에서 천만 이하 정도로 작을 때만 쓴다(512MB에 4바이트 `int`는 약 1.3억 개).
- **radix sort**: 가장 낮은 자리부터 자릿수 기준으로 안정 정렬(자리 값별 버킷에 순서대로 넣고 순서대로 꺼내기)을 d번 반복한다. 낮은 자리 정렬 결과가 높은 자리 정렬에서 깨지지 않으려면 각 단계가 stable해야 한다. 버킷 수를 k라 하면 O(d(n + k))다.

코딩 테스트에서는 둘 다 직접 구현하기보다 원리를 설명할 수 있으면 되고, 값 범위가 작을 때 등장 횟수 배열([[Linear-Data-Structures#값을 index로 쓰는 배열|값을 index로 쓰는 배열]])을 떠올리는 데 쓴다.

## 표준 정렬 사용법

C++ `std::sort(a, a + n)`처럼 끝 위치는 마지막 원소 다음을 넘긴다(`vector`는 `v.begin(), v.end()`). `pair`와 `tuple`은 첫 원소부터 차례로 비교하는 사전식 대소가 정의돼 있어 좌표나 여러 속성을 정렬할 때 구조체 없이 쓸 수 있다.

비교 함수 `cmp(a, b)`는 a가 b보다 앞에 와야 할 때만 true를 반환해야 한다. 같은 값이나 같은 우선순위에서 true를 반환하면(`return a >= b;`) strict weak ordering을 어겨 결과가 정의되지 않고, 정렬 도중 배열 범위를 벗어나 runtime error가 나기도 한다. 내림차순은 `a > b`로 쓴다. 문자열이나 구조체를 받는 비교 함수는 `const string& a`처럼 const 참조로 받아 호출마다 복사하지 않는다.

## 정렬로 풀리는 문제

정렬하면 같은 값이 인접한다. 가장 많이 나온 수 찾기는 모든 쌍을 세는 O(n²) 대신 정렬(O(n log n)) 뒤 한 번 훑으며 연속 구간 길이를 세면 된다. 값의 범위가 커서(예: ±2⁶²) 횟수 배열을 쓸 수 없을 때 특히 유용하다. 구간이 바뀌는 순간에만 최댓값을 갱신하므로 마지막 구간을 loop 뒤에 한 번 더 처리하는 것을 빠뜨리기 쉽다. 중복 제거도 정렬 뒤 인접 비교(`std::unique`)로 한다.

## 예제 코드
`sort/` 폴더 — `bubble.mts`, `selection.mts`, `insert.mts`, `merge.mts`, `quick.mts`

## 면접 체크포인트
- 정렬의 실익 = 이진 탐색 등 빠른 탐색의 전제 (순차 O(n) → 이진 O(log n))
- 버블, 선택, 삽입 정렬의 평균은 Θ(n^2), 병합 정렬은 Θ(n log n), 퀵 정렬의 평균은 Θ(n log n)
- 버블, 삽입은 거의 정렬된 입력에서 최선 O(n), 선택은 입력 무관 항상 O(n^2)
- 병합 vs 퀵: 정렬이 일어나는 단계(병합은 합칠 때, 퀵은 쪼갤 때), 대표 array 구현의 공간(병합 O(n), 퀵 평균 O(log n) stack), 최악(병합 Θ(n log n), 퀵 Θ(n^2))
- 퀵 정렬 최악의 원인(치우친 피벗, 같은 값을 건너뛰는 partition의 중복 key)과 완화책(randomization, median-of-three, 같은 key에서 멈추는 partition, introspective fallback)
- 힙 정렬: 최악 O(n log n)과 제자리를 함께 보장하지만 unstable. 최악 성능이 안정적이라는 말과 stable은 다른 개념
- 대표 구현에서 병합, 삽입, 버블은 stable하고 선택, in-place quick sort, heap sort는 unstable하지만 실제 구현 계약을 확인

## 관련 문서
- [[Algorithm-Complexity|시간복잡도와 Big O]]
- [[Algorithm-Recursion|재귀 (분할 정복의 구현 토대)]]
- [[Heap|힙 (힙 정렬 O(n log n)의 토대)]]
- [[알고리즘(Algorithm)|알고리즘 인덱스]]

## 출처

- 인프런, 감자 강사, [버블정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116713), [선택정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116820), [삽입정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116893)
- 인프런, 감자 강사, [병합정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117350), [퀵정렬](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=117552)
- 인프런, 감자 강사, [힙 정렬 알고리즘](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135765)
- [Princeton Algorithms, Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/)
- [바킹독의 실전 알고리즘 0x0E강, 정렬 I — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=59fZkZO0Bo4)
- [바킹독의 실전 알고리즘 0x0F강, 정렬 II — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=dq5t1woLJMw)
- [cppreference, std::sort](https://en.cppreference.com/w/cpp/algorithm/sort)
- [Princeton Algorithms, Mergesort](https://algs4.cs.princeton.edu/22mergesort/)
- [Princeton Algorithms, Quicksort](https://algs4.cs.princeton.edu/23quicksort/)
- [Princeton Algorithms, Priority Queues](https://algs4.cs.princeton.edu/24pq/)
- [Princeton Algorithms, Priority Queues lecture slides](https://algs4.cs.princeton.edu/lectures/keynote/24PriorityQueues-2x2.pdf)
