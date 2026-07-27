---
tags: [database, search, opensearch, query-understanding, typo-correction, korean]
status: done
verified_at: 2026-07-15
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Query Understanding", "OpenSearch 쿼리 이해", "검색어 전처리", "오타 교정", "초성 검색"]
---

# OpenSearch 쿼리 이해와 검색어 전처리

사용자가 입력한 문자열은 그대로 엔진 query가 되지 않는다. Analyzer는 정해진 규칙으로 문자열을 term으로 바꿀 뿐, 잘못 입력된 문자열을 고치거나 입력이 어떤 종류인지 판단하지 않는다. 오타, 초성, 띄어쓰기 변형, 필터 의도를 다루는 쿼리 이해 계층은 별도로 설계해야 하며, 한국어 검색의 체감 품질은 ranking보다 이 계층에서 갈리는 경우가 많다.

형태소 분석과 사전 운영은 [[OpenSearch-Korean-Text-Analysis|한국어 텍스트 분석]], 자동완성 mapping 선택은 [[OpenSearch-Search-Features#자동완성 선택지|자동완성 선택지]]가 정본이다. 이 문서는 그 앞단, 입력 문자열이 query가 되기까지를 다룬다.

## 한 장으로 보는 처리 순서

```text
사용자 입력
  -> 정규화 (유니코드, 공백, 대소문자, 전각과 반각)
  -> 입력 종류 감지 (초성 전용, 코드와 식별자, 필터 표현)
  -> query 구성 (본문 match + filter, field 라우팅)
  -> 결과가 나쁠 때 교정 제안 (did-you-mean, 재검색 정책)
```

| 단계 | 실행 위치 | 이유 |
|---|---|---|
| 정규화 | 애플리케이션 또는 char filter | 색인과 검색이 같은 규칙을 공유해야 한다 |
| 형태소, 동의어, 불용어 | analyzer | term 공간 자체의 정의 |
| 입력 종류 감지와 field 라우팅 | 애플리케이션 | analyzer는 입력의 종류를 판단하지 못한다 |
| 오타 후보 생성 | 엔진 suggester | 색인 term 통계가 필요하다 |
| 교정 노출 정책 | 애플리케이션 | UX와 사업 판단이다 |

## 검색어 정규화

- 유니코드 정규화를 NFC로 통일한다. macOS 파일명과 일부 복사 경로에서 자소가 분리된 NFD 문자열이 유입되는데, NFD `가`와 NFC `가`는 다른 term이라 결과가 0건이 된다. 애플리케이션 normalize 또는 `analysis-icu` plugin의 `icu_normalizer`로 처리한다.
- `icu_normalizer`를 쓸 때 `name`을 `nfc`로 명시한다. 기본값이 `nfkc_cf`라 그대로 두면 호환 자모(`ㄱ`, U+3131)가 조합용 자모(U+1100)로 접혀 아래 초성 감지가 깨진다.
- 전각과 반각, 영문 대소문자, 연속 공백과 앞뒤 공백, 제어 문자를 정리한다.
- 원칙은 검색어에만 적용하는 정규화는 없다는 것이다. 색인은 analyzer가, 검색어는 애플리케이션이 따로 정규화하면 규칙이 드리프트한다. 가능하면 같은 char filter에 태우고, 애플리케이션 정규화가 필요하면 색인 파이프라인과 코드를 공유한다.
- 지우면 안 되는 것도 있다. `C++`, 모델 코드처럼 기호가 의미인 식별자는 정규화 대상이 아니라 [[OpenSearch-Korean-Text-Analysis#사용자 사전, 동의어, 불용어는 목적이 다르다|별도 exact field]] 라우팅 대상이다.

## 오타 교정 계층

한 가지 장치로 풀리지 않고 세 계층이 역할을 나눈다.

| 계층 | 동작 시점 | 특성 |
|---|---|---|
| `match` + `fuzziness` | 검색 실행 중 | 즉석 recall 보강, 오탐과 비용 동반 |
| suggester (did-you-mean) | 결과가 나쁠 때 | 색인 term 기반 제안, 노출 정책 필요 |
| 교정 사전 | 검색 전 치환 | 로그에서 축적, 가장 정확하고 가장 느리게 자란다 |

### Fuzzy의 동작과 한글 함정

- Edit distance는 Damerau-Levenshtein이다 (`transpositions` 기본 true). `fuzziness: AUTO`는 term 길이 2 이하 0, 3에서 5는 1, 6 이상은 2를 허용한다.
- `prefix_length`로 앞 n자를 고정하면 후보 확장이 크게 줄고, `max_expansions` 기본값은 50이다.
- Term-level `fuzzy` query는 검색어를 분석하지 않고, `match`의 `fuzziness`는 분석된 token별로 적용된다.
- 한글 함정: distance가 완성형 음절 단위로 계산된다. 자판 오타인 `홤불`(환불)과 전혀 다른 단어인 `나방`(가방)이 똑같이 거리 1이다. 게다가 한국어 query는 2에서 4음절로 짧아 AUTO에서 거리 0이나 1만 허용되므로, 잘 안 걸리거나 걸리면 오탐이 크다.
- 자모 분해 field가 이 해상도를 올린다. 음절을 초성, 중성, 종성으로 분해한 문자열을 별도 field에 색인하고 그 위에서 distance를 잰다. 두 가지가 달라진다. 첫째, 음절 하나가 통째로 다른 단어가 멀어진다. `가방`과 `책방`은 음절 단위로 1이지만 자모 단위로는 3이라 거리 1 매칭에 더는 걸리지 않는다. 둘째, term이 길어져 AUTO가 허용하는 편집 수가 올라간다. 2음절 검색어는 음절 단위로 거리 0이지만 자모로 펴면 4에서 6자가 되어(받침 유무에 따라 음절당 2자 또는 3자) 1에서 2까지 허용된다.
- 자모 분해가 만능은 아니다. 한 자모만 다른 오타(`환불`과 `홤불`)와 한 자모만 다른 별개 단어(`가방`과 `나방`)는 자모 단위에서도 똑같이 거리 1이다. 거리만으로는 안 갈리므로 term 빈도나 클릭 로그 같은 신호를 함께 본다.
- field와 색인 비용이 추가되므로 제목처럼 오타 교정이 중요한 field에만 적용한다.

### Did-you-mean

- Term suggester는 token 단위로, phrase suggester는 문구 전체를 재구성해 후보를 만든다. Phrase suggester의 `collate`로 실제 결과가 있는 제안만 남긴다.
- 후보의 원천이 색인 term이므로 색인에 없는 표현은 제안할 수 없다.
- 노출 정책이 품질을 결정한다.
  - Zero-hit이고 확신이 높으면 자동 재검색하되 원래 검색어로 되돌리는 링크를 함께 둔다.
  - 결과가 있으면 제안만 표시한다.
  - 자동 재검색은 사전에 없는 신상품명과 고유명사를 기존 단어로 덮어쓸 수 있다. 신규 콘텐츠 유입이 잦은 도메인일수록 보수적으로 잡는다.

### 로그 기반 교정 사전

- Zero-hit 직후 같은 세션에서 검색어를 고쳐 입력하고 클릭까지 이어진 쌍이 교정 후보다.
- 사람 검토를 거쳐 단방향 동의어(`오탈자 => 정식 표기`)나 애플리케이션 치환 테이블로 반영한다. 자동 반영은 하지 않는다. 잘못 학습된 치환은 눈에 안 띄게 검색을 오염시킨다.
- 축적 주기와 우선순위는 [[OpenSearch-Search-Quality-Evaluation#검색 로그에서 개선 백로그까지|로그 백로그 루프]]와 같은 흐름으로 돌린다.

## 초성 검색과 자모 필드

초성 검색은 tokenizer 옵션이 아니라 데이터 모델링이다. 엔진이 자동으로 제공한다고 가정하지 않는다.

- 감지: `^[ㄱ-ㅎ]+$` 같은 규칙으로 호환 자음만으로 이루어진 입력을 초성 query로 판정하고 초성 field로 라우팅한다. 이 구간(U+3131에서 U+314E)에는 초성이 될 수 없는 겹자음(ㄳ, ㄵ)도 섞여 있어 엄밀하게는 초성 19자로 좁힌다.
- 자모 계열이 둘이라는 것이 함정이다. 키보드가 보내는 호환 자모(U+3131 계열)와 조합용 자모(U+1100 계열)는 코드포인트가 다르고, NFC와 NFD는 이 둘을 서로 바꾸지 않는다. NFKC 계열은 호환 자모를 조합용으로 접지만 반대로 접는 정규화 형식은 없다. 그래서 표준 정규화만으로는 통일되지 않는다. 두 계열을 모두 감지 대상에 넣거나, 감지 전에 U+1100 계열을 호환 자모로 접는 매핑을 직접 둔다.
- 자모 field를 만들 때도 같은 함정이 있다. NFD로 음절을 분해하면 U+1100 계열이 나오는데 사용자가 친 초성은 U+3131 계열이라 서로 안 붙는다. 색인과 query가 같은 계열을 쓰도록 분해 코드를 한 곳에서 공유한다.
- 색인: 음절 코드 연산으로 초성 문자열을 추출해 별도 field에 저장한다. `(code - 0xAC00) / 588`이 초성 index다. `김치찌개`는 `ㄱㅊㅉㄱ`가 된다. Prefix 매칭이 필요하면 edge n-gram을 얹는다.
- 자모 field는 초성 field의 확장이다. 타이핑 중간 상태(`김ㅊ` -> `김치`) 매칭과 위의 자모 단위 오타 distance 계산에 함께 쓰인다.
- 비용: field 수와 색인 크기가 늘어난다. 제목, 상품명처럼 짧고 조회가 많은 field에만 적용하고 본문에는 얹지 않는다.
- 자동완성 UX와의 결합은 [[OpenSearch-Search-Features#한국어 자동완성|한국어 자동완성]]의 요구 분리를 따른다.

## 띄어쓰기 변형

- 흔한 오해부터 걷어낸다. Nori는 사전에 없는 복합어를 통째로 남기지 않는다. mecab-ko-dic 위의 형태소 분석기라 구성 형태소가 사전에 있으면 붙여 쓴 문자열도 쪼갠다. `무선키보드`와 `무선 키보드`는 둘 다 `무선`, `키보드`가 되어 실제로 일치한다.
- 그렇다고 항상 일치하지도 않는다. 기본 모드(`discard`)에서도 어긋나며, 자주 밟는 패턴이 아래와 같다. 완전한 목록이 아니라는 점이 중요하다. 어느 단어가 어긋나는지는 사전과 분석 경로에 달렸고 규칙으로 예측되지 않는다.
  - 사전이 단일 명사로 들고 있는 표기는 분해 정보 자체가 없어 세 모드 모두에서 한 token으로 남는다. `짜장면`은 한 token인데 `짜장 면`은 `짜장`, `면`으로 갈린다. `티셔츠`와 `티 셔츠`, `립스틱`과 `립 스틱`도 같다.
  - 복합어 안의 복합어는 한 번만 분해된다. `전기밥솥`은 `전기`, `밥솥`에서 멈추는데 `전기 밥솥`은 `전기`, `밥`, `솥`까지 간다. `손목시계`(`손목`, `시계`)와 `손목 시계`(`손`, `목`, `시계`)도 같다.
  - 분석 경로를 잘못 잡는다. `운동화끈`은 `운동`, `화끈`이 되고 `소고기국`은 `소고`, `기국`이 되어 띄어 쓴 표기와 갈라진다.
  - 깨지는 쪽이 띄어 쓴 표기일 수도 있다. 공백으로 끊긴 조각을 단독으로 분석하면 용언 활용형에 걸린다. `볼펜`은 `볼`, `펜`으로 제대로 가는데 `볼 펜`은 `보`, `ᆯ`, `펜`이 된다(`볼`을 보다의 활용으로 해석). `된장`과 `된 장`, `찬물`과 `찬 물`도 같다. 이 부류는 붙여 쓴 표기를 사전에 등록해도 안 고쳐진다. 붙여 쓴 쪽이 이미 맞기 때문이다.
- `decompound_mode`가 다루는 대상은 복합어만이 아니다. 형태소 단위(MORPHEME)가 아닌 항목을 전부 분해 대상으로 보므로 복합어(COMPOUND)와 함께 활용형(INFLECT)도 들어온다. `none`으로 바꾸면 `김치찌개`가 통째로 남아 `김치 찌개`와 갈리는 데 더해 용언 활용 분해까지 함께 꺼진다. `비쌌다`가 `비쌌`으로 색인돼 `비싸다`와 영영 안 맞는다. 띄어쓰기 하나 때문에 고를 수 있는 옵션이 아니다. 기본값 `discard`에서 `김치찌개`와 `김치 찌개`는 양쪽 다 `김치`, `찌개`라 문제가 없다.
- 띄어쓰기와 별개 문제도 있다. 미등록 복합어는 대개 눈에 띄는 미등록 token으로 남지 않고, 아는 형태소로 억지로 맞춰 그럴듯하게 틀린 분해를 내놓는다(`탕후루`는 `탕`, `후루`). 붙여 쓰든 띄어 쓰든 똑같이 틀리므로 띄어쓰기 불일치가 아니라 분석 품질 문제다. `_analyze` 출력에 UNKNOWN이 없다고 정상인 것이 아니다.
- 그래서 첫 수는 사용자 사전 등록이 아니라 `_analyze`로 두 표기의 token을 찍어 비교하는 것이다. 어긋나는지는 단어마다 다르고 눈으로 예측되지 않는다. token이 입력에 없던 글자일 수도 있다(`자전 거`는 `자전`, `것`). 어긋나지도 않는 단어를 등록하면 없던 문제가 생긴다. 분해 규칙 없이 `무선키보드`만 등록하면 그 표기가 한 token으로 굳어 `무선 키보드`와 갈라진다.
- 등록이 필요하면 분해 규칙을 함께 준다(`무선키보드 무선 키보드`). 단 이 규칙은 `discard`와 `mixed`에서만 의미가 있다. `none`에서는 등록이 그 표기를 복합어 한 덩어리로 만드는데 분해 출력이 꺼져 있어 `무선키보드` 한 token으로 색인된다. 등록 전에는 `none`에서도 `무선`, `키보드`로 갈라졌으니, 고치려던 등록이 없던 불일치를 만드는 셈이다.
- 그다음 수단이 검색어의 공백 제거 변형을 `bool` should로 함께 질의하는 것이고, 그래도 남으면 n-gram 보조 field를 검토한다. 앞 단계일수록 색인 비용이 적다.
- `decompound_mode` 설정은 [[OpenSearch-Korean-Text-Analysis|한국어 텍스트 분석]], 사전 등록과 검증 절차는 [[OpenSearch-Korean-Text-Analysis#사전 변경과 재색인|사전 변경과 재색인]]이 정본이다.

## 필터 의도 파싱

- `10만원 이하 무선 키보드`처럼 가격, 브랜드, 카테고리 같은 구조화 가능한 표현을 감지해 filter로 옮기면 남은 본문 match의 정확도가 오른다.
- 정규식과 사전 매칭 같은 규칙 기반으로 시작한다. 의도 분류 모델은 로그가 충분히 쌓인 뒤의 선택지다.
- Filter로 옮긴 표현을 본문 query에서 뺄지는 실험 대상이다. 빼면 정확도가 오르지만, 그 표현이 본문에도 있는 문서의 신호를 잃는다.

## 검증

쿼리 이해 계층의 변경도 ranking 변경과 같은 회귀 대상이다. 오타, 초성, 띄어쓰기, 식별자 bucket을 [[OpenSearch-Korean-Text-Analysis#품질 개선 루프|품질 개선 루프]]의 query set에 포함하고 같은 judgment로 전후를 비교한다. 교정 자동 재검색은 CTR만이 아니라 원래 검색어로 되돌린 비율을 함께 본다. 되돌림이 많다는 것은 교정이 의도를 덮었다는 신호다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]]
- [[OpenSearch-Korean-Text-Analysis|한국어 텍스트 분석과 사전 운영]]
- [[OpenSearch-Search-Features|자동완성과 검색 기능]]
- [[OpenSearch-Query-Relevance|Query DSL과 관련도]]
- [[OpenSearch-Search-Quality-Evaluation|검색 품질 평가]]
- [[OpenSearch-Search-API-Layer|검색 API 서비스 계층]]

## 출처

- [Fuzzy query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/term/fuzzy/)
- [Match query - OpenSearch Documentation](https://docs.opensearch.org/latest/query-dsl/full-text/match/)
- [Did-you-mean - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/did-you-mean/)
- [Autocomplete - OpenSearch Documentation](https://docs.opensearch.org/latest/search-plugins/searching-data/autocomplete/)
- [ICU normalization character filter - OpenSearch Documentation](https://docs.opensearch.org/latest/analyzers/character-filters/icu-normalization/)
- [Nori tokenizer (analysis-nori) - Elastic Documentation](https://www.elastic.co/docs/reference/elasticsearch/plugins/analysis-nori-tokenizer)
