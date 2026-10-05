---
tags: [cs, data-structure, tree, bst, avl, red-black-tree]
status: done
verified_at: 2026-10-05
category: "CS - 자료구조"
aliases: ["Self-Balancing BST", "AVL Tree", "Red Black Tree", "AVL 트리", "레드블랙 트리", "균형 BST 복구"]
---

# AVL과 Red-Black 트리의 균형 복구

일반 BST는 정렬된 순서로 key를 넣으면 한쪽으로 기울어 높이가 n − 1까지 커지고 조회, 삽입, 삭제의 최악이 Θ(n)이 된다. self-balancing BST는 삽입과 삭제마다 불변식을 복구해 높이를 O(log n)으로 묶는다. 구현마다 불변식, 복구 도구와 복구가 위로 번지는 범위가 다르다. 트리 용어와 BST 기본 연산은 [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]에 있다.

## Rotation

회전은 in-order 순서를 바꾸지 않고 모양만 바꾼다. x의 오른쪽 child가 y일 때 left rotation(x)은 y를 x 자리로 올리고, y의 왼쪽 subtree를 x의 오른쪽 child로 옮긴 뒤 x를 y의 왼쪽 child로 둔다. 옮겨지는 안쪽 subtree의 key는 x와 y 사이 값이라 새 자리에서도 BST 조건을 만족한다. 바뀌는 pointer가 상수 개라 O(1)이다. AVL처럼 node에 높이를 저장하면 내려간 node의 높이부터 다시 계산하고, 반환한 새 subtree root를 부모의 child나 전체 root에 다시 연결해야 subtree가 유실되지 않는다.

## AVL tree

각 node의 balance factor(BF)를 왼쪽 subtree 높이 − 오른쪽 subtree 높이로 두고 모든 node에서 BF ∈ {−1, 0, 1}을 유지한다. 빈 subtree를 −1, leaf를 0으로 세든(edge 기준) 빈 subtree를 0, leaf를 1로 세든(node 기준) BF는 같다. node에 높이를 저장하면 `h(n) = 1 + max(h(left), h(right))`로 O(1)에 갱신한다. 높이 h인 AVL tree의 최소 node 수가 Fibonacci 수처럼 늘어나므로 높이는 대략 1.44 log₂ n을 넘지 않는다.

삽입이나 삭제 뒤 바뀐 위치에서 root 방향으로 올라가며 높이와 BF를 갱신하고, |BF| = 2인 node를 만나면 무거운 쪽 경로의 세 node를 재배치한다. 세 key 중 가운데 값을 그 subtree의 root로 올린다고 기억하면 네 case가 한 규칙으로 정리된다.

| case | 무거운 경로 | 복구 |
|---|---|---|
| LL | 왼쪽 child의 왼쪽 | right rotation 1회, 가운데 node가 한 level 올라감 |
| RR | 오른쪽 child의 오른쪽 | left rotation 1회 |
| LR | 왼쪽 child의 오른쪽(꺾인 경로) | child에서 left rotation 후 node에서 right rotation, 맨 아래 node가 두 level 올라감 |
| RL | 오른쪽 child의 왼쪽 | child에서 right rotation 후 node에서 left rotation |

- 삽입은 가장 낮은 불균형 조상 하나를 단일 또는 이중 회전으로 고치면 그 subtree 높이가 삽입 전으로 돌아가 위쪽은 다시 볼 필요가 없다.
- 삭제는 회전 뒤 subtree 높이가 1 줄 수 있어 부모가 새로 불균형해질 수 있다. root까지 조상마다 복구가 필요할 수 있어 회전이 O(log n)번까지 일어난다.
- 삭제의 case는 지운 key가 아니라 무거운 child의 BF로 고른다. left-heavy에서 child BF가 0 이상이면 right rotation, 음수면 LR이다. right-heavy에서는 child BF가 0 이하이면 left rotation, 양수면 RL이다. child BF가 0인 경우도 단일 회전이다. LL을 삽입 경로 이름으로 쓰는지 회전 방향 이름으로 쓰는지 자료마다 다르므로 먼저 확인한다.

## Red-Black tree

각 node에 red 또는 black 색을 두고 다섯 불변식을 지킨다.

1. node는 red 또는 black이다.
2. root는 black이다.
3. 모든 NIL leaf는 black이다.
4. red node의 child는 black이다. 즉 red가 연속할 수 없다.
5. 한 node에서 descendant NIL까지 가는 모든 경로의 black node 수가 같다.

NIL은 값이 없는 child 자리를 나타내는 black leaf다. 구현은 NIL마다 객체를 만들지 않고 공유 sentinel 하나를 두거나 null을 black으로 취급한다. 5번 덕분에 node x에서 NIL까지 지나는 black 수(x 자신 제외)가 경로와 무관하게 하나로 정해지며 이를 black-height `bh(x)`라 한다. 5번이 깨지면 black-height라는 값 자체가 정의되지 않는다.

높이 상한은 두 사실에서 나온다. x를 root로 하는 subtree에는 내부 node가 적어도 2^bh(x) − 1개 있고, 4번 때문에 root에서 NIL까지 경로의 절반 이상이 black이라 bh(root) ≥ h/2다. 따라서 n ≥ 2^(h/2) − 1, 즉 h ≤ 2 log₂(n + 1)이다. 가장 긴 경로가 가장 짧은 경로의 두 배를 넘지 않는다는 뜻이기도 하다.

recoloring의 기본 도구는 색 교환이다. 5번을 만족하는 트리에서 black 부모의 두 child가 모두 red면 부모를 red, 두 child를 black으로 바꿔도(반대 방향도 같다) 그 부모를 지나는 모든 경로가 부모와 child 쌍에서 black을 정확히 하나 만나므로 5번이 유지된다.

### 삽입

새 node는 red로 넣는다. red는 경로의 black 수를 바꾸지 않아 5번이 유지되고, 깨질 수 있는 것은 root가 red가 되는 2번과 부모도 red인 4번뿐이다. 2번은 root를 black으로 바꾸면 끝난다. 4번은 부모의 형제(uncle) 색과 새 node의 위치로 나눈다. 번호는 CLRS 기준이며 자료마다 다르다.

- case 1, uncle red: 부모와 uncle을 black, grandparent를 red로 바꾸는 색 교환이다. grandparent가 새로 red가 됐으므로 그 위치에서 다시 검사한다. 회전 없이 위로 번질 수 있다.
- case 2, uncle black이고 새 node가 꺾인 위치(부모의 안쪽 child): 부모에서 회전해 경로를 편 뒤 case 3으로 처리한다.
- case 3, uncle black이고 새 node가 바깥쪽(직선 경로): 부모와 grandparent의 색을 바꾸고 grandparent에서 회전한다. 한쪽에 몰린 red 하나가 반대편으로 넘어가며 끝난다.
- 마지막에 root를 black으로 둔다. 회전은 삽입당 최대 두 번이다.

### 삭제

BST 방식으로 지운 뒤 실제로 사라진 색을 본다. 값이 있는 child가 0개나 1개인 node를 지우면 그 node의 색이 사라진다. child가 둘이면 자리를 대신하는 successor가 원래 node의 색을 물려받으므로 successor의 원래 색이 사라진다.

- 사라진 색이 red면 어떤 불변식도 깨지지 않는다.
- black이면 사라진 자리를 대신한 node x(NIL일 수 있다)를 지나는 경로에서 black이 하나 모자란다. x에 extra black을 하나 얹어 개수를 맞춘 뒤 그 extra black을 없애는 것이 복구의 전부다. x가 red면 red-and-black이라 black으로 바꾸고 끝낸다. x가 black이면 doubly black이고 형제 w와 w의 child 색으로 네 case를 나눈다. 아래는 x가 왼쪽 child일 때이며 좌우를 바꾸면 대칭이다.
  - case 1, w red: 부모와 w의 색을 바꾸고 부모에서 left rotation한다. x의 새 형제가 black이 되어 case 2, 3, 4로 넘어간다.
  - case 2, w black이고 w의 두 child가 black: x의 extra black과 w의 black을 하나씩 모아 부모로 올린다(w는 red가 된다). 부모가 red였으면 red-and-black이라 black으로 끝나고, black이었으면 부모가 doubly black이 되어 그 위치에서 반복한다. root에 닿으면 extra black을 버린다.
  - case 3, w black이고 w의 안쪽 child(x에 가까운 쪽)가 red, 바깥쪽 child가 black: w와 안쪽 child의 색을 바꾸고 w에서 right rotation해 case 4 모양을 만든다.
  - case 4, w black이고 w의 바깥쪽 child가 red: w에 부모 색을 주고 부모와 바깥쪽 child를 black으로 바꾼 뒤 부모에서 left rotation한다. extra black이 사라지며 끝난다.
- 위로 번지는 것은 회전이 없는 case 2뿐이라 회전은 삭제당 최대 세 번이다.
- 구현에서는 NIL을 black으로 취급하고 회전마다 parent link, 옮겨지는 subtree와 root를 모두 갱신한다.

## AVL과 Red-Black 비교

| 항목 | AVL | Red-Black |
|---|---|---|
| 균형 기준 | 모든 node의 높이 차 1 이하 | 색 불변식, 가장 긴 경로가 가장 짧은 경로의 2배 이하 |
| 높이 상한 | 대략 1.44 log₂ n | 2 log₂(n + 1) |
| 삽입 회전 | 단일 또는 이중 회전 한 번 | 최대 2회 |
| 삭제 회전 | root까지 O(log n)회 가능 | 최대 3회 |
| node당 추가 정보 | 높이 또는 BF | 색 1비트 |

조회, 삽입과 삭제는 둘 다 최악 O(log n)이다. AVL은 더 엄격해 높이가 낮으므로 조회가 조금 유리하고, Red-Black은 갱신당 회전 수의 상한이 상수라 구조 변경이 적다. Linux kernel 문서도 rbtree가 AVL보다 삽입과 삭제의 최악 시간 상한이 빠르고 조회는 조금 느리지만 여전히 O(log n)이라고 설명한다. 다만 recoloring은 위로 O(log n)까지 번질 수 있으므로 갱신이 항상 AVL보다 빠르다고 단정하지 말고 조회와 갱신 비율, memory와 표준 library 구현을 기준으로 고른다. 둘 중에서 고른다면 한 번 만든 뒤 조회만 반복하는 사전형 데이터는 AVL이, 삽입과 삭제가 섞이는 범용 ordered map은 Red-Black이 먼저 검토할 후보다. 갱신이 전혀 없다면 정렬 배열과 이진 탐색도 함께 비교한다.

- Java `TreeMap`은 Red-Black tree 기반 `NavigableMap`이며 `containsKey`, `get`, `put`, `remove`에 log(n) 시간을 보장하고, `TreeSet`은 `TreeMap` 기반이다(Java SE 25 API 문서 기준, [[Java-Generics-and-Collections-Set#TreeSet이 로그 시간인 이유|TreeSet이 로그 시간인 이유]]).
- Linux kernel은 범용 rbtree 구현을 `lib/rbtree.c`에 두고 `<linux/rbtree.h>`로 쓴다.
- C++ `std::set`, `std::map`은 보통 Red-Black tree로 구현되지만 표준은 복잡도만 정하고 구현을 강제하지 않는다([[Trees-and-Balanced-Search-Trees#C++ set, multiset, map|C++ set, multiset, map]]).
- 디스크나 page 단위 저장소에서는 이진 트리 대신 node 하나에 key를 여러 개 담는 [[B-Tree|B-Tree]] 계열을 쓴다.

## 면접 체크포인트

- 회전이 in-order 순서를 보존하는 이유와 회전 뒤 다시 연결해야 하는 link
- AVL의 네 case를 세 node 중 가운데 값을 올리는 규칙으로 설명하고, 삽입은 한 번의 복구로 끝나지만 삭제는 root까지 번질 수 있는 이유
- Red-Black의 다섯 불변식, black-height의 정의와 높이 2 log₂(n + 1)의 근거
- 새 node를 red로 넣는 이유와 삽입의 세 case
- 삭제에서 사라지는 색을 정하는 규칙, extra black, red-and-black과 doubly black의 네 case
- AVL과 Red-Black의 높이, 회전 수, 조회와 갱신 비용 차이, Java `TreeMap`과 Linux rbtree 사례

## 출처

- 인프런 보충 강의: [AVL 트리 - 구현1(보조 함수)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135755), [AVL 트리 - 구현2(삽입)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135756), [AVL 트리 - 구현3(제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=137412), [Red-Black 트리 - 개념(제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135758), [Red-Black 트리 - 구현1(보조 함수)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=137817), [Red-Black 트리 - 구현2(삽입)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135759), [Red-Black 트리 - 구현3(제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135760)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — AVL 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135754)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Red-Black 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135757)
- [AVL 트리의 동작 방식과 장단점 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=syGPNOhsnI4)
- [레드블랙트리의 개념과 삽입 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=2MdsebfJOyM)
- [레드블랙트리의 삭제와 AVL 트리 비교 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=6drLl777k-E)
- [Lecture 7: Binary Trees II: AVL — MIT OpenCourseWare 6.006](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/a2c80596cf4a2b5fbc854afdd2f23dcb_MIT6_006S20_lec7.pdf)
- [CMSC 420 Lecture 5: AVL Trees — University of Maryland, Dave Mount](https://www.cs.umd.edu/class/fall2020/cmsc420-0201/Lects/lect05-avl.pdf)
- [CS 3110 Lecture 7: Red-Black Trees — Cornell University](https://www.cs.cornell.edu/courses/cs3110/2010su/Lectures/lec7.pdf)
- [The Linux Kernel documentation, Red-black Trees (rbtree) in Linux](https://docs.kernel.org/core-api/rbtree.html)
- [Java SE 25 API, TreeMap](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/TreeMap.html)
- [Java SE 25 API, TreeSet](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/TreeSet.html)
- [cppreference, std::set](https://en.cppreference.com/w/cpp/container/set)

## 관련 문서

- [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]
- [[B-Tree|B-Tree]]
- [[Java-Generics-and-Collections-Set|Java Set과 TreeSet]]
- [[Heap|Heap과 우선순위 큐]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
