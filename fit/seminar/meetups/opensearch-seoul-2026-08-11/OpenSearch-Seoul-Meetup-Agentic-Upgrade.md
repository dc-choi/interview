---
tags: [fit, seminar, meetups, opensearch]
status: done
verified_at: 2026-07-16
category: "Seminar - 밋업"
aliases: ["OpenSearch Seoul Meetup Agentic Search와 업그레이드 질문"]
---

# Agentic Search와 업그레이드 심화 질문 2개

> [[OpenSearch-Seoul-Meetup-2026-08-11|전체 질문 한눈에 보기]]
>
> 질문 9~10은 AWS 검색 아키텍트의 발표를 이해하는 체크리스트로 사용하고, 발표에서 다루지 않은 부분만 후속 질문으로 묻는다.

<a id="q9"></a>
## 9. Agentic Search의 도입 경계와 평가를 어떻게 연결하는가

- **우선 대상:** AWS 검색 아키텍트
- **핵심 질문:** 어떤 질의는 lexical이나 hybrid에 남기고 어떤 질의만 agentic으로 보낼지 어떻게 결정하며, DSL 실행 정확도와 최종 relevance는 어떻게 따로 평가하나요?
- **좋은 답의 신호:** query intent별 routing, deterministic fallback, gold query/result set, nDCG/MRR와 failure taxonomy가 나온다.
- **꼬리 질문:** 한국어 또는 도메인 고유어에서는 LLM judgment를 사람 평가와 어떻게 교정하나요?
- **학습 정본:** [[OpenSearch-Search-Features#고급 확장: Agentic query와 memory|Agentic query와 memory]]
- **외부 참고:** [Amazon OpenSearch Service Agentic Search](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/agentic-search.html)

<a id="q10"></a>
## 10. OpenSearch 2.x에서 2.19를 거쳐 3.3 이상으로 안전하게 올라가는가

- **우선 대상:** AWS 검색 아키텍트
- **핵심 질문:** OpenSearch 2.x와 legacy 호환 client를 쓰는 애플리케이션이 먼저 2.19를 거쳐 3.3 이상으로 갈 때 analyzer token, Query DSL, bulk update, error shape와 alias/reindex 계약 중 무엇을 가장 먼저 호환성 테스트해야 하나요?
- **좋은 답의 신호:** 지원 upgrade path, service software update와 engine upgrade의 구분, 호환성 test matrix, 기존 domain 유지 또는 새 domain restore/reindex 경로, least privilege, trace/audit와 kill switch가 나온다.
- **꼬리 질문:** engine downgrade가 불가능한 조건에서 client 교체와 engine upgrade를 어떤 순서로 분리하며, 출시를 막을 guardrail 세 가지는 무엇인가요?
- **학습 정본:** [[OpenSearch-Service|Amazon OpenSearch Service]]

## 출처

- [Agentic search - OpenSearch Documentation](https://docs.opensearch.org/latest/vector-search/ai-search/agentic-search/index/)
- [Agentic search in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/agentic-search.html)
- [Upgrading Amazon OpenSearch Service domains - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/version-migration.html)
- [Service software updates in Amazon OpenSearch Service - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/service-software.html)
- [OpenSearch language clients - OpenSearch Documentation](https://docs.opensearch.org/latest/clients/)
