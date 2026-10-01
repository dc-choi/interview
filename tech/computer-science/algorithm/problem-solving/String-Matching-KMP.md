---
tags: [cs, algorithm, string, kmp, pattern-matching, coding-test]
status: done
category: "CS - 알고리즘"
aliases: ["KMP", "Knuth-Morris-Pratt", "문자열 매칭", "실패 함수", "failure function", "prefix function"]
---

# 문자열 매칭과 KMP

길이 N인 문자열 S에서 길이 M인 패턴 P가 나오는 위치를 찾는 문제다. 모든 시작 위치에서 한 글자씩 비교하는 단순 방법은 최악 O(NM)이다. `AAAA...AB`에서 `AAAB`를 찾는 경우처럼 거의 다 맞다가 끝에서 틀리는 일이 반복되면 이 최악이 나온다. 라이브러리의 `find`, `strstr`도 구현에 따라 이 최악을 보장하지 않으므로 N, M이 모두 크면 KMP로 O(N + M)을 보장한다.

## 실패 함수

`f[x]`는 패턴의 앞 x + 1글자 `P[0..x]`에서 접두사와 접미사가 같은 최대 길이다(자기 자신 전체는 제외). 접두사는 첫 글자를 포함하는 연속 부분, 접미사는 끝 글자를 포함하는 연속 부분이다. 예를 들어 `ABABCABAB`의 실패 함수는 `0 0 1 2 0 1 2 3 4`다. 마지막 값 4는 `ABAB`가 앞과 뒤에서 겹친다는 뜻이다.

실패 함수는 비교가 틀렸을 때 얼마나 되돌아가면 되는지를 알려 준다. 앞의 j글자가 맞은 상태에서 다음 글자가 틀리면, 이미 맞은 j글자 안에서 접두사와 접미사가 겹치는 `f[j - 1]`글자는 다시 비교할 필요 없이 그대로 살리고 그 다음 글자부터 비교를 이어 간다. 텍스트 쪽 index는 뒤로 가지 않는다.

실패 함수 자체도 패턴을 자기 자신에 매칭하며 같은 방식으로 O(M)에 구한다.

```cpp
std::vector<int> failure(const std::string& p) {
  std::vector<int> f(p.size(), 0);
  for (int i = 1, j = 0; i < (int)p.size(); i++) {
    while (j > 0 && p[i] != p[j]) j = f[j - 1];  // 겹친 만큼만 살리고 되돌아간다
    if (p[i] == p[j]) f[i] = ++j;
  }
  return f;
}
```

## KMP 탐색

텍스트를 한 번 훑으며 j에 현재까지 맞은 패턴 길이를 유지한다. 틀리면 `j = f[j - 1]`로 줄이고, 패턴 끝까지 맞으면 위치를 기록한 뒤 겹쳐서 나오는 경우를 찾기 위해 역시 `j = f[j - 1]`로 이어 간다.

```cpp
std::vector<int> kmpSearch(const std::string& s, const std::string& p) {
  std::vector<int> f = failure(p), found;
  for (int i = 0, j = 0; i < (int)s.size(); i++) {
    while (j > 0 && s[i] != p[j]) j = f[j - 1];
    if (s[i] == p[j] && ++j == (int)p.size()) {
      found.push_back(i - j + 1);  // 일치 시작 위치
      j = f[j - 1];
    }
  }
  return found;
}
```

`while`로 j가 줄어드는 총량은 j가 늘어난 총량을 넘지 못하므로 전체 O(N + M)이다. `ABABABABC`에서 `ABAB`를 찾으면 겹친 일치까지 포함해 0, 2, 4가 나온다.

## 선택 기준

- N, M이 작거나 한 번만 찾으면 단순 비교나 표준 라이브러리로 충분하다.
- 한 패턴을 긴 텍스트에서 찾고 최악을 보장해야 하면 KMP.
- 여러 패턴을 한꺼번에 찾으면 [[Trie-and-Autocomplete|Trie]]를 확장한 Aho-Corasick, 여러 부분 문자열의 동일성을 빠르게 비교하면 rolling hash(충돌 가능성 감안)를 검토한다([[Hash-Table|Hash Table]]).
- 실패 함수는 매칭 말고도 문자열의 최소 반복 단위(`M - f[M - 1]`이 M을 나누면 그 길이) 같은 문제에 쓰인다.

## 체크포인트

- 단순 비교가 O(NM)이 되는 입력
- 실패 함수의 정의(앞 x + 1글자, 자기 자신 제외)와 틀렸을 때 `f[j - 1]`로 가는 이유
- 텍스트 index가 되돌아가지 않아 O(N + M)이 되는 이유
- 일치 뒤에도 `j = f[j - 1]`로 이어 가야 겹친 일치를 놓치지 않는 이유

## 출처

- [바킹독의 실전 알고리즘 0x1E강, KMP — YouTube, BaaarkingDog](https://www.youtube.com/watch?v=9bkbV-VANQ0)

## 관련 문서

- [[Problem-Solving-Techniques|코딩 테스트 문제 해결 기법]]
- [[Trie-and-Autocomplete|Trie와 자동완성]]
- [[Hash-Table|Hash Table (rolling hash)]]
- [[Algorithm-Complexity|시간복잡도]]
