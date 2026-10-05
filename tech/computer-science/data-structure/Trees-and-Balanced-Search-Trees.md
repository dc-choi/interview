---
tags: [cs, data-structure, tree, bst, avl, red-black-tree]
status: done
category: "CS - 자료구조"
aliases: ["Trees and Balanced Search Trees", "이진 탐색 트리", "Binary Search Tree", "트리 용어"]
---

# 트리와 균형 탐색 트리

트리는 root에서 시작하는 계층 구조다. 그래프 관점의 tree는 연결되고 cycle이 없는 undirected graph이며, `V`개 정점이 있으면 간선은 `V-1`개다. 자료구조 관점에서는 child의 순서와 빈 subtree도 의미를 가질 수 있다.

## 트리 용어

구현에서 node는 값과 다른 node를 가리키는 참조를 함께 묶은 단위이고, edge(link, branch)는 그 참조다.

| 용어 | 뜻 |
|---|---|
| root | 부모가 없는 시작 node. tree에 하나뿐이다 |
| parent, child, sibling | child를 가진 node, 그 child, 부모가 같은 node |
| ancestor, descendant | 부모를 따라 root까지 올라가며 만나는 node, child를 따라 내려가며 만나는 node |
| internal node | child가 하나 이상인 node. branch node, inner node라고도 한다 |
| leaf | child가 없는 node. external node, terminal node라고도 한다 |
| degree | node의 child 수. tree의 degree는 node degree의 최댓값이다 |
| depth, level | root에서 node까지 경로의 edge 수. root는 0이며 level을 1부터 세는 자료도 있다 |
| height | node에서 가장 먼 descendant leaf까지의 edge 수. leaf는 0이고, tree height는 root의 height이자 가장 깊은 node의 depth다 |
| width | 한 level에 있는 node 수 |
| size | node 자신과 descendant를 합한 수. tree size는 전체 node 수다 |
| distance | 두 node 사이 경로의 edge 수. tree에서는 경로가 하나뿐이다 |
| subtree | 한 node와 그 descendant 전체. 각 child가 다시 subtree의 root다 |

높이와 경로 길이를 edge 수가 아니라 node 수로 세는 자료도 있다. 그러면 값이 1씩 커지므로 문서와 문제의 convention을 먼저 확인한다. edge 수로 셀 때 빈 subtree의 높이는 −1로 둔다.

root가 하나이고, cycle이 없고, root가 아닌 모든 node의 부모가 정확히 하나여야 tree다. 하나라도 어기면 일반 graph다. 각 child가 다시 같은 모양의 subtree를 이루는 재귀 구조라 순회와 계산을 재귀로 쓰기 자연스럽고, 데이터를 한 줄로 늘어놓지 않는 비선형 계층 구조다.

## 이진 트리 용어

- **Binary tree**: 각 node가 left/right child를 최대 하나씩 가진다.
- **Full 또는 proper**: 모든 node가 child를 0개 또는 2개 가진다.
- **Perfect**: 모든 internal node가 child 2개를 가지며 leaf depth가 같다.
- **Complete**: 마지막 level을 제외하면 가득 차고, 마지막 level은 왼쪽부터 채운다. [[Heap]]의 배열 표현이 가능한 이유다.
- **Degenerate 또는 pathological**: 모든 internal node가 child를 하나만 가진다. 모두 왼쪽 child면 left-skewed, 모두 오른쪽 child면 right-skewed다. 높이가 n − 1이라 linked list와 같고, 정렬된 key를 일반 BST에 차례로 넣으면 이 모양이 된다.
- **Balanced(height-balanced)**: 모든 node에서 왼쪽과 오른쪽 subtree의 높이 차가 1 이하다. leaf 아래 빈 subtree까지 −1로 세어 모든 node를 확인해야 하며 AVL tree의 조건과 같다. 동적 연산 중에도 높이가 O(log n)으로 유지된다는 넓은 뜻으로 balanced를 쓰는 자료도 있고, Red-Black tree는 이 넓은 뜻에서 balanced다.

## 그래프로 본 트리

트리는 사이클이 없는 연결 무방향 그래프이며, 정점이 V개면 간선은 정확히 V - 1개다. 임의의 두 정점 사이 경로가 유일하므로 한 정점을 루트로 정하면 부모와 자식, 깊이가 정해진다. 입력이 간선 목록으로 주어지면 인접 리스트로 저장하고 루트에서 BFS나 DFS를 돌며 `parent[child] = cur`, `depth[child] = depth[cur] + 1`을 채운다. 사이클이 없으므로 별도 방문 배열 대신 이웃이 부모인지만 확인하면 된다(`if (nxt == parent[cur]) continue;`). 이웃 중 부모 하나를 빼면 모두 아직 방문하지 않은 자식이기 때문이다. 루트는 아무 정점이나 될 수 있고, 루트를 바꾸면 각 정점의 부모도 바뀐다. 간선이 V - 1개이므로 탐색은 O(V)이며, 부모와 깊이가 필요 없는 단순 순회는 재귀 DFS에 부모 번호를 인자로 넘기는 것으로 충분하다.

간선 목록으로 주어진 무방향 그래프가 트리인지는 한 정점에서 DFS나 BFS를 한 번 돌려 모든 정점에 닿는지(연결)와 간선이 정확히 V - 1개인지로 판정한다. 연결 그래프는 간선 V - 1개짜리 spanning tree를 품으므로, 간선이 V - 1개뿐이면 그래프가 그 spanning tree 자체라 사이클 탐지를 따로 하지 않아도 된다. test case가 여러 개면 인접 리스트와 방문 배열을 매번 비운다.

leaf 수는 자식이 없으면 1을, 있으면 자식들이 돌려준 값의 합을 돌려주는 DFS로 센다. 입력이 부모 배열이면 자식 목록을 먼저 만든다. 정점 하나를 지운 뒤 세라는 문제는 지운 정점으로 내려가지 않는 것으로 처리하되, 지운 자식은 자식 수에서도 빼야 유일한 자식을 잃은 부모가 leaf로 바뀐다. 루트를 지우면 탐색 시작점이 사라지므로 답 0으로 따로 처리한다.

이진 트리는 `lc[v]`, `rc[v]` 배열로 왼쪽과 오른쪽 자식을 저장하면(없으면 0) 순회 코드가 짧아진다. 레벨 순회는 루트에서 시작해 자식을 queue에 넣는 BFS이고, 전위, 중위, 후위는 현재 정점을 방문하는 시점만 다른 같은 재귀다.

## 순회

| 순회 | 순서 | 대표 용도 |
|---|---|---|
| preorder | root, left, right | tree 복제, prefix 표현 |
| inorder | left, root, right | BST를 key 순서로 열거 |
| postorder | left, right, root | subtree 삭제, bottom-up 계산 |
| level-order | level별 왼쪽부터 | BFS, 가장 가까운 level 탐색 |

재귀 순회는 call stack을 사용한다. tree가 매우 깊거나 외부 입력으로 편향될 수 있으면 explicit stack/queue와 depth limit을 검토한다.

BST를 왼쪽 subtree는 왼쪽에, 오른쪽 subtree는 오른쪽에 그리면 node를 아래 수평선으로 내려 찍은 순서가 inorder 방문 순서이자 key 순서다.

## Binary Search Tree

BST의 각 node는 왼쪽 subtree의 key가 더 작고 오른쪽 subtree의 key가 더 크다는 invariant를 재귀적으로 유지한다. duplicate를 금지하는 것은 보편 규칙이 아니라 구현 정책이다. count를 저장하거나 한쪽 subtree에 모으는 정책도 가능하지만 모든 연산이 같은 정책을 따라야 한다.

이 invariant에서 순서 연산이 나온다. 최솟값은 root에서 왼쪽 child만 따라간 끝이고 최댓값은 오른쪽 끝이다. 어떤 key의 successor(그보다 큰 key 중 가장 작은 key)는 오른쪽 subtree가 있으면 그 최솟값이고, 없으면 자신이 왼쪽 subtree에 들어 있는 가장 가까운 ancestor다. 그런 ancestor도 없으면 최댓값이라 successor가 없다. predecessor는 좌우를 바꾼 대칭이다. 삽입은 root부터 비교하며 내려가 비어 있는 child 자리에 새 leaf로 붙인다.

검색, 삽입과 삭제는 root-to-leaf 경로 하나를 따라가므로 `O(h)`다. 균형이 잡히면 `h = O(log n)`이지만 정렬된 입력을 그대로 넣은 일반 BST는 linked list처럼 기울어 `O(n)`이 된다. root에서 바로 끝나는 최선은 Θ(1)이고, 무작위 순서로 넣은 key n개의 BST에서 검색은 평균 약 2 ln n(≈ 1.39 log₂ n)번 비교한다. 참조만 바꾸는 삽입과 삭제, inorder 정렬 순회와 range query가 장점이지만 최악 높이가 입력 순서에 달려 있어, 갱신마다 높이를 되돌리는 self-balancing BST를 쓴다.

### 삭제 세 경우

1. leaf: parent link를 비운다.
2. child 하나: node를 그 child로 대체한다.
3. child 둘: inorder successor인 오른쪽 subtree의 최솟값이나 predecessor인 왼쪽 subtree의 최댓값으로 대체한 뒤 그 node를 삭제한다.

parent link, root 교체와 duplicate 정책을 빠뜨리기 쉬워 삭제는 반환된 subtree root를 부모가 다시 연결하는 재귀 형태가 안전하다. 3에서 쓰는 successor는 왼쪽 child가 없으므로 1이나 2 경우로 떼어 낸다. successor에게 오른쪽 child가 있으면 successor의 부모가 그 child를 이어받는다.

## 균형 BST: AVL과 Red-Black

일반 BST의 최악을 막으려면 갱신마다 높이를 O(log n)으로 되돌리는 불변식이 필요하다. AVL은 모든 node의 높이 차(balance factor)를 1 이하로 유지하고, 깨지면 무거운 경로의 세 node 중 가운데 값을 올리는 rotation으로 복구한다. Red-Black은 node 색에 대한 다섯 불변식으로 가장 긴 경로를 가장 짧은 경로의 2배 이하로 묶고 recoloring과 rotation으로 복구한다. 둘 다 조회, 삽입, 삭제가 최악 O(log n)이다. AVL은 높이가 더 낮아 조회가 조금 유리하고, Red-Black은 갱신당 회전 수가 상수로 제한된다. AVL보다 항상 update가 빠르다고 단정하지 말고 lookup/update 비율, memory와 표준 library 구현을 기준으로 선택한다. 회전의 원리, AVL의 네 case, Red-Black 불변식과 삽입, 삭제의 case별 복구는 [[Trees-and-Balanced-Search-Trees-Rebalancing|AVL과 Red-Black 트리의 균형 복구]]에 있다.

## C++ set, multiset, map

C++ 표준의 `set`, `multiset`, `map`은 균형 이진 검색 트리(구현은 보통 Red-Black tree)라 원소가 key 순서로 정렬돼 있고, hash 기반 `unordered_*`와 달리 순서를 이용하는 질의가 된다.

- `insert`, `find`, `lower_bound`, `upper_bound`는 O(log n)이고 `erase(key)`는 조회와 삭제 개수에 좌우된다. iterator로 하나를 지우는 `erase(pos)`는 amortized O(1)이다. `begin()`은 최솟값, `prev(end())`는 최댓값이다. `end()`는 마지막 원소 다음을 가리키므로 역참조하면 안 되고, 이것이 runtime error의 흔한 원인이다.
- x보다 큰 가장 작은 원소, x 이하의 가장 큰 원소처럼 순서가 필요한 질의는 hash로는 효율적으로 풀 수 없다. 이런 문제는 `lower_bound`, `upper_bound`, `prev`를 쓰는 set 계열로 푼다.
- `multiset`에서 `find(x)`는 같은 값 중 아무 위치나 줄 수 있으므로 가장 앞의 x가 필요하면 `lower_bound(x)`를 쓴다. `erase(x)`는 x를 모두 지우므로 하나만 지우려면 `erase(ms.find(x))`나 `erase(ms.begin())`, 최댓값 하나는 `erase(prev(ms.end()))`처럼 iterator로 지운다. 비어 있을 때 지우거나 역참조하지 않는다.
- 평균 속도는 보통 `unordered_*`가 빠르지만 충돌에 따라 느려질 수 있고, 트리는 상수가 큰 대신 항상 O(log n)이다. 순서 질의가 필요 없고 시간이 빠듯하면 `unordered_*`로 바꿔 보고, 그래도 느리면 정렬과 이분탐색이나 배열 index 같은 다른 풀이를 찾는다.

대표 적용은 가장 비싼 보석부터 담을 수 있는 가장 작은 가방에 넣는 greedy다. 가방 용량을 `multiset`에 넣고 보석 무게로 `lower_bound`를 불러 가장 작은 적합 가방을 찾은 뒤 지우면 보석마다 O(log K)다([[Greedy-Sweep-and-Two-Pointers|Greedy]]).

## 선택 기준

| 요구 | 구조 |
|---|---|
| insertion order와 무관한 정렬 순회, range query | 균형 BST |
| lookup 비중이 높고 더 엄격한 height | AVL 후보 |
| 범용 ordered map/set과 update 균형 | Red-Black 후보 |
| key exact lookup만 필요하고 순서 불필요 | hash table 후보 |
| disk/page 단위 index | binary tree보다 [[B-Tree\|B-tree]] 계열 |

## 정의와 구현을 연결하기

Perfect는 한국어로 포화, complete는 완전, full/proper는 정 이진 트리로 부르는 경우가 많지만 번역은 자료마다 다르다. degenerate는 변질 이진 트리, skewed는 편향 이진 트리로 옮기기도 한다. root depth는 0이며 level은 0 또는 1로 시작한다. 높이를 node 수로 세면 perfect tree 크기는 2^h-1, edge 수로 세면 2^(h+1)-1이다. AVL의 모든 node 높이 차 1 이하 조건은 Red-Black의 조건이 아니다. Red-Black은 색과 black-height로 높이를 제한한다.

탐색이 빨라지는 이유는 비선형 모양 자체가 아니라 순서 불변식과 작은 높이다. 정렬 배열도 이진 탐색이 O(log n)이지만 중간 삽입/삭제는 O(n)이다. BST는 균형을 유지해야 조회와 변경을 O(log n)에 수행한다. hash는 순서 없이 exact lookup을 빠르게 처리한다. C++ 표준은 map/set의 복잡도를 규정하며 Red-Black이라는 구현을 의무화하지 않는다. `next`, `prev`로 한 칸 이동은 amortized 상수 시간인 반면 k칸 이동은 O(k)여서 random access가 아니다.

Perfect tree의 중위 순서가 주어졌다면 가운데가 root이고 좌우 구간을 재귀적으로 나누어 다음 level을 복원한다. 왼쪽을 먼저 방문하면 level 안에서도 왼쪽부터 쌓인다. O(n) 시간, O(log n) 재귀 깊이다. 마지막 level이 덜 찬 complete tree에는 가운데 root 규칙을 그대로 적용할 수 없다.

AVL의 높이 갱신과 삭제 case 선택, Red-Black의 삽입과 삭제 복구를 구현할 때 확인할 점은 [[Trees-and-Balanced-Search-Trees-Rebalancing|AVL과 Red-Black 트리의 균형 복구]]에서 다룬다.

## 면접 체크포인트

- tree의 세 조건(root 하나, cycle 없음, 부모 하나)과 정점 V개에 edge V − 1개
- depth와 height를 edge 수로 세는지 node 수로 세는지, tree height가 가장 깊은 node의 depth와 같은 이유
- full, complete, perfect, degenerate, balanced의 구분과 complete가 heap 배열에 맞는 이유
- BST 불변식에서 최솟값, 최댓값, successor를 찾는 방법과 삭제의 세 경우
- BST의 평균이 O(log n)이어도 최악이 Θ(n)인 이유와 self-balancing BST가 필요한 이유
- 정렬 순회와 range query가 필요할 때 hash 대신 균형 BST를 고르는 이유

## 출처

- 인프런 보충 강의: [AVL 트리 - 구현1(보조 함수)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135755), [AVL 트리 - 구현2(삽입)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135756), [AVL 트리 - 구현3(제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=137412), [이진 탐색 알고리즘](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135749), [이진 탐색 트리 - 평가](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135753), [Red-Black 트리 - 개념(제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135758), [Red-Black 트리 - 구현1(보조 함수)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=137817), [Red-Black 트리 - 구현2(삽입)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135759), [Red-Black 트리 - 구현3(제거)](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135760)
- 인프런 보충 강의: [자료를 정리하는 이유](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128268)
- 인프런 보충 강의: [3-N](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100369)

- 인프런, 큰돌 강사, [2주차 개념 #2. 트리(Tree Data Structure)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134739), [2주차 개념 #3-1. 이진트리](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238013), [2주차 개념 #3-2. 이진탐색트리](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134740), [2주차 개념 #12. 트리순회(Tree traversal) 후위순회, 전위순회, 중위순회](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=139894), [2-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100342)
- 인프런, 큰돌 강사, [4-K](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100390)

- 인프런, 널널한 개발자 강사, [비선형 자료구조 2진 트리](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128270)
- [바킹독의 실전 알고리즘 0x16강, 이진 검색 트리 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=IKnjzmyk70U)
- [cppreference, std::multiset::find](https://en.cppreference.com/w/cpp/container/multiset/find)
- [바킹독의 실전 알고리즘 0x19강, 트리 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=nehRy6hAJsA)
- [NIST Dictionary — Tree](https://www.nist.gov/dads/HTML/tree.html)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 트리와 이진 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135721)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — AVL 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135754)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Red-Black 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135757)
- [트리 구조의 기본 개념과 용어, 이진 트리의 종류 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=ohrwGtqeW-I)
- [이진탐색트리의 순회와 삽입, 삭제, 검색 — YouTube, 쉬운코드](https://www.youtube.com/watch?v=i57ZGhOVPcI)
- [Princeton Algorithms, Binary Search Trees](https://algs4.cs.princeton.edu/32bst/)
- [Lecture 7: Binary Trees II: AVL — MIT OpenCourseWare 6.006](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/a2c80596cf4a2b5fbc854afdd2f23dcb_MIT6_006S20_lec7.pdf)

## 관련 문서

- [[Trees-and-Balanced-Search-Trees-Rebalancing|AVL과 Red-Black 트리의 균형 복구]]
- [[B-Tree|B-Tree]]
- [[Trie-and-Autocomplete|Trie와 자동완성]]
- [[Heap|Heap과 우선순위 큐]]
- [[Hash-Table|Hash Table]]
- [[Greedy-Sweep-and-Two-Pointers|Greedy와 정렬 기반 선택]]
- [[Algorithm-Complexity|시간복잡도]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
