---
tags: [cs, algorithm, practice]
status: done
verified_at: 2026-08-04
category: "CS - 알고리즘"
aliases: ["알고리즘 체크리스트", "알고리즘 실전 활용"]
---

# 알고리즘 문제를 절차로 바꾸는 법

알고리즘 학습은 이름을 외우는 것이 아니라 문제의 계약을 실행 가능한 절차와 검증 가능한 불변식으로 바꾸는 데 초점을 둔다.

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

최댓값을 조건 분기로 직접 비교하는 풀이는 중복 최댓값에서 잘 깨진다. 네 칸 배열에서 `a[0] > a[1] && a[0] > a[2] && a[0] > a[3]`처럼 각 원소가 나머지보다 모두 큰지 검사하고 마지막 원소를 기본값으로 반환하면, `[9, 9, 3, 1]`에서는 어느 조건도 참이 되지 않아 1을 반환한다. 초과를 이상으로 바꾸면 고쳐지지만, 위의 한 번 훑기나 표준 라이브러리(C++ `std::max_element`)가 더 짧고 틀릴 여지가 적다.

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

## 통과한 풀이를 더 줄이기

통과한 풀이에도 시간 성능을 줄일 여지가 남아 있는 경우가 많고, 면접에서는 그 여지를 이어서 물을 수 있다. 반복되는 계산을 찾고, 조건식을 다른 형태로 바꿔 더 빠른 자료구조에 맡기고, 바꾼 뒤 경계 입력으로 다시 검증하는 순서로 줄인다. 서로 다른 두 원소의 합이 target인 쌍이 있는지 묻는 Two Sum으로 보면 다음과 같다.

1. i와 j를 모두 처음부터 끝까지 돌며 i = j만 건너뛰면 loop가 `n²`번 돌아 O(n²)다.
2. 이미 본 쌍을 다시 보지 않도록 j를 i + 1부터 시작하면 `n(n-1)/2`번이다. 여전히 Θ(n²)지만 일은 절반이라, 같은 점근 복잡도가 같은 실행 시간을 뜻하지는 않는다.
3. 조건 `a[i] + a[j] == target`을 `a[j] == target - a[i]`로 바꾸면 안쪽 loop는 값의 존재 여부 조회다. 조회를 hash set에 맡기면 평균 O(1)이라 전체가 평균 O(n)이 되고, 대신 O(n) 공간을 쓴다.
4. 모든 값을 먼저 set에 넣고 시작하면 자기 자신이 짝으로 잡힌다. `[1, 2, 5]`, target 4에서 2를 볼 때 `4 - 2 = 2`가 set에 있어 true가 나오지만 답은 false다. 각 원소를 조회한 뒤에 넣으면 set에는 현재 원소 앞의 값만 있으므로 서로 다른 위치끼리만 짝짓고, `[2, 2]`처럼 같은 값이 두 번 나오는 입력도 맞게 처리한다.

```text
seen = empty hash set
for value in nums:
    if target - value in seen:
        return true
    add value to seen
return false
```

입력이 이미 정렬돼 있거나 추가 공간을 줄여야 하면 정렬 뒤 양 끝에서 좁혀 오는 two pointers도 후보다([[Greedy-Sweep-and-Two-Pointers#정렬된 배열의 두 수 합|정렬된 배열의 두 수 합]]). hash set의 평균 O(1)은 hash가 고르게 퍼질 때의 성질이라 충돌이 몰리면 느려진다([[Hash-Table#Load factor와 resize|Load factor와 resize]]). 중첩 loop 안의 선형 탐색을 set이나 map 조회로 바꾸는 것은 실무 코드에서도 자주 쓰는 개선이다.

## 코딩 테스트의 채점 방식

코딩 테스트는 주어진 문제를 시간 제한(프로그램 시작부터 종료까지)과 메모리 제한 안에서 푸는지를 본다. 제출한 코드는 사람이 읽지 않고, 숨겨진 테스트 케이스(TC) 묶음에 대해 출력이 모두 맞는지로 채점한다. 입력은 문제의 제약 조건을 지킨다고 보장되므로 범위 검증 코드는 필요 없고, 그 대신 제약의 최댓값에서 시간과 자료형이 버티는지를 따진다.

- **전부 아니면 0점**: 부분 점수가 있는 경우는 드물다. 풀이를 알아도 구현이 하나라도 틀리면 틀린 문제다.
- **틀린 입력은 알려 주지 않는다**: 몇 번째 TC에서 틀렸는지 보여 주는 플랫폼은 있어도 어떤 입력인지는 공개하지 않는다. 입력을 알면 출력만 끼워 맞출 수 있기 때문이다. 그래서 스스로 반례를 만드는 능력이 필요하다.
- **제출 성공이 정답이 아니다**: 시험 환경에 따라 제출 시 시간 초과 여부나 제출 완료만 알려 주고 정답 여부는 결과 발표 때 알게 된다. 예제 통과만 믿지 말고 직접 만든 경계 입력으로 확인하고 낸다(위 반례 절).

좋은 성적에는 세 역량이 함께 필요하다.

| 역량 | 의미 | 기르는 법 |
|---|---|---|
| 배경 지식 | 알고리즘, 자료구조, 기법 | 강의와 교재로 체계적으로 익힌다 |
| 문제 해결 능력 | 변형된 문제에서 필요한 기법을 알아보고 적용하는 능력 | 단원마다 여러 문제를 직접 풀어 본다. 강의 시청만으로는 잘 늘지 않는다 |
| 구현력 | 떠올린 풀이를 꼬이지 않게 코드로 옮기는 능력 | 많이 짜 보고, 맞힌 문제도 다른 사람의 풀이를 읽어 더 짧고 안전한 표현을 흡수한다 |

실제 시험에서는 손도 못 대는 경우보다 풀이는 아는데 구현이 꼬이는 경우가 더 많다. 시간이 부족하면 출제 빈도가 높은 범위(완전탐색, BFS와 DFS, 백트래킹, 시뮬레이션)를 먼저 끝내고 기출을 많이 푼다([[Exhaustive-Search-and-Backtracking|완전탐색과 백트래킹]]).

로직은 맞는데 제출하면 틀리는 실수를 줄이려면 쉬운 문제를 많이 풀되, 연습에서는 실제 시험보다 빠르고 정확하게 푸는 것을 목표로 둔다. 쉬운 문제는 금방 끝나 같은 시간에 작성과 점검을 여러 번 반복할 수 있다. 코드를 다 쓰면 위에서부터 변수명, index, 조건식을 빠르게 훑고, 복사해 붙인 블록의 이름을 모두 바꿨는지 본다([[Cpp-Coding-Test-Workflow#제출 전 체크리스트|제출 전 체크리스트]]).

## 백엔드에서의 연결

| 문제 | 후보 | 확인할 조건 |
|---|---|---|
| rate limit | fixed/sliding window, token bucket | 정확도, burst 허용, 분산 clock과 atomic update |
| LRU cache | hash map + doubly linked list | eviction 동시성, memory overhead |
| 지연 작업 | min-heap 또는 ordered queue | cancel, retry, 같은 시각의 순서 |
| index lookup | [[B-Tree\|B-tree]] 계열, hash index | range query, persistence와 engine 구현 |
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
- YouTube, 쉬운코드, [TwoSum 문제로 보는 코드 성능 개선 과정](https://www.youtube.com/watch?v=cxhbgAbAiXI)
- [바킹독의 실전 알고리즘 0x00강, 오리엔테이션 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=LcOIobH7ues)
- [NIST Dictionary of Algorithms and Data Structures, data structure](https://xlinux.nist.gov/dads/HTML/dataStructure.html)
- [Princeton Algorithms, Analysis of Algorithms](https://algs4.cs.princeton.edu/14analysis/)
