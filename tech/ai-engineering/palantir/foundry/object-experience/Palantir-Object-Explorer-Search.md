---
tags: [palantir, foundry, ontology]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Object Explorer 검색의 범위와 토큰 계약

Object Explorer는 Ontology discovery, property/link filter와 개별 Object View의 진입점이다. Global search는 객체 외 type, property metadata와 saved artifact도 찾지만 discoverable type이 250개를 넘으면 처음 250개로 keyword 범위가 제한된다. 필요한 type/group으로 좁혀 조회한다. All results는 category별 sample이고 해당 category를 열어 더 확인한다. Hidden은 UI 표시 규칙이며 데이터 보안 정책이 아니다.

## 검색 위치에 따른 차이

Global의 여러 단어 기본 연결은 OR다. 명시적인 AND/OR/NOT와 괄호, 인용구 phrase, trailing wildcard와 fuzzy ~를 사용할 수 있다. Property keyword의 기본 Contains는 모든 token을 요구한다. Starts with는 전체 문자열의 prefix가 아니라 token prefix일 수 있다. Phrase와 whole-value exact를 구분한다. Filter 문서는 Exact를 phrase로 설명하지만 text-search 표는 whole value로 설명해 상충한다. 사용 화면과 API의 실제 query를 확인해야 한다.

Standard analyzer는 lowercase token, Simple은 문자만 token, Not analyzed는 전체값 하나, Whitespace는 공백만 분할하고 case 유지, Language는 언어별 stemming/stopword를 처리한다. Searchable render hint가 필요하다. 원문은 underscore/period가 token 안에 남는다고 설명하며 banana_pudding에서 banana만 찾으면 실패할 수 있다. Whitespace analyzer도 underscore를 분리하지 않으므로 이것만 바꿔 해결된다고 판단하지 않는다.

Wildcard query는 analyzer를 거치지 않아 indexed lowercase와 query case가 다르면 실패한다. 여러 단어 wildcard도 단일 token과 비교해 맞지 않는다. *term*은 미지원이다. Leading wildcard는 search-syntax 페이지의 광범위한 설명과 달리 상세 text-search 문서에서 global 미지원, property+Searchable+Enable leading wildcards만 지원한다고 좁힌다. 해당 설정의 OSv1 reindex 지침도 legacy 범위로 구분한다.

Workshop Filter List는 All/Any/Exact/Advanced/Regex가 있고 각 의미가 다르다. Object-set filter CONTAIN은 prefix-only다. TSv1 Functions exactMatch/phrase/phrasePrefix/prefixOnLastToken/matchAnyToken/matchAllTokens/fuzzy 계열을 UI 이름만으로 동일시하지 않는다. Text-search 표의 property wildcard/phrase 미지원 표시는 다른 본문과 일부 충돌하므로 API/버전별 작은 입력으로 검증한다.

## 출처

- [Palantir, object-explorer](https://www.palantir.com/docs/foundry/object-explorer)
- [Palantir, filter-results](https://www.palantir.com/docs/foundry/object-explorer/filter-results)
- [Palantir, getting-started](https://www.palantir.com/docs/foundry/object-explorer/getting-started)
- [Palantir, overview](https://www.palantir.com/docs/foundry/object-explorer/overview)
- [Palantir, search-objects](https://www.palantir.com/docs/foundry/object-explorer/search-objects)
- [Palantir, search-syntax](https://www.palantir.com/docs/foundry/object-explorer/search-syntax)
- [Palantir, understanding-text-search](https://www.palantir.com/docs/foundry/object-explorer/understanding-text-search)

## 관련 문서

- [[Palantir-Object-Workflows]]
- [[Palantir-Ontology-Object-Model]]
