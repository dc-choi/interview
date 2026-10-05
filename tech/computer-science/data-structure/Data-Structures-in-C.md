---
tags: [cs, data-structure, c, pointer, linked-list, malloc, realloc]
status: done
verified_at: 2026-10-05
category: "CS - 자료구조"
aliases: ["Data Structures in C", "C로 구현하는 자료구조", "C 연결 리스트", "자기 참조 구조체", "Self-Referential Structure"]
---

# C로 구현하는 자료구조

C에서 자료구조의 재료는 두 가지다. 원소를 연속 메모리에 두는 배열과, 값과 다른 node의 주소를 함께 담아 흩어진 메모리를 잇는 node다. 연결 리스트, 이진 검색 트리, chaining hash table, trie, stack과 queue는 이 둘을 조합하는 방식만 다르고, 할당 실패 확인, 초기화하지 않은 pointer 금지, 해제 순서라는 같은 메모리 규칙을 따른다. 연산 비용과 구조 선택은 [[Linear-Data-Structures|선형 자료구조]], [[Trees-and-Balanced-Search-Trees|트리]], [[Hash-Table|해시 테이블]], [[Trie-and-Autocomplete|Trie]]에서 다루고, 이 문서는 그 구조를 C의 메모리로 표현하고 관리하는 방법을 다룬다. 주소와 역참조, `malloc`과 `free`의 기본과 메모리 오류 도구는 [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리]]에 있다.

## Pointer를 쓰기 전의 규칙

```c
int *x = malloc(sizeof(int));
if (x == NULL) return 1;
int *y;     // 어디를 가리키는지 정해지지 않았다
*y = 13;    // undefined behavior
y = x;      // y가 x와 같은 int를 가리킨다
*y = 13;    // 이제 *x도 13이다
free(x);
```

- 함수 안에서 초기화 없이 선언한 지역 pointer(자동 저장 기간 객체)의 값은 불확정(indeterminate)이고, 그런 pointer를 역참조하면 undefined behavior다. 다른 데이터를 조용히 덮어쓰거나, 접근할 수 없는 주소면 segmentation fault로 끝나거나, 최적화 수준에 따라 다르게 동작해 재현이 어렵다. 전역과 `static` pointer는 null pointer로 시작한다.
- 가리킬 대상이 아직 없으면 `NULL`로 초기화하고, 역참조 전에 유효한 객체의 주소를 대입한다. 두 pointer가 같은 주소를 가지면 한쪽으로 쓴 값이 다른 쪽에서도 보인다.
- `malloc`은 실패하면 null pointer를 반환하므로 받은 즉시 확인한다. 성공해도 받은 메모리는 초기화되지 않았으므로 node의 모든 필드를 직접 채운다.
- 할당한 블록은 `free`나 `realloc`으로 돌려줘야 누수가 없다. `free(NULL)`은 아무 일도 하지 않는다. 해제한 블록을 그 pointer로 다시 읽거나 같은 블록을 두 번 해제하면 undefined behavior다.
- `NULL`은 null pointer constant로 펼쳐지는 macro다(값이 0인 정수 상수식, 그것을 `void *`로 변환한 식, C23부터는 `nullptr`도 가능). null pointer의 bit 표현이 모두 0이라는 보장은 없어서 `calloc`이나 `memset`으로 0을 채운 pointer 필드를 NULL로 보는 코드는 이식성을 잃는다. 흔한 플랫폼에서는 성립하지만 node의 pointer 필드에는 `NULL`을 직접 대입한다.

## 배열 키우기와 realloc

할당한 배열 바로 뒤의 메모리는 다른 할당이 쓰고 있을 수 있어 그 자리에서 늘어난다는 보장이 없다. 그래서 더 큰 블록을 새로 할당하고, 기존 원소를 복사하고, 옛 블록을 해제한 뒤 pointer를 바꾼다. 원소 n개를 옮기므로 한 번의 확장은 O(n)이고, 한 칸씩 늘리면 n번 추가가 O(n²)이다. 용량을 배수로 늘려 추가당 amortized O(1)을 만드는 이유는 [[Linear-Data-Structures#Array와 dynamic array|dynamic array]]에 있다.

```c
int *list = malloc(3 * sizeof(int));
if (list == NULL) return 1;
list[0] = 1; list[1] = 2; list[2] = 3;

int *tmp = realloc(list, 4 * sizeof(int));
if (tmp == NULL) {  // 실패해도 옛 블록은 해제되지 않고 남아 있다
  free(list);
  return 1;
}
list = tmp;
list[3] = 4;
free(list);
```

`realloc`은 새 할당, 복사와 해제를 한 번에 처리한다.

- 가능하면 기존 영역을 그 자리에서 늘리거나 줄이고, 아니면 새 블록을 할당해 옛 크기와 새 크기 중 작은 쪽만큼 복사한 뒤 옛 블록을 해제한다. 늘어난 부분의 값은 정해지지 않는다.
- 메모리가 부족하면 옛 블록을 그대로 두고 null pointer를 반환한다. `list = realloc(list, ...)`처럼 같은 변수에 바로 받으면 실패할 때 옛 블록의 유일한 주소를 잃어 누수가 생긴다.
- 성공하면 같은 자리에서 늘어났더라도 옛 pointer는 무효다. 옛 주소를 복사해 둔 다른 pointer도 새 주소로 다시 맞춘다.
- `realloc(NULL, size)`는 `malloc(size)`와 같다. 크기 0은 C17까지 구현 정의(C17에서 deprecated)이고 C23부터 undefined behavior라 쓰지 않는다.

연결 리스트는 node 하나를 할당해 pointer만 이으므로 원소가 늘어도 기존 원소를 옮기지 않는다. 대신 index로 원소의 위치를 계산할 수 없다.

## 자기 참조 구조체로 node 정의하기

```c
typedef struct node {
  int number;
  struct node *next;
} node;
```

- 구조체 타입은 정의가 끝나야 완전해지므로 자기 타입의 멤버는 가질 수 없지만, 자기 타입을 가리키는 pointer 멤버는 가질 수 있다. 연결 리스트와 트리의 node가 이 형태다.
- 태그 `struct node`는 태그가 나타난 직후부터 보여 중괄호 안에서 쓸 수 있다. 맨 끝의 typedef 이름 `node`는 선언자가 끝난 뒤에야 보이므로 멤버 선언에 쓸 수 없다. 첫 줄의 태그를 생략하면 멤버에서 자기 타입을 부를 이름이 없다.
- `n->number`는 `n`이 가리키는 구조체의 `number` 멤버로 `(*n).number`와 같다. `.`이 단항 `*`보다 먼저 결합하므로 괄호 없이 `*n.number`라고 쓰면 `*(n.number)`로 해석돼 컴파일되지 않는다.

## 연결 리스트 만들기, 순회, 해제

```c
void free_list(node *list) {
  while (list != NULL) {
    node *next = list->next;  // free한 뒤에는 list->next를 읽을 수 없다
    free(list);
    list = next;
  }
}

node *list = NULL;              // 빈 리스트
for (int i = 3; i >= 1; i--) {  // 앞에 붙이므로 1, 2, 3 순서가 된다
  node *n = malloc(sizeof(node));
  if (n == NULL) {
    free_list(list);
    return 1;
  }
  n->number = i;
  n->next = list;               // 두 줄의 순서를 바꾸면 기존 리스트를 잃는다
  list = n;
}
for (node *tmp = list; tmp != NULL; tmp = tmp->next) printf("%i\n", tmp->number);
free_list(list);
```

- 빈 리스트를 `NULL`로 두면 빈 상태와 마지막 node 다음을 같은 조건으로 판별해 순회와 해제가 빈 리스트에서도 그대로 동작한다.
- 앞에 붙이기는 길이와 무관하게 O(1)이다. 끝에 붙이려면 tail pointer가 없을 때 끝 node까지 걸어가야 해 O(n)이다. `list->next->next = n`처럼 고정 경로로 붙이는 코드는 길이를 미리 아는 예제에서만 동작한다.
- 해제할 때 다음 node 주소를 먼저 저장하는 이유는 free한 node의 필드를 읽는 것이 use-after-free라는 undefined behavior이기 때문이다.

### 중간에 끼우고 지우기

정렬을 유지하며 넣거나 특정 값을 지울 때 바꿔야 할 칸은 첫 node를 가리키는 `list` 변수일 수도, 앞 node의 `next`일 수도 있다. 그 칸의 주소를 `node **`로 들고 내려가면 맨 앞, 중간과 끝을 같은 코드로 처리한다.

```c
node **link = &list;  // 오름차순 위치에 n을 끼운다
while (*link != NULL && (*link)->number < n->number) link = &(*link)->next;
n->next = *link;
*link = n;
```

삭제도 지울 node를 가리키는 칸을 같은 방법으로 찾아 `node *victim = *link;`로 받아 두고 `*link = victim->next;`로 건너뛴 뒤 `free(victim)`한다. 앞 node pointer(prev)로 구현하면 맨 앞 node의 삽입과 삭제를 따로 처리해야 한다. 어느 쪽이든 위치를 찾는 데 O(n), 찾은 뒤 연결을 바꾸는 데 O(1)이다.

## 같은 재료로 만드는 구조

### 이진 검색 트리

```c
typedef struct node {
  int number;
  struct node *left;
  struct node *right;
} node;

bool search(const node *tree, int target) {
  if (tree == NULL) return false;
  if (target < tree->number) return search(tree->left, target);
  if (target > tree->number) return search(tree->right, target);
  return true;
}
```

- 찾는 값을 인자로 받아야 어떤 값이든 찾는 함수가 된다. `bool`은 C99부터 C17까지 `<stdbool.h>`를 포함해야 쓸 수 있고 C23부터 키워드다.
- 비교할 때마다 한쪽 subtree로만 내려가므로 비용은 높이 h에 비례한다. 균형이 맞으면 O(log n)이지만 정렬된 값을 차례로 넣은 BST는 한쪽으로 자라 연결 리스트와 같은 O(n)이 되고, 재귀 깊이도 n이 되어 call stack이 넘칠 수 있다([[Trees-and-Balanced-Search-Trees#Binary Search Tree|BST]], [[Algorithm-Recursion|재귀]]).
- 삽입은 검색 경로를 따라 내려가다 NULL을 만난 칸(부모의 `left`나 `right`)에 새 node 주소를 쓴다. 그 칸을 바꾸려면 위의 `node **` 방식을 쓰거나 바뀐 subtree root를 반환해 부모가 다시 대입한다. 해제는 두 자식을 먼저 해제한 뒤 자신을 해제하는 후위 순회로 쓴다. 자신을 먼저 해제하면 그 뒤에는 `left`와 `right`를 읽을 수 없어 두 주소를 미리 저장해 둬야 한다.

### Chaining hash table

table은 연결 리스트 head pointer의 배열 `node *table[N];`이고, node에는 key와 value, 다음 node pointer를 둔다.

- 전역이나 `static` 배열은 모든 칸이 null pointer로 시작하지만 함수 안 지역 배열은 불확정 값이므로 `node *table[N] = {NULL};`로 초기화한다. 첫 칸만 적어도 나머지 칸은 null pointer로 채워진다.
- 삽입은 `hash(key)` 칸의 chain에 같은 key가 없을 때 앞에 붙이고(있으면 value만 바꾼다), 조회는 그 칸의 chain만 순회하며 key를 비교한다.
- 영문 이름의 첫 글자를 hash로 쓰면 bucket이 26개로 고정되고 첫 글자 분포가 고르지 않아 chain 길이가 크게 차이 난다. bucket 수를 고정했을 때의 비용은 [[Hash-Table#Load factor와 resize|load factor와 resize]]에 있다.

### Trie

```c
typedef struct node {
  bool is_word;
  struct node *children[26];  // 소문자 a부터 z만 받는다고 가정
} node;
```

- node 하나가 알파벳 칸의 배열이고 각 칸이 다음 글자의 node를 가리킨다. 조회는 글자마다 `children[c - 'a']`를 따라가 NULL을 만나면 그 자리에서 실패하고, 끝까지 가면 `is_word`가 답이다. 단어 끝 표시가 없으면 `card`만 저장해도 `car`가 있다고 판단한다.
- 새 node는 `is_word`를 false로, 26칸을 `NULL`로 직접 채운다. `malloc` 결과는 초기화되지 않았고 `calloc`의 모든 bit 0은 표준상 null pointer 보장이 아니다.
- 비용은 저장한 단어 수와 무관하게 key 길이에 비례하지만, pointer가 8바이트인 흔한 64비트 환경에서 node 하나의 child 배열만 26 × 8 = 208바이트이고 대부분 비어 있다. hash table과의 비교는 [[Trie-and-Autocomplete#Hash table과 비교|Trie]]에 있다.

## 점검과 면접 체크포인트

- 할당마다 NULL을 확인하고 실패 경로에서 이미 만든 부분을 해제하는가, free한 node의 필드를 읽거나 같은 node를 두 번 해제하지 않는가
- 초기화하지 않은 pointer에 쓰면 실행마다 다르게 실패하는 이유
- `realloc` 결과를 원래 변수에 바로 대입하면 안 되는 이유와 성공 뒤 옛 pointer가 무효인 이유
- 자기 참조 구조체 안에서 typedef 이름 대신 `struct node`를 쓰는 이유
- 앞에 붙이기와 끝에 붙이기의 비용 차이, `node **`로 맨 앞 예외를 없애는 방법

## 출처

- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), malloc과 포인터 복습](https://www.boostcourse.org/cs112/lecture/119036)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 배열의 크기 조정하기](https://www.boostcourse.org/cs112/lecture/119037)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 연결 리스트: 도입](https://www.boostcourse.org/cs112/lecture/119038)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 연결 리스트: 코딩](https://www.boostcourse.org/cs112/lecture/119039)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 연결 리스트: 트리](https://www.boostcourse.org/cs112/lecture/119041)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 해시 테이블](https://www.boostcourse.org/cs112/lecture/119042)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 트라이](https://www.boostcourse.org/cs112/lecture/119043)
- [부스트코스, 모두를 위한 컴퓨터 과학 (CS50 2019), 스택, 큐, 딕셔너리](https://www.boostcourse.org/cs112/lecture/119044)
- [cppreference, malloc](https://en.cppreference.com/w/c/memory/malloc)
- [cppreference, realloc](https://en.cppreference.com/w/c/memory/realloc)
- [cppreference, free](https://en.cppreference.com/w/c/memory/free)
- [cppreference, calloc](https://en.cppreference.com/w/c/memory/calloc)
- [cppreference, NULL](https://en.cppreference.com/w/c/types/NULL)
- [cppreference, Struct declaration](https://en.cppreference.com/w/c/language/struct)
- [cppreference, Scope](https://en.cppreference.com/w/c/language/scope)
- [cppreference, Member access operators](https://en.cppreference.com/w/c/language/operator_member_access)
- [cppreference, C Operator Precedence](https://en.cppreference.com/w/c/language/operator_precedence)
- [cppreference, Initialization](https://en.cppreference.com/w/c/language/initialization)
- [cppreference, Array initialization](https://en.cppreference.com/w/c/language/array_initialization)
- [cppreference, Undefined behavior](https://en.cppreference.com/w/c/language/behavior)
- [cppreference, C keywords](https://en.cppreference.com/w/c/keyword)

## 관련 문서

- [[Linear-Data-Structures|선형 자료구조 (배열과 연결 리스트의 비용)]]
- [[Trees-and-Balanced-Search-Trees|트리와 균형 탐색 트리]]
- [[Hash-Table|해시 테이블]]
- [[Trie-and-Autocomplete|Trie와 자동완성]]
- [[C-Pointers-and-Dynamic-Memory|C 포인터와 동적 메모리 (malloc, free와 메모리 오류 도구)]]
- [[Stack-vs-Heap|Stack과 Heap (동적 할당 영역)]]
- [[Cpp-Language-Memory-and-STL|C++ 값과 메모리, Pointer]]
- [[자료구조(DataStructure)|자료구조 인덱스]]
