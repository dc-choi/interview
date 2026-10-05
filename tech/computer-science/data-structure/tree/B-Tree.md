---
tags: [cs, data-structure, tree, btree, index]
status: done
category: "CS - 자료구조"
aliases: ["B-Tree", "B tree", "B 트리", "비트리", "m차 B-tree"]
---

# B-Tree

B-tree는 BST를 일반화한 균형 탐색 트리다. internal node 하나가 정렬된 key를 여러 개까지 담고 그보다 하나 많은 child를 가지며, 인접한 두 key 사이 구간마다 child subtree가 하나씩 대응한다. 모든 leaf가 같은 depth에 있도록 삽입은 node 분할로, 삭제는 재분배와 병합으로 균형을 유지하므로 이진 트리식 회전이 필요 없고 높이는 root에서만 늘거나 준다. node 하나를 storage block 하나에 맞추면 한 번 읽은 block으로 탐색 범위를 수십에서 수백 분의 1로 좁힐 수 있어 데이터베이스와 파일 시스템 인덱스의 바탕이 된다.

## 차수와 불변식

차수(order) m을 node가 가질 수 있는 최대 child 수로 정의하면 나머지 제한이 따라 나온다.

| 항목 | 값 | m = 3 | m = 5 | m = 101 |
|---|---|---|---|---|
| node의 최대 child | m | 3 | 5 | 101 |
| node의 최대 key | m − 1 | 2 | 4 | 100 |
| root가 아닌 internal node의 최소 child | ⌈m/2⌉ | 2 | 3 | 51 |
| root가 아닌 node의 최소 key | ⌈m/2⌉ − 1 | 1 | 2 | 50 |

- key가 k개인 internal node는 child가 정확히 k + 1개다. key는 오름차순이고, i번째 child subtree의 key는 그 양옆 key 사이 값이다.
- root는 최소 조건에서 빠진다. key가 1개 이상이면 되고 leaf가 아니면 child가 2개 이상이다. 그래서 차수와 무관하게 internal node는 child를 적어도 2개 가진다.
- 모든 leaf는 같은 level에 있다.
- 차수의 정의는 자료마다 다르다. CLRS 계열은 minimum degree t ≥ 2로 정의해 root가 아닌 node가 t − 1개 이상 2t − 1개 이하의 key를 갖게 하므로 최대 child가 2t인 짝수 차수만 표현한다. m = 3인 B-tree는 2-3 tree, t = 2인 B-tree는 2-3-4 tree다. 문서를 읽을 때 m이 최대 child 수인지, 최대 key 수인지, minimum degree인지 먼저 확인한다.

## 탐색

root부터 node 안의 정렬된 key와 비교해 찾는 key가 있으면 끝내고, 없으면 key 사이 구간에 해당하는 child로 내려간다. leaf에서도 없으면 실패다. 방문하는 node는 높이 + 1개 이하이고, node 안에서 binary search를 쓰면 node당 O(log m)번 비교하므로 전체는 O(log m × log_m n) = O(log n)번 비교다. 비교 횟수보다 중요한 것은 읽는 node 수가 O(log_m n)이라는 점이다.

## 삽입: leaf에 넣고 넘치면 가운데 key를 올린다

1. 탐색으로 key가 들어갈 leaf를 찾아 정렬 위치에 넣는다. 삽입은 항상 leaf에서 일어난다.
2. leaf의 key가 m개가 되어 넘치면 가운데 key(median)를 기준으로 왼쪽 key와 오른쪽 key를 두 node로 나누고 median은 부모로 올린다. 올라간 key의 왼쪽과 오른쪽 child가 나뉜 두 node다.
3. 부모도 넘치면 같은 분할을 위로 반복한다. root가 넘치면 median 하나만 가진 새 root를 만들고 높이가 1 늘어난다.

높이는 root 분할로만 늘어나므로 모든 leaf가 같은 depth를 유지한다. m = 3인 B-tree에 10, 20, 30, 40, 50, 60, 70을 차례로 넣으면 30에서 [10, 20, 30]이 넘쳐 root [20]과 leaf [10], [30]이 되고, 50에서 [30, 40, 50]의 40이 올라가 root가 [20, 40]이 된다. 70에서는 leaf [50, 60, 70]의 60이 올라가 root가 [20, 40, 60]으로 넘치고, 다시 40이 새 root로 올라가 root [40], 그 아래 [20]과 [60], leaf [10], [30], [50], [70]인 높이 2의 트리가 된다.

## 삭제: leaf에서 지우고 모자라면 빌리거나 합친다

1. 지울 key가 internal node에 있으면 predecessor(왼쪽 subtree의 최댓값)나 successor(오른쪽 subtree의 최솟값)와 자리를 바꾼다. internal node의 key는 양쪽에 child가 반드시 있으므로 왼쪽 child로 내려간 뒤 가장 오른쪽 child로만 내려가면 결국 leaf에 닿고, predecessor는 그 leaf의 마지막 key다. 그래서 삭제는 항상 leaf에서 일어난다.
2. leaf에서 key를 지운 뒤 key가 ⌈m/2⌉ − 1개 이상 남으면 끝이다.
3. 모자라면 key가 여유 있는 바로 옆 형제에게서 빌린다. 형제의 key를 바로 옮기면 순서가 깨지므로 둘 사이의 부모 key를 모자란 node로 내리고, 형제의 가장 가까운 key(왼쪽 형제면 최댓값, 오른쪽 형제면 최솟값)를 부모 자리로 올린다. internal node라면 그 key에 딸린 child pointer도 함께 옮긴다.
4. 양쪽 형제 모두 여유가 없으면 형제 하나와 병합한다. 둘 사이의 부모 key를 내려 두 node의 key와 합치고 빈 node를 없앤다. 합친 key는 (⌈m/2⌉ − 2) + 1 + (⌈m/2⌉ − 1)개로 m − 1을 넘지 않는다.
5. 병합으로 부모의 key가 하나 줄어 부모가 모자라면 부모 위치에서 3부터 반복한다. root가 비면 root를 없애고 병합된 child가 새 root가 되어 높이가 1 준다. root는 최소 조건에서 빠지므로 key가 하나라도 남으면 그대로 둔다.

위 삽입 예의 트리에서 10을 지우면 형제 [30]에 여유가 없어 부모의 20을 내려 [20, 30]으로 합치고, 비게 된 부모 자리도 형제 [60]에 여유가 없어 root의 40을 내려 [40, 60]으로 합친다. root가 비어 사라지므로 root [40, 60] 아래 leaf [20, 30], [50], [70]인 높이 1의 트리가 된다. 같은 트리에 35가 더 있어 leaf가 [30, 35]였다면 10을 지운 뒤 부모의 20을 내리고 형제의 최솟값 30을 부모로 올리는 재분배로 끝나 높이가 그대로다.

root에서 내려가면서 꽉 찬 node를 미리 나누거나(삽입) key가 최소인 node를 미리 채워(삭제) 부모로 거슬러 올라가는 처리를 줄이는 변형(CLRS)도 있다. 같은 입력에서 위의 방식과 다른 모양이 나올 수 있다.

## 높이와 수용량

root가 아닌 internal node의 최소 child 수를 t = ⌈m/2⌉라 하면 key가 n개인 B-tree의 높이 h(edge 수)는 다음 범위에 있다.

- 최소로 채운 경우: root에 key 1개와 child 2개, 나머지 node에 key t − 1개와 child t개가 있으면 level i(i ≥ 1)의 node는 2t^(i−1)개다. key는 1 + (t − 1) × 2(1 + t + ... + t^(h−1)) = 2t^h − 1개이므로 n ≥ 2t^h − 1, 즉 h ≤ log_t((n + 1) / 2)다.
- 꽉 채운 경우: 모든 node에 key m − 1개와 child m개가 있으면 key는 (m − 1)(1 + m + ... + m^h) = m^(h+1) − 1개다.

m = 101, h = 3(4 level)이면 최소 2 × 51³ − 1 = 265,301개, 최대 101⁴ − 1 = 104,060,400개를 담는다. 같은 높이에서도 채움 정도에 따라 수용량이 수백 배 차이 나므로 key 수만으로 높이를 확정할 수 없다. key 1억 개를 담은 101차 B-tree는 채움 정도에 따라 높이가 3이나 4지만, 이진 트리는 완벽하게 균형을 맞춰도 높이가 26이다.

## 저장소 인덱스에 맞는 이유

디스크와 SSD 같은 secondary storage는 메모리보다 훨씬 느리고, 데이터를 byte가 아니라 block이나 page 단위로 읽고 쓴다. key 하나만 필요해도 그 key가 든 block 전체를 읽으므로 인덱스의 성능은 비교 횟수보다 storage에 접근하는 횟수로 정해진다.

- node 하나를 block 하나에 맞추면 한 번 읽은 block의 key를 모두 탐색에 쓴다. 이진 트리 node는 key가 하나라 block을 읽어도 대부분을 버리고, 경로가 길어 읽는 block 수도 많다.
- root만 메모리에 있고 나머지 node와 행이 각각 다른 block에 있다면, 찾는 key가 depth d에 있을 때 storage 접근은 node d번과 행 1번이다. key가 10개면 AVL tree는 높이가 3이라 가장 깊은 key에 4번 접근하지만, 5차 B-tree는 높이가 1이라 2번이면 된다. 같은 key 수에서 d가 이진 트리는 log₂ n, B-tree는 log_m n 규모로 자라므로 차이는 데이터가 클수록 벌어진다.
- 균형 BST의 node를 block 단위로 모아 저장하려고 최적화하면 결국 node 하나에 key 여러 개를 두는 B-tree와 비슷한 구조가 되므로, 따로 최적화하기보다 처음부터 B-tree를 쓰는 편이 낫다.
- hash 인덱스는 등호 조회가 평균 O(1)이지만 범위 조건, 정렬, 접두어 조회에 쓸 수 없다. 이런 질의가 하나라도 필요하면 B-tree 계열이 기본값이다. MySQL과 PostgreSQL에서의 제약은 [[B-Tree-Index-Depth#Hash 인덱스와 비교|Hash 인덱스와 비교]]에 있다.

DBMS 인덱스는 흔히 내부 node에 key와 child pointer만 두고 행이나 행 위치는 leaf에만 두며 leaf끼리 연결하는 B+Tree 계열로 구현한다. 내부 node가 작아 fan-out이 커지고 범위 스캔은 leaf를 따라 읽는다. InnoDB의 페이지 구조, fan-out 실측과 깊이는 [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]에 있다.

## 면접 체크포인트

- m차 B-tree의 최대와 최소 key 수, child 수, root 예외, key가 k개면 child가 k + 1개인 이유
- 삽입이 leaf에서만 일어나고 넘치면 median을 올리는 이유, 높이가 root에서만 늘어 모든 leaf가 같은 depth인 이유
- 삭제에서 internal key를 predecessor나 successor와 바꾸는 이유와 재분배, 병합, root 제거의 순서
- 높이 상한 log_t((n + 1) / 2)와 같은 높이에서 최소, 최대 수용량이 크게 다른 이유
- 같은 O(log n)인데 DB 인덱스가 균형 BST가 아니라 B-tree 계열을 쓰는 이유(block 단위 I/O와 높이)
- hash 인덱스를 기본으로 쓰지 않는 이유와 B-tree, B+Tree의 차이

## 출처

- [YouTube, 쉬운코드, B tree의 개념과 데이터 삽입](https://www.youtube.com/watch?v=bqkcoSm_rCs)
- [YouTube, 쉬운코드, B tree 데이터 삭제 동작 방식](https://www.youtube.com/watch?v=H_u28u0usjA)
- [YouTube, 쉬운코드, B tree가 DB 인덱스로 사용되는 이유](https://www.youtube.com/watch?v=liPSnc6Wzfk)
- [NIST DADS, B-tree](https://xlinux.nist.gov/dads/HTML/btree.html)
- [B-trees — CMPS 2200 Intro. to Algorithms, Tulane University](https://www.cs.tulane.edu/~carola/teaching/cmps2200/fall15/slides/Lecture-Btrees.pdf)

## 관련 문서

- [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]
- [[Trees-and-Balanced-Search-Trees-Rebalancing|AVL과 Red-Black 트리의 균형 복구]]
- [[B-Tree-Index-Depth|B-Tree 인덱스 깊이]]
- [[Index|Index 기본]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
