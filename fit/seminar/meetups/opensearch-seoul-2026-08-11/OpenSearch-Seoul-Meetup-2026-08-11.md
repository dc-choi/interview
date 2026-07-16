---
tags: [fit, seminar, meetups, opensearch]
status: index
verified_at: 2026-07-16
category: "Seminar - 밋업"
aliases: ["OpenSearch Seoul Meetup 2026-08-11", "OpenSearch Project Seoul Meetup 질문 준비"]
---

# OpenSearch Project Seoul Meetup 질문 준비

> 행사: [OpenSearch Project - Seoul Meetup](https://www.meetup.com/ko-kr/opensearch-project-seoul/events/315527765/)
> 성격: 개인 학습과 Meetup 준비 자료.
> 일시: 2026-08-11 19:00~21:00 KST
> 장소: 센터필드 EAST 18층
> 확인 시점: 2026-07-16. 두 발표의 세부 내용은 아직 `Update 예정`이므로 행사 일주일 전에 다시 확인한다.
> 발표: 당근 검색서비스 엔지니어의 검색 서비스 101 / AWS 검색 아키텍트의 Agentic Search
> 목적: 검색 시스템을 새로 맡아 배우는 단계에서 기초 방향을 잡고, 공부가 더 된 뒤 현재 설계의 판단 기준을 검증할 질문까지 준비한다.

## 한 줄 전략

현장에서는 앞의 입문 질문 3개만 사용한다. 뒤의 심화 질문 7개는 발표를 이해하는 체크리스트로 쓰고, 관련 내용을 공부했거나 대화가 자연스럽게 이어질 때만 꺼낸다.

## 질문 한눈에 보기

| 구분 | 번호 | 질문 주제 | 우선 대상 |
|---|---:|---|---|
| 현장 | 1 | [검색 시스템을 처음 맡을 때 확인할 순서](OpenSearch-Seoul-Meetup-Onsite-Questions.md#q1) | 당근 검색서비스 엔지니어 |
| 현장 | 2 | [로그와 골든셋 없이 품질 측정을 시작하는 법](OpenSearch-Seoul-Meetup-Onsite-Questions.md#q2) | 당근 검색서비스 엔지니어 |
| 현장 | 3 | [Agentic Search 검토 전 필요한 기반](OpenSearch-Seoul-Meetup-Onsite-Questions.md#q3) | AWS 검색 아키텍트 |
| 심화 | 4 | [여러 writer의 부분 갱신 정합성](OpenSearch-Seoul-Meetup-Search-Quality-Operations.md#q4) | 두 발표자 |
| 심화 | 5 | [OpenSearch 장애 전파 방지](OpenSearch-Seoul-Meetup-Search-Quality-Operations.md#q5) | 두 발표자 |
| 심화 | 6 | [한국어 analyzer 변경 회귀 검증](OpenSearch-Seoul-Meetup-Search-Quality-Operations.md#q6) | 당근 검색서비스 엔지니어 |
| 심화 | 7 | [인기 신호와 텍스트 관련도의 균형](OpenSearch-Seoul-Meetup-Search-Quality-Operations.md#q7) | 당근 검색서비스 엔지니어 |
| 심화 | 8 | [무중단 rebuild와 rollback 경계](OpenSearch-Seoul-Meetup-Search-Quality-Operations.md#q8) | 두 발표자 |
| 심화 | 9 | [Agentic Search 도입 경계와 평가](OpenSearch-Seoul-Meetup-Agentic-Upgrade.md#q9) | AWS 검색 아키텍트 |
| 심화 | 10 | [OpenSearch 2.x에서 2.19를 거쳐 3.3 이상으로 업그레이드](OpenSearch-Seoul-Meetup-Agentic-Upgrade.md#q10) | AWS 검색 아키텍트 |

## 문서 구성

- [[OpenSearch-Seoul-Meetup-Onsite-Questions|현장에서 바로 쓸 질문 3개]]: 공개 질문 원칙, 20초 소개, 핵심 질문과 꼬리 질문
- [[OpenSearch-Seoul-Meetup-Search-Quality-Operations|검색 품질과 운영 심화 질문 5개]]: 정합성, 장애 격리, analyzer, 랭킹, rebuild와 rollback
- [[OpenSearch-Seoul-Meetup-Agentic-Upgrade|Agentic Search와 업그레이드 질문 2개]]: 도입 경계, 평가, 버전 업그레이드와 guardrail
- [[OpenSearch-Seoul-Meetup-Preparation-Notes|행사 전 준비와 답변 기록]]: 최소 준비 체크리스트와 현장 기록 양식

## 추천 사용 순서

1. 행사 전에는 이 표에서 질문 1~3만 고른다.
2. [[OpenSearch-Seoul-Meetup-Onsite-Questions|현장 질문 문서]]에서 질문 문장과 꼬리 질문을 휴대폰 메모로 옮긴다.
3. 공부할 때는 심화 문서 두 개를 발표 주제에 맞춰 참고한다.
4. 행사 당일에는 [[OpenSearch-Seoul-Meetup-Preparation-Notes|준비와 기록 문서]]를 체크리스트로 쓴다.
