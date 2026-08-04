---
tags: [cs, algorithm, practice]
status: done
verified_at: 2026-08-04
category: "CS - 알고리즘"
aliases: ["알고리즘 체크리스트", "알고리즘 실전 활용"]
---

# 알고리즘 문제를 절차로 바꾸는 법

알고리즘 학습의 핵심은 이름을 외우는 것이 아니라 문제의 계약을 실행 가능한 절차와 검증 가능한 불변식으로 바꾸는 것이다.

## 문제풀이 루프

1. 입력 범위, 출력과 실패 조건을 적는다.
2. 작은 예와 반례를 손으로 계산한다.
3. 가장 단순한 완전 탐색을 먼저 정의한다.
4. 반복되는 계산, 정렬 여부와 필요한 상태를 찾는다.
5. 반복문 전후에 항상 참이어야 할 불변식을 적는다.
6. 의사코드로 순서와 분기를 고정한 뒤 구현한다.
7. 정상, 경계, 오류 입력으로 검증하고 시간과 공간 복잡도를 계산한다.

처음부터 유명 알고리즘 이름에 맞추면 전제 조건을 놓치기 쉽다. 먼저 맞는 절차를 만든 뒤 입력 크기와 병목을 근거로 자료구조나 알고리즘을 교체한다.

## 가장 큰 수 찾기

비어 있지 않은 배열의 최댓값은 정렬하지 않고 한 번의 scan으로 찾을 수 있다.

```text
maximum = first element
for value in remaining elements:
    if value > maximum:
        maximum = value
return maximum
```

- 시간복잡도: `O(n)`
- 추가 공간: `O(1)`
- 비교 횟수: 원소가 `n`개면 `n - 1`
- 불변식: 반복이 `i`번째 원소까지 끝났을 때 `maximum`은 앞의 `i`개 중 최댓값이다.

비교만으로 최댓값을 찾는 모델에서는 최댓값이 아닌 각 원소가 적어도 한 번은 패배해야 하므로 `n - 1`번보다 적은 비교로 일반 입력을 해결할 수 없다. 정렬은 최댓값 외에 전체 순서가 필요할 때 선택한다.

## 예시에서 규칙 찾기

코드를 바로 쓰기 어렵다면 상태 변화를 표로 적는다.

| 읽은 값 | 이전 maximum | 다음 maximum |
|---:|---:|---:|
| 3 | 없음 | 3 |
| 1 | 3 | 3 |
| 7 | 3 | 7 |
| 7 | 7 | 7 |

표의 한 행을 처리하는 규칙이 loop body가 되고, 다음 행에도 유지되는 문장이 불변식 후보가 된다. 빈 배열, 음수만 있는 배열과 중복 최댓값을 넣어 초기값과 비교 연산을 검증한다.

## 복잡도에 붙는 조건

| 알고리즘 | 대표 복잡도 | 조건과 주의점 |
|---|---|---|
| 삽입 정렬 | 평균/최악 `O(n^2)` | 거의 정렬된 작은 입력에서는 유용할 수 있음 |
| 병합 정렬 | `O(n log n)` | 추가 공간과 merge 비용 고려 |
| 퀵 정렬 | 평균 `O(n log n)`, 최악 `O(n^2)` | pivot 전략, 입력 분포와 구현에 따라 달라짐 |
| 이진 탐색 | `O(log n)` | 단조 조건 또는 정렬된 random-access 구간 필요 |
| BFS/DFS | 인접 리스트에서 `O(V + E)` | graph 표현에 따라 실제 비용이 달라짐 |

"항상 가장 빠른 알고리즘"은 없다. 입력 분포, 데이터 크기, memory locality, 안정성, 최악 시간 보장과 구현 비용을 함께 비교한다.

## 구현 전에 만드는 반례

sample은 설명용이지 완전한 검증 집합이 아니다. 답이 없는 경우, 원소 하나, 모두 같은 값, 모두 음수, disconnected graph, 시작과 끝이 같은 경우와 최대 경계를 따로 만든다. greedy 후보는 작은 입력의 완전탐색 결과와 대조하면 빠르게 반례를 찾을 수 있다.

오답 분석에서는 증상을 고치기 전에 invariant가 처음 깨지는 state를 찾는다. 변수명을 좌표와 역할에 맞게 통일하고 test case마다 공유 state를 초기화하면 관찰해야 할 경우의 수가 줄어든다.

## 백엔드에서의 연결

| 문제 | 후보 | 확인할 조건 |
|---|---|---|
| rate limit | fixed/sliding window, token bucket | 정확도, burst 허용, 분산 clock과 atomic update |
| LRU cache | hash map + doubly linked list | eviction 동시성, memory overhead |
| 지연 작업 | min-heap 또는 ordered queue | cancel, retry, 같은 시각의 순서 |
| index lookup | B-tree 계열, hash index | range query, persistence와 engine 구현 |
| 경로 탐색 | BFS, Dijkstra 등 | edge weight, 음수 가중치와 graph 크기 |

이 표는 출발점이다. 실제 시스템에서는 database, library와 runtime이 이미 제공하는 구현을 우선 검토하고 관측된 병목이 있을 때 직접 최적화한다.

## 관련 문서

- [[알고리즘(Algorithm)|알고리즘 인덱스]]
- [[Algorithm-Complexity|시간복잡도와 공간복잡도]]
- [[Linear-Data-Structures|선형 자료구조]]
- [[Problem-Solving-Techniques|코딩 테스트 문제 해결 기법]]
- [[Cpp-Coding-Test-Workflow|C++ 구현과 디버깅]]

## 출처

- 인프런, 큰돌 강사, [맞왜틀팁 : 반례를 생각하는 방법 | 2 - C 보완설명](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144195), [맞왜틀팁 : 변수명의 통일](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=146818), [2-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100337), [맞왜틀팁 : 실수를 줄이는 방법 | 히든퀘스트](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=144196)

- 인프런, 널널한 개발자 강사, [가장 큰 수 찾기 #1](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128261), [가장 큰 수 찾기 #2](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128262), [일단 써놓고 규칙을 찾자](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128263)
- [NIST Dictionary of Algorithms and Data Structures, data structure](https://xlinux.nist.gov/dads/HTML/dataStructure.html)
- [Princeton Algorithms, Analysis of Algorithms](https://algs4.cs.princeton.edu/14analysis/)
