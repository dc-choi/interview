---
tags: [cs, data-structure, tree, bst, avl, red-black-tree]
status: done
category: "CS - 자료구조"
aliases: ["Trees and Balanced Search Trees", "이진 탐색 트리", "AVL Tree", "Red Black Tree"]
---

# 트리와 균형 탐색 트리

트리는 root에서 시작하는 계층 구조다. 그래프 관점의 tree는 연결되고 cycle이 없는 undirected graph이며, `V`개 정점이 있으면 간선은 `V-1`개다. 자료구조 관점에서는 child의 순서와 빈 subtree도 의미를 가질 수 있다.

## 이진 트리 용어

- **Binary tree**: 각 node가 left/right child를 최대 하나씩 가진다.
- **Full 또는 proper**: 모든 node가 child를 0개 또는 2개 가진다.
- **Perfect**: 모든 internal node가 child 2개를 가지며 leaf depth가 같다.
- **Complete**: 마지막 level을 제외하면 가득 차고, 마지막 level은 왼쪽부터 채운다. [[Heap]]의 배열 표현이 가능한 이유다.
- **Height**: root에서 가장 먼 leaf까지의 edge 수. 정의에 따라 node 수로 세는 자료도 있으므로 convention을 확인한다.

## 순회

| 순회 | 순서 | 대표 용도 |
|---|---|---|
| preorder | root, left, right | tree 복제, prefix 표현 |
| inorder | left, root, right | BST를 key 순서로 열거 |
| postorder | left, right, root | subtree 삭제, bottom-up 계산 |
| level-order | level별 왼쪽부터 | BFS, 가장 가까운 level 탐색 |

재귀 순회는 call stack을 사용한다. tree가 매우 깊거나 외부 입력으로 편향될 수 있으면 explicit stack/queue와 depth limit을 검토한다.

## Binary Search Tree

BST의 각 node는 왼쪽 subtree의 key가 더 작고 오른쪽 subtree의 key가 더 크다는 invariant를 재귀적으로 유지한다. duplicate를 금지하는 것은 보편 규칙이 아니라 구현 정책이다. count를 저장하거나 한쪽 subtree에 모으는 정책도 가능하지만 모든 연산이 같은 정책을 따라야 한다.

검색, 삽입과 삭제는 root-to-leaf 경로 하나를 따라가므로 `O(h)`다. 균형이 잡히면 `h = O(log n)`이지만 정렬된 입력을 그대로 넣은 일반 BST는 linked list처럼 기울어 `O(n)`이 된다.

### 삭제 세 경우

1. leaf: parent link를 비운다.
2. child 하나: node를 그 child로 대체한다.
3. child 둘: inorder successor인 오른쪽 subtree의 최솟값이나 predecessor인 왼쪽 subtree의 최댓값으로 대체한 뒤 그 node를 삭제한다.

parent link, root 교체와 duplicate 정책을 빠뜨리기 쉬워 삭제는 반환된 subtree root를 부모가 다시 연결하는 재귀 형태가 안전하다.

## AVL tree

AVL은 모든 node에서 left/right subtree height 차이인 balance factor의 절댓값을 1 이하로 유지한다. 삽입이나 삭제 뒤 ancestor 방향으로 height를 갱신하고 처음 깨진 구조를 rotation으로 복구한다.

- LL: right rotation
- RR: left rotation
- LR: left rotation 후 right rotation
- RL: right rotation 후 left rotation

더 엄격한 균형 덕분에 lookup 경로가 짧지만 update마다 height와 rotation을 관리한다.

## Red-Black tree

Red-Black tree는 각 node에 color를 두고 다음 invariant로 height를 `O(log n)`에 묶는다.

1. node는 red 또는 black이다.
2. root는 black이다.
3. 모든 NIL leaf는 black이다.
4. red node의 child는 black이다.
5. 한 node에서 descendant NIL까지 모든 경로의 black node 수가 같다.

삽입은 보통 red node를 넣고 parent/uncle color에 따라 recoloring과 rotation을 한다. 삭제는 제거한 black 높이를 복구하는 경우가 더 복잡하다. AVL보다 항상 update가 빠르다고 단정하지 말고 lookup/update 비율, memory와 표준 library 구현을 기준으로 선택한다.

## 선택 기준

| 요구 | 구조 |
|---|---|
| insertion order와 무관한 정렬 순회, range query | 균형 BST |
| lookup 비중이 높고 더 엄격한 height | AVL 후보 |
| 범용 ordered map/set과 update 균형 | Red-Black 후보 |
| key exact lookup만 필요하고 순서 불필요 | hash table 후보 |
| disk/page 단위 index | binary tree보다 B-tree 계열 |

## 출처

- 인프런, 큰돌 강사, [2주차 개념 #2. 트리(Tree Data Structure)](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134739), [2주차 개념 #3-1. 이진트리](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=238013), [2주차 개념 #3-2. 이진탐색트리](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=134740), [2주차 개념 #12. 트리순회(Tree traversal) 후위순회, 전위순회, 중위순회](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=139894), [2-R](https://www.inflearn.com/courses/lecture?courseId=326485&unitId=100342)

- 인프런, 널널한 개발자 강사, [비선형 자료구조 2진 트리](https://www.inflearn.com/courses/lecture?courseId=329605&unitId=128270)
- [NIST Dictionary — Tree](https://www.nist.gov/dads/HTML/tree.html)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — 트리와 이진 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135721)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — AVL 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135754)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Red-Black 트리, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135757)

## 관련 문서

- [[Trie-and-Autocomplete|Trie와 자동완성]]
- [[Heap|Heap과 우선순위 큐]]
- [[Hash-Table|Hash Table]]
- [[Algorithm-Complexity|시간복잡도]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
