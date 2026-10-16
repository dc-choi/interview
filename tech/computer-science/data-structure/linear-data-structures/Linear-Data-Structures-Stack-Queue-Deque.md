---
tags: [cs, data-structure, stack, queue, deque]
status: done
category: "CS - 자료구조"
aliases: ["Linear Data Structures Stack Queue Deque", "Stack", "Queue", "Deque", "Circular Queue", "스택", "큐", "덱", "원형 큐"]
---

# Stack, Queue와 Deque

넣고 빼는 위치를 제한한 stack, queue와 deque의 용도, 배열 구현과 표준 library, deque의 경계 불변식을 다룬다. 연결 리스트 자체의 비용은 [[Linear-Data-Structures-Linked-List|연결 리스트]]에 있다.

## Stack

LIFO(FILO라고도 한다) 추상 자료형으로 한쪽 끝에서 push/pop하고, 꺼내지 않고 맨 위를 보는 peek(top)을 둔다. call stack, parser, DFS, undo와 괄호 검증에 사용한다. undo는 수행한 편집을 push하고, 되돌릴 때 가장 최근 편집을 pop해 취소한다.

call stack은 함수 호출마다 stack frame을 쌓고 반환하면 걷어 낸다. 종료 조건이 없거나 틀린 재귀, 끝나더라도 너무 깊은 재귀는 stack 영역을 다 써 Java에서는 `StackOverflowError`가 난다. 종료 조건을 고치거나 깊이를 줄이고, 필요하면 명시적 stack을 쓰는 반복으로 바꾼다([[Algorithm-Recursion|재귀]], [[Stack-vs-Heap|Stack과 Heap]]).

dynamic array의 끝을 top으로 쓰면 push/pop은 amortized O(1)이고, linked list의 head를 top으로 써도 O(1)이다. linked list의 tail을 매번 순회하는 구현은 stack 장점을 잃는다.

괄호 검증은 여는 괄호를 push하고 닫는 괄호가 나오면 top과 짝이 맞는지 확인한다. `top()` 전에 비어 있는지 검사하고 입력이 끝났을 때 stack도 비어 있어야 한다.

괄호가 한 종류면 앞에서부터 셀 때 닫는 괄호 수가 여는 괄호 수를 넘지 않고 끝에서 같으면 된다. 여러 종류가 섞이면 `({)}`처럼 개수 조건은 지키면서 틀린 경우가 생겨 개수만으로는 부족하다. 붙어 있는 짝을 반복해서 지우는 방법은 맞지만 배열로는 중간 삭제 때문에 O(n²)이다. 핵심 관찰은 닫는 괄호가 아직 남은 여는 괄호 중 가장 최근 것과 짝을 이룬다는 것이고, 가장 최근 것이 먼저 나오므로 stack으로 O(n)에 판정한다. 틀린 경우는 셋이다. 닫는 괄호가 나왔는데 stack이 비어 있거나, top이 종류가 다른 여는 괄호거나, 끝났는데 여는 괄호가 남아 있는 경우다.

- 조건을 `s.empty() || s.top() != match`로 쓰면 short-circuit evaluation 덕분에 비어 있을 때 `top()`을 호출하지 않는다.
- 여러 줄이나 여러 test case를 처리할 때 stack을 전역에 두었다면 매번 비운다.
- 응용 문제는 괄호의 의미를 바로 앞 문자로 구분하거나(`()`가 레이저인지 막대의 끝인지), 그 순간의 stack 크기를 답에 쓰거나, stack에 문자 대신 중간 계산값을 함께 넣는 식으로 변형된다.

다음 큰 원소처럼 아직 답이 정해지지 않은 index를 단조 stack에 보관하면 각 원소가 한 번 push/pop되어 O(n)에 처리할 수 있다.

구현: [Stack.mjs](../stack/Stack.mjs)

stack, queue, deque는 원소를 넣고 빼는 위치를 제한한 자료구조(restricted structure)다. stack ADT가 제공하는 연산은 push, pop, top뿐이라 top이 아닌 원소를 확인하거나 바꾸는 기능은 없고, C++ `std::stack`에도 없다. 배열로 구현하면 기술적으로는 가능하지만 stack을 쓰는 문제는 이 세 연산만 필요로 한다.

배열 구현은 큰 배열 `dat`와 다음에 넣을 위치 `pos` 하나로 끝난다. push는 `dat[pos++] = x`, pop은 `pos--`, top은 `dat[pos - 1]`이고 `pos`가 곧 원소 수다. pop한 칸의 값은 다음 push가 덮어쓰므로 지우지 않는다. 직접 만든 구현은 틀렸을 때 의심할 곳이 하나 늘어나므로 표준 구현(`std::stack`의 `push`, `pop`, `top`, `empty`, `size`)을 쓸 수 있으면 그쪽을 쓴다. 빈 stack에서 `top()`이나 `pop()`을 부르는 것은 undefined behavior라 runtime error의 흔한 원인이므로 항상 `empty()`를 먼저 확인한다.

Stack 응용은 [[Stack-Pairing-and-Monotonic-Patterns|짝짓기, 가장 긴 괄호와 단조 stack]]에서 다룬다.

## Queue

FIFO 추상 자료형으로 rear에 enqueue하고 front에서 dequeue하며, 꺼내지 않고 front를 보는 peek을 둔다. 도착 순서대로 처리하므로 번호표 순서대로 창구를 배정하거나 받은 메시지를 보낸 순서대로 읽게 하는 것처럼 순서 보장이 요구사항일 때 쓴다. scheduler, buffer, BFS와 producer-consumer 경계에 사용한다.

기술 문서의 queue가 항상 FIFO는 아니다. OS의 ready queue처럼 대기 공간이라는 뜻으로 쓰이고 실제로 꺼내는 순서는 우선순위 같은 scheduling 정책이 정할 수 있다([[Context-Switching|문맥 전환과 scheduling]], [[Heap|Priority Queue]]).

producer-consumer 사이 queue에 상한이 없으면 소비가 생산을 따라가지 못할 때 원소가 계속 쌓여 memory가 고갈된다(Java heap이면 `OutOfMemoryError`). 상한을 두고, 가득 찼을 때 예외, `false` 같은 실패 값, 자리가 날 때까지 대기(그동안 thread가 묶인다), 제한 시간 대기 뒤 포기 중 하나를 고른다. Java API별 대응과 `LinkedBlockingQueue`의 기본 상한은 [[Java-BlockingQueue-and-Producer-Consumer|BlockingQueue와 생산자, 소비자]]에 있다.

JavaScript array에서 `shift()`를 반복하면 원소 이동 비용이 들 수 있다. head index를 별도로 두는 array queue, circular buffer 또는 linked list의 head/tail pointer를 사용하면 enqueue/dequeue를 O(1)에 유지할 수 있다.

구현: [Queue.mjs](../queue/Queue.mjs)

배열 구현은 큰 배열 `dat`와 두 index로 한다. `head`는 맨 앞 원소, `tail`은 맨 뒤 원소 다음 칸을 가리키며 둘 다 0에서 시작한다. push는 `dat[tail++] = x`, pop은 `head++`, front는 `dat[head]`, back은 `dat[tail - 1]`이고 크기는 `tail - head`다. pop할 때마다 `head`가 오른쪽으로 가므로 앞쪽에 쓸 수 없는 칸이 쌓여, 배열 앞이 비어 있어도 끝에 닿으면 더 넣지 못한다. index가 끝에 닿으면 0으로 돌아가게 하는 circular queue(원형 큐)가 이를 해결하며, 원소 수가 배열 크기를 넘지 않는 한 공간을 재사용한다. push 횟수 상한이 정해진 문제에서는 배열을 그 상한보다 크게 잡아 선형 구현으로 충분하다.

C++ `std::queue`는 `push`, `pop`, `front`, `back`, `empty`, `size`를 제공하고 index 접근은 없다. BFS와 flood fill에서 자주 쓰며, 빈 queue에서 `front`, `back`, `pop`을 부르면 stack과 같은 runtime error 원인이 된다.

## Deque

양 끝에서 삽입과 삭제를 지원한다. sliding window, monotonic queue, work stealing과 0-1 BFS, 머리 추가와 꼬리 삭제가 양 끝에서 일어나는 뱀 게임 같은 [[Simulation-Implementation#상태 인코딩|시뮬레이션]]에 쓰인다. circular buffer는 contiguous storage를 유지하면서 front/rear index를 wrap-around한다.

구현: [Deque.mjs](../deque/Deque.mjs)

stack과 queue는 deque에서 한쪽 연산만 쓰는 특수한 경우로 볼 수 있다. 배열로 구현할 때는 양쪽으로 자라야 하므로 시작점을 배열 가운데에 둔다. 크기 `2 * MX + 1` 배열에서 `head = tail = MX`로 시작해 push_front는 `dat[--head] = x`, push_back은 `dat[tail++] = x`, pop_front는 `head++`, pop_back은 `tail--`이고 크기는 `tail - head`다. 0번지에서 시작하면 왼쪽으로 넓힐 칸이 없다. 연산 횟수 상한이 있으면 circular로 만들지 않아도 된다.

C++ `std::deque`는 ADT의 deque보다 넓은 인터페이스를 준다. 양 끝 삽입과 삭제가 O(1)이면서 `vector`처럼 index 접근(`dq[i]`)과 `insert`, `erase`(중간은 선형)도 된다. 대신 원소가 한 덩어리의 연속 메모리에 있지 않고 고정 크기 블록 여러 개에 나뉘어 저장되므로, 앞쪽 삽입과 삭제가 필요 없으면 연속 저장과 캐시 지역성이 좋은 `vector`를 쓴다.

deque는 양 끝이 모두 필요할 때만 쓰는 특수 구조라기보다 표준 library에서 stack과 queue를 맡는 기본 구현인 경우가 많다. Python 공식 tutorial은 list의 앞쪽 삽입과 삭제가 나머지 원소를 모두 옮겨 느리다며 queue에는 `collections.deque`를 쓰라고 하고, Java API는 legacy `Stack`보다 `Deque` 구현을 권한다([[Java-Exception-Record-Collection-Stack-ArrayDeque|Stack 대신 ArrayDeque]]). 같은 deque라도 부가 연산의 비용은 구현이 정한다. Python 3.15 문서 기준으로 `deque`는 양 끝 append와 pop이 O(1)이지만 index 접근은 양 끝에서만 O(1)이고 가운데에서는 O(n)이라, random access가 O(1)인 C++ `std::deque`와 다르다. `maxlen`을 주면 가득 찬 뒤 넣은 만큼 반대쪽 끝에서 버려 최근 N개만 남기는 기록에 쓴다.

## 경계 불변식과 지연된 뒤집기

이중 연결 리스트에서 빈 상태는 head와 tail이 모두 null이고, 하나면 head === tail이다. head.prev와 tail.next는 null이어야 하며 인접 node의 next/prev가 서로 맞아야 한다. tail pointer만 있는 단방향 리스트는 이전 node를 찾는 끝 삭제가 O(n)이지만 doubly list는 tail.prev로 O(1)에 처리한다. 빈 상태와 하나 남은 상태에서 양쪽 끝을 함께 갱신한다. Deque의 네 끝 연산이 O(1)이라는 주장은 index를 찾는 일반 insert/delete가 아니라 이 pointer를 직접 사용하는 구현을 전제한다. ADT는 내부 node 대신 data를 반환해 표현을 숨긴다.

앞뒤 삭제와 뒤집기 명령이 반복되면 매번 배열 전체를 뒤집지 않는다. 방향 flag를 토글하고 정상 방향은 앞, 역방향은 뒤에서 삭제한다. 마지막 출력만 방향대로 순회하면 입력과 명령 수의 합에 비례한다. 빈 deque의 삭제는 오류이며 `[]`를 읽을 때 가짜 원소를 넣지 않는다.

## 출처

- 인프런, 큰돌 강사, [1-M](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100305), [2-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100338), [2-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100339), [2-T](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100344), [4-L](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100391)
- 인프런, 큰돌 강사, [4-O](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100394), [4-P](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100395), [5-B : stack을 이용한 풀이](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=152254), [5-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100409)
- 인프런, 널널한 개발자 강사, [선형 자료구조 Stack과 Queue](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128269)
- 인프런, 감자 강사, [스택 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115749), [스택 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115755), [큐 개념](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115794), [큐 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115819)
- 인프런, 감자 강사, [덱 개념과 구현](https://www.inflearn.com/courses/lecture?courseId=328971&unitId=115834)
- [바킹독의 실전 알고리즘 0x05강, 스택 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=0DsyCXIN7Wg)
- [바킹독의 실전 알고리즘 0x06강, 큐 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=D_fwSy5tRAY)
- [바킹독의 실전 알고리즘 0x07강, 덱 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=0mEzJ4S1d8o)
- [cppreference, std::deque](https://en.cppreference.com/w/cpp/container/deque)
- [바킹독의 실전 알고리즘 0x08강, 스택의 활용(수식의 괄호 쌍) — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=cdjjk-ryPKc)
- [Princeton Algorithms, Bags, Queues, and Stacks](https://algs4.cs.princeton.edu/13stacks/)
- [ECMAScript Language Specification, Array Exotic Objects](https://tc39.es/ecma262/#sec-array-exotic-objects)
- [스택(stack) 설명 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=ELEoJHiqlF4)
- [큐(queue) 설명 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=ZZw6remsJNo)
- [BJ.11 스택과 큐 설명 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=-2YpvLCT5F8)
- [Python 3.15 Tutorial, Using Lists as Queues](https://docs.python.org/3.15/tutorial/datastructures.html#using-lists-as-queues)
- [Python 3.15 Library, collections.deque](https://docs.python.org/3.15/library/collections.html#collections.deque)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조 목차]]
- [[Stack-Pairing-and-Monotonic-Patterns|짝짓기, 가장 긴 괄호와 단조 stack]]
- [[Linear-Data-Structures-Linked-List|연결 리스트]]
- [[Heap|Heap과 Priority Queue]]
- [[Java-Exception-Record-Collection-Stack-ArrayDeque|Stack 대신 ArrayDeque]]
- [[Java-BlockingQueue-and-Producer-Consumer|BlockingQueue와 생산자, 소비자]]
- [[Simulation-Implementation|시뮬레이션 구현]]
