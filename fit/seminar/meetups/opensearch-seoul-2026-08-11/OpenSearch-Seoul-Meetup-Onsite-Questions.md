---
tags: [fit, seminar, meetups, opensearch]
status: done
verified_at: 2026-07-16
category: "Seminar - 밋업"
aliases: ["OpenSearch Seoul Meetup 현장 질문"]
---

# 현장에서 바로 쓸 질문 3개

> [[OpenSearch-Seoul-Meetup-2026-08-11|전체 질문 한눈에 보기]]
>
> 이 문서의 질문 1~3만 공개 Q&A 후보로 사용한다. 발표에서 이미 답한 질문은 건너뛰고 가장 궁금한 하나만 묻는다.

## 공개 질문 원칙

- 회사명, 도메인명, endpoint, 트래픽, 장애 이력과 고객 데이터는 말하지 않는다.
- 현재 구조를 설명해야 할 때는 "여러 writer가 하나의 파생 검색 문서를 부분 갱신한다"처럼 일반화한다.
- 모르는 내용을 아는 것처럼 전제하지 않고, 검색 시스템을 새로 맡아 공부하는 중이라고 먼저 밝힌다.
- 설계의 정답보다 처음 배울 순서, 실제 운영에서 사용한 지표와 실패 사례를 묻는다.
- 질문은 20초 안에 끝내고, 긴 세부사항은 세션 후 네트워킹에서 이어간다.

## 20초 소개

> 검색 시스템을 새로 맡아 구조와 운영 위험을 공부하는 중입니다. 현재는 제목과 인물명 중심의 검색을 이해하고 있는데, 처음 무엇부터 확인하고 어떤 기준으로 품질과 안정성을 개선해야 하는지 배우고 싶습니다.

<a id="q1"></a>
## 1. 검색 시스템을 처음 맡을 때 무엇부터 확인해야 하는가

- **우선 대상:** 당근 검색서비스 엔지니어
- **핵심 질문:** 검색 시스템을 처음 인수받는 엔지니어라면 코드, 데이터, 운영 지표 가운데 무엇부터 어떤 순서로 확인하는 것이 좋을까요? 가장 먼저 볼 세 가지만 꼽아주실 수 있나요?
- **왜 묻나:** 상세 기술을 모두 이해하기 전에 전체 학습 순서와 우선순위를 잡기 위한 질문이다.
- **좋은 답의 신호:** query와 색인 흐름, mapping/analyzer, 품질 지표, 복구 가능성처럼 서로 다른 영역을 연결한 순서가 나온다.
- **꼬리 질문:** 처음 한 달 동안 하지 않는 편이 좋은 변경도 있을까요?
- **미리 읽기:** [[OpenSearch-Architecture-Map|검색 시스템 개요와 핵심 개념]]

<a id="q2"></a>
## 2. 검색 로그와 골든셋이 없을 때 품질 측정을 어디서 시작해야 하는가

- **우선 대상:** 당근 검색서비스 엔지니어
- **핵심 질문:** 검색 로그와 정답셋이 거의 없는 서비스가 품질 측정을 시작한다면, 어떤 데이터와 지표부터 가장 작게 수집하는 것이 좋을까요?
- **왜 묻나:** 품질 개선 전에 현재 상태를 측정할 최소 기반을 정하기 위한 질문이다.
- **좋은 답의 신호:** query_id, 결과 수, 노출과 클릭, zero-result, 작은 골든셋 가운데 현실적인 첫 단계가 나온다.
- **꼬리 질문:** 첫 한 달에 지표 세 개만 본다면 무엇을 고르시겠어요?
- **미리 읽기:** [[OpenSearch-Search-Quality-Evaluation|검색 기능, 품질과 개선 우선순위]]

<a id="q3"></a>
## 3. 기존 검색이 어느 정도 준비돼야 Agentic Search를 검토할 수 있는가

- **우선 대상:** AWS 검색 아키텍트
- **핵심 질문:** 전통적인 lexical search를 운영하는 팀이 Agentic Search를 검토하기 전에 반드시 갖춰야 할 데이터, 평가와 운영 기반 세 가지는 무엇인가요?
- **왜 묻나:** 새로운 기능의 사용법보다 도입 판단의 선행조건을 이해하기 위한 질문이다.
- **좋은 답의 신호:** 명확한 제품 질의, 기존 검색 baseline, judgment set, 관측성, timeout과 fallback 같은 준비조건이 나온다.
- **꼬리 질문:** 이 기반이 없을 때 POC 결과를 가장 자주 잘못 해석하는 부분은 무엇인가요?
- **학습 정본:** [[OpenSearch-Search-Features#고급 확장: Agentic query와 memory|Agentic query와 memory]]
- **외부 참고:** [Amazon OpenSearch Service Agentic Search](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/agentic-search.html)

## 출처

- [Ranking Evaluation API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/search-apis/rank-eval/)
- [Agentic search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/agentic-search/index/)
- [Agentic search in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/agentic-search.html)
