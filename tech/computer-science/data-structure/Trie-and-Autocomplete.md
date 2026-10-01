---
tags: [cs, data-structure, trie, prefix-tree, autocomplete]
status: done
category: "CS - 자료구조"
aliases: ["Trie and Autocomplete", "Trie", "트라이", "Prefix Tree", "자동완성"]
---

# Trie와 자동완성

Trie는 key를 문자나 byte 같은 symbol sequence로 보고 prefix를 node 경로로 공유하는 tree다. `car`, `card`, `cat`은 `ca` 경로를 함께 쓰며 terminal marker가 `car`와 `card`를 구분한다.

## 기본 연산

```text
root
 └─ c
    └─ a
       ├─ r* ─ d*
       └─ t*
```

- insert: symbol마다 child를 만들거나 따라가고 마지막 node를 terminal로 표시한다.
- exact search: 전체 key 경로와 terminal marker가 모두 있어야 성공한다.
- prefix search: prefix 경로만 존재하면 성공한다.
- delete: terminal을 해제하고 다른 key가 공유하지 않는 leaf 방향 node만 정리한다.

key 길이를 `L`이라 하면 child lookup이 평균 O(1)인 map일 때 핵심 연산은 O(L)이다. 전체 key 수와 무관하다는 장점 대신, alphabet별 pointer/map과 node object 때문에 같은 문자열 집합을 단순 배열에 저장할 때보다 memory overhead가 커질 수 있다.

### 코딩 테스트용 배열 구현과 비용

정점을 동적 할당하지 않고 `nxt[MX][26]` 배열로 자식 정점 번호를 저장한다(없으면 -1). 루트는 0번, 새 정점은 `unused++` 번호를 받고, 단어 끝 정점은 `chk[v] = true`로 표시한다. `MX`는 삽입할 모든 문자열 길이의 합 + 1이다. 삭제는 끝 정점의 `chk`만 끄는 방식이라 한 번 만든 정점은 남는다.

```cpp
const int ROOT = 0;
int unused = 1;
int nxt[MX][26];   // 시작 전 -1로 채운다
bool chk[MX];

void insert(const std::string& s) {
  int cur = ROOT;
  for (char c : s) {
    if (nxt[cur][c - 'a'] == -1) nxt[cur][c - 'a'] = unused++;
    cur = nxt[cur][c - 'a'];
  }
  chk[cur] = true;
}

bool find(const std::string& s) {
  int cur = ROOT;
  for (char c : s) {
    if (nxt[cur][c - 'a'] == -1) return false;
    cur = nxt[cur][c - 'a'];
  }
  return chk[cur];
}
```

- **시간과 실제 속도**: 삽입, 탐색, 삭제가 저장된 단어 수와 무관하게 길이 L에 대해 O(L)이다. BST는 비교가 O(log N)번이고 문자열 비교가 O(L)이라 O(L log N), 해시도 hash 계산과 문자열 비교에 O(L)이 든다. 이론상 유리하지만 배열 접근이 흩어져 실제로는 `set`이나 `unordered_set`보다 느린 경우가 흔하다. 단순히 문자열을 넣고 찾는 것뿐이면 표준 컨테이너가 시간, 메모리, 구현 모두 낫다. prefix 성질이 풀이에 필요할 때 Trie를 쓴다.
- **메모리**: 글자 하나가 `int` 26칸(104바이트)을 차지해 원문 저장보다 약 100배 쓴다. 자식 번호를 pointer로 두면 64비트 환경에서 다시 두 배다. 먼저 고정 배열의 사용량을 계산해 메모리 제한 안이면 그대로 쓰고, 넘으면 정점마다 `vector`나 `map`으로 필요한 자식만 두는 방식으로 바꾼다(접근 상수가 커진다).
- 삭제가 반복되는 환경에서는 정점이 회수되지 않아 적합하지 않다.

## 자동완성은 Trie만으로 끝나지 않는다

prefix node 아래 모든 terminal을 순회하면 일치 목록을 얻지만 결과가 많으면 subtree 크기만큼 비용이 든다. 추천 품질과 latency를 위해 별도 ranking이 필요하다.

- node마다 top-K suggestion을 cache한다.
- frequency, recency, personalization과 business rule을 score로 결합한다.
- update가 잦으면 cache 재계산 비용과 eventual consistency를 정한다.
- typo tolerance가 필요하면 edit distance, n-gram, search engine의 fuzzy query를 검토한다.

강의처럼 max heap으로 후보를 정렬할 수 있지만 매 query마다 subtree 전체를 heap에 넣으면 scale 이점이 줄어든다. read-heavy 자동완성은 prefix별 top-K를 미리 materialize하는 방식이 흔하다.

## 변형과 선택

- **Radix/Patricia tree**: child가 하나뿐인 연속 경로를 문자열 edge 하나로 압축한다.
- **Ternary search tree**: symbol 비교를 binary-search 형태로 저장해 sparse alphabet의 pointer 수를 줄인다.
- **Finite-state 구조**: 정적 dictionary를 더 압축할 수 있지만 update가 복잡하다.

Trie는 prefix search가 핵심일 때 적합하다. exact lookup만 필요하면 hash table이 단순하고, substring이나 형태소 검색과 ranking까지 필요하면 inverted index/search engine이 더 적합할 수 있다.

## 출처

- [바킹독의 실전 알고리즘 0x1F강, 트라이 — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=ZmLe4tc5XRI)
- [NIST Dictionary of Algorithms and Data Structures — Trie](https://www.nist.gov/dads/HTML/trie.html)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Trie 개념, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135766)
- [그림으로 쉽게 배우는 자료구조와 알고리즘 심화편 — Trie 자동완성 구현, 감자 강사](https://www.inflearn.com/courses/lecture?courseId=329927&unitId=135767)

## 관련 문서

- [[String-Matching-KMP|문자열 매칭과 KMP]]
- [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]
- [[Heap|우선순위 큐와 top-K]]
- [[OpenSearch-Autocomplete|OpenSearch 자동완성]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
