---
tags: [cs, algorithm, string, boyer-moore, pattern-matching]
status: done
verified_at: 2026-11-09
category: "CS - 알고리즘"
aliases: ["Boyer-Moore", "보이어 무어", "Boyer-Moore-Horspool", "bad character rule", "문자열 검색"]
---

# Boyer-Moore 문자열 검색

Boyer-Moore는 텍스트에서 패턴을 찾을 때 글자를 덜 읽어서 빠른 문자열 검색 알고리즘이다. R. S. Boyer와 J S. Moore가 1977년 Communications of the ACM에 발표했다. [[String-Matching-KMP|KMP]]가 텍스트 index를 되돌리지 않아 모든 글자를 한 번씩 읽는 쪽이라면, Boyer-Moore는 읽지 않고 건너뛸 수 있는 구간을 찾는 쪽이다. 그래서 일반적으로 지나간 글자보다 적은 글자만 확인하는 sublinear 동작을 보인다.

## 끝 글자부터 비교하는 이유

단순 비교는 패턴을 텍스트 위에 대고 앞 글자부터 비교하다가 틀리면 한 칸 민다. 결국 텍스트의 모든 글자를 읽는다.

Boyer-Moore는 패턴을 대고 패턴의 마지막 글자 자리부터 비교한다. 길이 6인 `SEARCH`를 찾는데 그 자리의 텍스트 글자가 `Z`라고 하자. `Z`는 패턴 어디에도 없으므로 그 글자를 덮는 어떤 정렬에서도 일치할 수 없다. 따라서 패턴을 6칸 통째로 넘기고, 그 사이 글자는 읽지 않는다. 텍스트 글자가 패턴에 있는 글자라면, 패턴 안의 그 글자가 텍스트의 그 자리에 오도록 필요한 만큼만 민다. 건너뛰는 칸에는 일치가 걸칠 수 없으므로 일치를 놓치지 않는다.

이 규칙을 bad character rule이라 한다. 원래 Boyer-Moore는 이미 맞은 접미사 정보를 쓰는 good suffix rule도 함께 쓰고, 두 규칙이 주는 이동 거리 중 큰 쪽을 택한다. 원 논문은 첫 일치를 찾을 때 전처리 이후 수행 시간이 선형이라는 증명을 소개하며, 그 선형성이 good suffix 규칙에서 나온다고 설명한다.

## Horspool 단순화

Bad character 표만 쓰고 현재 창의 마지막 텍스트 글자로 이동 거리를 정하는 단순화가 Boyer-Moore-Horspool이다. 구현이 짧고, V8처럼 Horspool을 먼저 쓰다가 필요할 때 full Boyer-Moore로 올리는 구현도 있다. 대신 good suffix 규칙이 주던 최악 보장은 사라진다.

```cpp
std::vector<int> horspool(const std::string& s, const std::string& p) {
  int n = s.size(), m = p.size();
  std::vector<int> found;
  if (m == 0 || m > n) return found;
  std::array<int, 256> shift;
  shift.fill(m);  // p[0..m-2]에 없는 글자는 패턴 길이만큼 건너뛴다
  for (int i = 0; i < m - 1; i++) shift[(unsigned char)p[i]] = m - 1 - i;
  for (int pos = 0; pos <= n - m; pos += shift[(unsigned char)s[pos + m - 1]]) {
    int j = m - 1;
    while (j >= 0 && s[pos + j] == p[j]) j--;  // 끝에서부터 비교
    if (j < 0) found.push_back(pos);
  }
  return found;
}
```

표는 패턴 마지막 글자를 제외한 앞부분 `p[0..m-2]`에서 각 글자가 가장 오른쪽에 나온 위치부터 패턴 끝(m - 1)까지의 거리다. 마지막 글자를 제외해야 창 끝 글자가 패턴 끝 글자와 같을 때 이동 거리가 0이 되지 않는다.

## 패턴 길이와 성능

- 패턴이 길수록 한 번에 건너뛸 수 있는 최대 거리가 커져 일반적으로 빨라진다.
- 반대로 짧은 패턴은 건너뛰는 거리가 작아 단순 비교보다 나을 것이 적다. V8은 길이 7 미만에서 Boyer-Moore의 건너뛰기가 단순 비교 대비 부가 비용을 상쇄하지 못한다고 보고 단순 검색을 쓴다(7은 V8 구현의 기준값이다).
- DNA처럼 알파벳이 작으면 부분 문자열이 자주 반복되어 이동 거리가 패턴 길이에 비례해 계속 커지지 않는다. Bad character 표만 보면 대부분의 글자가 패턴에 들어 있어 이동 거리가 짧아진다.
- Horspool 단순화는 `AAAA...A`에서 `BAA...A`를 찾는 경우처럼 끝에서 거의 다 맞다가 틀리고 한 칸씩만 미는 입력에서 O(NM)이 된다. 최악 보장이 필요하면 KMP 등을 쓴다.

## 실제 사용 사례

- GNU grep의 원작자는 GNU grep이 빠른 첫째 이유로 모든 입력 바이트를 보지 않는다는 점을 들었다. 대상 문자열의 마지막 글자부터 보고, 맞지 않는 글자를 만나면 lookup table로 얼마나 건너뛸지 정하는 Boyer-Moore를 쓴다고 설명했다(2010년 메일링 리스트 글 기준).
- V8의 문자열 검색(`src/strings/string-search.h`, 2026년 11월 main 기준)은 패턴 길이로 전략을 고른다. 길이 1은 단일 글자 검색, 2~6은 단순 선형 검색을 쓴다. 7 이상(`kBMMinPatternLength = 7`)이면 처음에는 선형 검색으로 시작하고, 일치를 일찍 찾지 못해 비교 비용이 커지면 Boyer-Moore-Horspool로, 그래도 나쁘면 good suffix 표까지 쓰는 Boyer-Moore로 올린다. 기준 상수의 주석은 그보다 짧은 패턴에서 Boyer-Moore의 건너뛰기 길이가 알고리즘의 부가 비용을 상쇄하기에 너무 짧다고 설명한다.

## 선택 기준

| 상황 | 우선 검토 |
|---|---|
| 짧은 패턴이나 한 번의 짧은 검색 | 단순 비교, 표준 라이브러리 |
| 긴 패턴을 큰 텍스트에서 찾고 평균 속도가 중요 | Boyer-Moore 계열 |
| 최악 O(N + M) 보장이 필요 | KMP 등 |
| 여러 패턴을 한꺼번에 찾음 | Aho-Corasick |

## 체크포인트

- 끝 글자부터 비교해야 패턴에 없는 글자를 만났을 때 패턴 길이만큼 건너뛸 수 있는 이유
- 건너뛴 구간에 일치가 걸칠 수 없음을 보이는 논리
- 짧은 패턴과 작은 알파벳에서 이득이 줄어드는 이유
- Horspool 단순화의 최악 입력과 KMP의 최악 보장 차이

## 출처

- [A Fast String Searching Algorithm — Communications of the ACM, R. S. Boyer, J S. Moore](https://doi.org/10.1145/359842.359859)
- [The Boyer-Moore Fast String Searching Algorithm — J Strother Moore](https://www.cs.utexas.edu/~moore/best-ideas/string-searching/)
- [why GNU grep is fast — FreeBSD freebsd-current mailing list, Mike Haertel](https://lists.freebsd.org/pipermail/freebsd-current/2010-August/019310.html)
- [string-search.h — V8 source repository](https://github.com/v8/v8/blob/main/src/strings/string-search.h)
- [컴퓨터는 절대 문서를 다 읽지 않습니다 — YouTube, 조코딩 JoCoding](https://www.youtube.com/watch?v=rC6CqzvFQy8)

## 관련 문서

- [[String-Matching-KMP|문자열 매칭과 KMP]]
- [[Problem-Solving-Techniques|코딩 테스트 문제 해결 기법]]
- [[Trie-and-Autocomplete|Trie와 자동완성]]
- [[Algorithm-Complexity|시간복잡도]]
