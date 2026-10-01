---
tags: [cs, data-structure, array, linked-list, stack, queue, deque, set]
status: done
category: "CS - 자료구조"
aliases: ["Linear Data Structures", "선형 자료구조", "Array LinkedList Stack Queue"]
---

# 배열, 연결 리스트, Stack, Queue와 Deque

자료구조 선택은 이름보다 어떤 연산이 자주 필요한지로 결정한다. 같은 추상 자료형도 array, linked list, ring buffer처럼 여러 표현으로 구현할 수 있다.

## ADT와 구현을 분리해서 보기

추상 자료형(ADT)은 값과 허용 연산의 의미를 구체 구현과 독립적으로 명세한다. stack, queue, deque와 set은 ADT이고 array나 linked list는 이를 구현하는 후보가 될 수 있다. 따라서 queue에 이중 연결 리스트가 반드시 필요한 것은 아니다. `head`와 `tail`을 유지하는 단방향 연결 리스트도 tail enqueue와 head dequeue를 각각 O(1)에 구현할 수 있다.

## Array와 dynamic array

array는 index로 원소 위치를 계산해 random access가 O(1)이다. contiguous representation은 cache locality가 좋지만 중간 삽입/삭제는 뒤 원소를 shift해 O(n)이다.

배열 연산의 비용은 끝과 중간이 다르다. index로 읽고 쓰기, 끝에 추가, 끝에서 제거는 O(1)이고, 임의 위치 삽입과 삭제는 뒤 원소를 옮겨야 해 평균 n/2개를 움직이는 O(n)이다. 삭제한 칸을 비워 두면 원소가 연속하지 않게 되어 k번째 원소를 O(1)에 찾는 성질이 깨지므로 반드시 당긴다. 추가 공간 없이 구현하려면 옮기는 방향을 지킨다. 삽입은 끝에서부터 한 칸씩 오른쪽으로 밀어야 덮어쓰지 않고, 삭제는 지운 위치 다음부터 왼쪽으로 당긴다. 구현 오류는 대부분 loop 경계(`len - 1`부터인지 `len`부터인지, `idx`까지인지 `idx + 1`까지인지)에서 나오고, `i >= idx`처럼 한 칸 더 가면 `idx = 0`일 때 `a[-1]`을 읽는다.

### 값을 index로 쓰는 배열

값의 범위가 작으면 값 자체를 index로 삼는 배열이 hash table 역할을 한다.

- **빈도 세기**: 소문자 알파벳 개수는 `freq[c - 'a']++`로 문자열을 한 번만 훑어 O(n)에 센다. 알파벳마다 문자열 전체를 다시 훑으면 O(26n)이다.
- **등장 여부 확인**: 0에서 100 사이 정수 배열에서 합이 100인 두 수가 있는지는 모든 쌍을 보면 O(n²)이다. 앞에서부터 읽으며 `seen[100 - x]`가 켜져 있는지 확인한 뒤 `seen[x]`를 켜면 각 확인이 O(1)이라 전체 O(n)이다. 값의 범위가 크거나 희소하면 배열 대신 hash set을 쓴다.

고정 array는 크기를 미리 정하고, ArrayList나 vector 같은 dynamic array는 capacity가 부족할 때 더 큰 storage를 할당해 복사한다. append 한 번은 resize 때문에 O(n)일 수 있지만 여러 append에 나누어 계산한 amortized cost는 O(1)이다.

확장 폭이 amortized 비용을 가른다. 꽉 찰 때마다 상수 k칸씩 늘리면 k번 삽입마다 전체 복사가 일어나 삽입당 평균 O(n)이다. k를 크게 잡으면 상수는 줄지만 빈 공간 낭비가 커진다. 크기를 두 배(일정 배수)로 늘리면 n번 삽입하는 동안 복사되는 원소 수가 1 + 2 + 4 + ... < 2n이라 삽입당 amortized O(1)이고, 낭비도 현재 크기의 일정 비율 이하로 유지된다. 구현은 `len`과 할당 크기 `capacity`를 따로 두고, `len == capacity`일 때 두 배 크기의 새 배열에 복사한 뒤 교체한다. amortized O(1)은 모든 삽입이 빠르다는 뜻이 아니라, 확장이 걸린 한 번은 O(n)이지만 여러 번의 합을 나누면 상수라는 뜻이다. 표준 `vector`의 성장 배수(2 또는 1.5 등)는 구현마다 다르다.

JavaScript `Array`는 언어 수준의 dynamic collection이고 engine이 elements kind와 sparsity에 따라 표현을 바꿀 수 있다. 일반 array가 항상 한 형태의 contiguous memory라는 전제로 성능을 단정하지 않는다. [[V8-Array-Internals]]

## Linked list

node가 value와 다음 node reference를 가진다. doubly linked list는 previous reference도 저장한다.

- 알고 있는 node 다음/앞 삽입과 삭제: O(1)
- index나 value를 찾아가는 과정: O(n)
- random access: O(n)
- node별 allocation과 pointer 때문에 memory overhead와 cache locality가 불리할 수 있음

연결 리스트의 삽입이 항상 O(1)이라는 설명은 target node를 이미 알고 있다는 전제가 빠진 것이다. 위치를 먼저 찾아야 하면 전체 연산은 O(n)이다.

구현: [LinkedList.mjs](linked-list/LinkedList.mjs), [DoublyLinkedList.mjs](linked-list/DoublyLinkedList.mjs)

종류는 다음 node만 아는 singly, 이전 node도 아는 doubly, 끝이 처음과 이어진 circular가 있다. doubly는 이전 node를 O(1)에 알지만 node마다 pointer를 하나 더 쓴다. C++ `std::list`는 doubly linked list라 양 끝 삽입과 삭제가 O(1)이고, iterator가 node 주소 역할을 한다. `erase`는 지운 다음 원소의 iterator를 반환한다.

대표 쓰임은 cursor가 가리키는 위치에서 삽입과 삭제가 반복되는 문제다. 텍스트 편집기 명령(왼쪽, 오른쪽 이동, 삽입, 삭제)을 수십만 번 적용하면 배열은 매번 O(n) shift가 들지만 linked list는 cursor 이동과 삽입, 삭제가 모두 O(1)이다. 입력이 수천 이하라면 O(n²)도 통과하므로 익숙한 배열이 낫다. cursor가 `begin()`에서 왼쪽, `end()`에서 오른쪽으로 가는 경계와 지운 위치의 iterator를 다시 쓰는 실수가 흔한 runtime error 원인이다.

### 배열로 흉내 내는 linked list

코딩 테스트에서는 node를 동적 할당하지 않고 배열 세 개로 구현하기도 한다. `dat[i]`는 값, `pre[i]`와 `nxt[i]`는 이전과 다음 원소의 배열 index(없으면 -1)이고, `unused`는 다음에 쓸 빈 index다. 0번은 값이 없는 dummy head로 고정하면 빈 리스트와 맨 앞 삭제의 예외 처리가 사라진다.

- **삽입(addr 뒤에 x)**: `dat[unused] = x`, `pre[unused] = addr`, `nxt[unused] = nxt[addr]`로 새 원소를 채우고, `nxt[addr]`와 (다음 원소가 있으면) 그 원소의 `pre`를 `unused`로 바꾼 뒤 `unused++`.
- **삭제(addr)**: `nxt[pre[addr]] = nxt[addr]`, 다음 원소가 있으면 `pre[nxt[addr]] = pre[addr]`. dummy head 덕분에 `pre[addr]`는 항상 존재하고, 마지막 원소일 수 있는 `nxt[addr]`만 -1 검사가 필요하다.

지운 칸은 재사용하지 않아 프로그램이 끝날 때까지 메모리를 차지한다. 삽입 횟수 상한만큼 배열을 넉넉히 잡을 수 있는 문제 풀이용이며 제품 코드에는 쓰지 않는다.

### 자주 묻는 문제

- **원형 리스트의 길이**: 시작 node를 기억해 두고 다시 만날 때까지 이동한다. 시간 O(n), 공간 O(1).
- **두 리스트가 합쳐지는 지점**: 각 길이를 구해 긴 쪽을 차이만큼 먼저 이동한 뒤 둘을 한 칸씩 함께 옮기면 처음 만나는 node가 교차점이다. 방문 node를 저장하지 않아 공간 O(1).
- **cycle 존재 여부**: 한 칸씩 가는 pointer와 두 칸씩 가는 pointer를 같은 곳에서 출발시키면 cycle이 있을 때 반드시 만나고, 없으면 빠른 쪽이 끝에 닿는다(Floyd의 cycle 탐지). 공간 O(1).


## Stack

LIFO 추상 자료형으로 한쪽 끝에서 push/pop한다. call stack, parser, DFS, undo와 괄호 검증에 사용한다.

dynamic array의 끝을 top으로 쓰면 push/pop은 amortized O(1)이고, linked list의 head를 top으로 써도 O(1)이다. linked list의 tail을 매번 순회하는 구현은 stack 장점을 잃는다.

괄호 검증은 여는 괄호를 push하고 닫는 괄호가 나오면 top과 짝이 맞는지 확인한다. `top()` 전에 비어 있는지 검사하고 입력이 끝났을 때 stack도 비어 있어야 한다.

괄호가 한 종류면 앞에서부터 셀 때 닫는 괄호 수가 여는 괄호 수를 넘지 않고 끝에서 같으면 된다. 여러 종류가 섞이면 `({)}`처럼 개수 조건은 지키면서 틀린 경우가 생겨 개수만으로는 부족하다. 붙어 있는 짝을 반복해서 지우는 방법은 맞지만 배열로는 중간 삭제 때문에 O(n²)이다. 핵심 관찰은 닫는 괄호가 아직 남은 여는 괄호 중 가장 최근 것과 짝을 이룬다는 것이고, 가장 최근 것이 먼저 나오므로 stack으로 O(n)에 판정한다. 틀린 경우는 셋이다. 닫는 괄호가 나왔는데 stack이 비어 있거나, top이 종류가 다른 여는 괄호거나, 끝났는데 여는 괄호가 남아 있는 경우다.

- 조건을 `s.empty() || s.top() != match`로 쓰면 short-circuit evaluation 덕분에 비어 있을 때 `top()`을 호출하지 않는다.
- 여러 줄이나 여러 test case를 처리할 때 stack을 전역에 두었다면 매번 비운다.
- 응용 문제는 괄호의 의미를 바로 앞 문자로 구분하거나(`()`가 레이저인지 막대의 끝인지), 그 순간의 stack 크기를 답에 쓰거나, stack에 문자 대신 중간 계산값을 함께 넣는 식으로 변형된다.

다음 큰 원소처럼 아직 답이 정해지지 않은 index를 단조 stack에 보관하면 각 원소가 한 번 push/pop되어 O(n)에 처리할 수 있다.

구현: [Stack.mjs](stack/Stack.mjs)

stack, queue, deque는 원소를 넣고 빼는 위치를 제한한 자료구조(restricted structure)다. stack ADT가 제공하는 연산은 push, pop, top뿐이라 top이 아닌 원소를 확인하거나 바꾸는 기능은 없고, C++ `std::stack`에도 없다. 배열로 구현하면 기술적으로는 가능하지만 stack을 쓰는 문제는 이 세 연산만 필요로 한다.

배열 구현은 큰 배열 `dat`와 다음에 넣을 위치 `pos` 하나로 끝난다. push는 `dat[pos++] = x`, pop은 `pos--`, top은 `dat[pos - 1]`이고 `pos`가 곧 원소 수다. pop한 칸의 값은 다음 push가 덮어쓰므로 지우지 않는다. 직접 만든 구현은 틀렸을 때 의심할 곳이 하나 늘어나므로 표준 구현(`std::stack`의 `push`, `pop`, `top`, `empty`, `size`)을 쓸 수 있으면 그쪽을 쓴다. 빈 stack에서 `top()`이나 `pop()`을 부르는 것은 undefined behavior라 runtime error의 흔한 원인이므로 항상 `empty()`를 먼저 확인한다.


## Queue

FIFO 추상 자료형으로 rear에 enqueue하고 front에서 dequeue한다. scheduler, buffer, BFS와 producer-consumer 경계에 사용한다.

JavaScript array에서 `shift()`를 반복하면 원소 이동 비용이 들 수 있다. head index를 별도로 두는 array queue, circular buffer 또는 linked list의 head/tail pointer를 사용하면 enqueue/dequeue를 O(1)에 유지할 수 있다.

구현: [Queue.mjs](queue/Queue.mjs)

배열 구현은 큰 배열 `dat`와 두 index로 한다. `head`는 맨 앞 원소, `tail`은 맨 뒤 원소 다음 칸을 가리키며 둘 다 0에서 시작한다. push는 `dat[tail++] = x`, pop은 `head++`, front는 `dat[head]`, back은 `dat[tail - 1]`이고 크기는 `tail - head`다. pop할 때마다 `head`가 오른쪽으로 가므로 앞쪽에 쓸 수 없는 칸이 쌓여, 배열 앞이 비어 있어도 끝에 닿으면 더 넣지 못한다. index가 끝에 닿으면 0으로 돌아가게 하는 circular queue(원형 큐)가 이를 해결하며, 원소 수가 배열 크기를 넘지 않는 한 공간을 재사용한다. push 횟수 상한이 정해진 문제에서는 배열을 그 상한보다 크게 잡아 선형 구현으로 충분하다.

C++ `std::queue`는 `push`, `pop`, `front`, `back`, `empty`, `size`를 제공하고 index 접근은 없다. BFS와 flood fill에서 자주 쓰며, 빈 queue에서 `front`, `back`, `pop`을 부르면 stack과 같은 runtime error 원인이 된다.


## Deque

양 끝에서 삽입과 삭제를 지원한다. sliding window, monotonic queue, work stealing과 0-1 BFS, 머리 추가와 꼬리 삭제가 양 끝에서 일어나는 뱀 게임 같은 [[Simulation-Implementation#상태 인코딩|시뮬레이션]]에 쓰인다. circular buffer는 contiguous storage를 유지하면서 front/rear index를 wrap-around한다.

구현: [Deque.mjs](deque/Deque.mjs)

stack과 queue는 deque에서 한쪽 연산만 쓰는 특수한 경우로 볼 수 있다. 배열로 구현할 때는 양쪽으로 자라야 하므로 시작점을 배열 가운데에 둔다. 크기 `2 * MX + 1` 배열에서 `head = tail = MX`로 시작해 push_front는 `dat[--head] = x`, push_back은 `dat[tail++] = x`, pop_front는 `head++`, pop_back은 `tail--`이고 크기는 `tail - head`다. 0번지에서 시작하면 왼쪽으로 넓힐 칸이 없다. 연산 횟수 상한이 있으면 circular로 만들지 않아도 된다.

C++ `std::deque`는 ADT의 deque보다 넓은 인터페이스를 준다. 양 끝 삽입과 삭제가 O(1)이면서 `vector`처럼 index 접근(`dq[i]`)과 `insert`, `erase`(중간은 선형)도 된다. 대신 원소가 한 덩어리의 연속 메모리에 있지 않고 고정 크기 블록 여러 개에 나뉘어 저장되므로, 앞쪽 삽입과 삭제가 필요 없으면 연속 저장과 캐시 지역성이 좋은 `vector`를 쓴다.


## Set

중복 없는 원소 collection이라는 추상 자료형이다. hash set이면 평균 membership/insert/delete가 O(1), ordered tree set이면 O(log n)과 정렬 순회를 제공한다. set이 반드시 hash table로만 구현된다고 단정하지 않는다.

구현: [Set.mjs](set/Set.mjs), hash 기반 원리는 [[Hash-Table]].

## 비교

| 요구 | 우선 후보 |
|---|---|
| index random access | dynamic array |
| 알고 있는 node 주변 삽입/삭제 | linked list |
| 최근 항목부터 처리 | stack |
| 들어온 순서대로 처리 | queue |
| 양 끝 조작 | deque |
| uniqueness와 membership | set |

## 관련 문서

- [[Functional-Data-Structures|함수형 자료구조 (불변 연결 리스트와 구조 공유)]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
- [[Trees-and-Balanced-Search-Trees|Tree와 균형 BST]]
- [[Heap|Heap과 Priority Queue]]
- [[Hash-Table|Hash Table]]
- [[Algorithm-Complexity|시간복잡도와 amortized 분석]]

## 경계 불변식과 지연된 뒤집기

이중 연결 리스트에서 빈 상태는 head와 tail이 모두 null이고, 하나면 head === tail이다. head.prev와 tail.next는 null이어야 하며 인접 node의 next/prev가 서로 맞아야 한다. tail pointer만 있는 단방향 리스트는 이전 node를 찾는 끝 삭제가 O(n)이지만 doubly list는 tail.prev로 O(1)에 처리한다. 빈 상태와 하나 남은 상태에서 양쪽 끝을 함께 갱신한다. Deque의 네 끝 연산이 O(1)이라는 주장은 index를 찾는 일반 insert/delete가 아니라 이 pointer를 직접 사용하는 구현을 전제한다. ADT는 내부 node 대신 data를 반환해 표현을 숨긴다.

앞뒤 삭제와 뒤집기 명령이 반복되면 매번 배열 전체를 뒤집지 않는다. 방향 flag를 토글하고 정상 방향은 앞, 역방향은 뒤에서 삭제한다. 마지막 출력만 방향대로 순회하면 입력과 명령 수의 합에 비례한다. 빈 deque의 삭제는 오류이며 `[]`를 읽을 때 가짜 원소를 넣지 않는다.

Stack 응용은 [[Stack-Pairing-and-Monotonic-Patterns|짝짓기, 가장 긴 괄호와 단조 stack]]에서 다룬다.

## 출처

- 인프런, 큰돌 강사, [1-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100305), [2-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100338), [2-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100339), [2-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100344), [4-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100391)
- 인프런, 큰돌 강사, [4-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100394), [4-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100395), [5-B : stack을 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152254), [5-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100409)

- 인프런, 널널한 개발자 강사, [자료를 정리하는 이유](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128268), [선형 자료구조 Stack과 Queue](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128269)
- 인프런, 감자 강사, [배열](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115670), [연결리스트 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115717), [연결리스트 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115735)
- 인프런, 감자 강사, [스택 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115749), [스택 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115755), [큐 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115794), [큐 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115819)
- 인프런, 감자 강사, [덱 개념과 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115834), [Set 개념과 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=116156)
- [바킹독의 실전 알고리즘 0x03강, 배열 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=mBeyFsHqzHg)
- [바킹독의 실전 알고리즘 0x04강, 연결 리스트 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=C6MX5u7r72E)
- [바킹독의 실전 알고리즘 0x05강, 스택 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=0DsyCXIN7Wg)
- [바킹독의 실전 알고리즘 0x06강, 큐 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=D_fwSy5tRAY)
- [바킹독의 실전 알고리즘 0x07강, 덱 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=0mEzJ4S1d8o)
- [cppreference, std::deque](https://en.cppreference.com/w/cpp/container/deque)
- [바킹독의 실전 알고리즘 0x08강, 스택의 활용(수식의 괄호 쌍) — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=cdjjk-ryPKc)
- [바킹독의 실전 알고리즘 부록 B, 동적 배열 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=SOs_VoefLq8)
- [NIST DADS, abstract data type](https://xlinux.nist.gov/dads/HTML/abstractDataType.html)
- [Princeton Algorithms, Bags, Queues, and Stacks](https://algs4.cs.princeton.edu/13stacks/)
- [ECMAScript Language Specification, Array Exotic Objects](https://tc39.es/ecma262/#sec-array-exotic-objects)
