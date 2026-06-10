---
tags: [fit, interview, yunhoe]
status: index
category: "Interview - Fit"
company: "윤회주식회사 (CARE IDⓒ)"
aliases: ["Yunhoe 1st Interview Prep", "윤회 1차 본 미팅 준비", "CARE ID 1st"]
---

# 윤회주식회사(CARE IDⓒ) 1차 본 미팅 준비 — 목차

> 면접일: 2026-05-20(수) 14:00 / 서울창업허브성수 207호 대면
> 면접관: **대표 직접** (5/15 24분 전화 완료, 본 미팅 진행 시사)
> 포지션: **백엔드 리드** (CTO 별도 모실 계획, 채용 직책은 CTO 아님)
> 채용 공고: https://groupby.kr/positions/9600
> 템플릿: [[Interview-Prep-Template|면접 준비 템플릿]]

## 본 미팅의 위치

- 5/15 통화는 스크리닝 + 도메인 이해 + 페르소나 1차 검증 — **이미 통과 신호** (24분 통화, 종료 멘트에서 본 미팅 시사)
- 이번 자리는 **"고용 결정의 본 회의"** — 양쪽이 서로 fit, 조건, 리스크를 정밀하게 측정하는 자리
- 대표 직접 면접이므로 **개발 디테일보다 사업, 도메인, 리딩 마인드, 운영 사고**가 더 깊게 들어올 가능성 高
- 동시에 본인은 **재무, 인력 리스크 4축**을 반드시 확인 (매출 가시성, 런웨이, 연봉 밴드, 턴오버 사유)

## 하위 문서

- [[Interview-Prep-Yunhoe-1st-FIT|JD 매칭 & FIT 답변 (시솔지주 옵션 B, 왜 백엔드, 잦은 이직, 공백기, 실패 사례)]]
- [[Interview-Prep-Yunhoe-1st-Tech|예상 기술 질문 — 메인 (도메인 매핑 깊이, 10개)]]
- [[Interview-Prep-Yunhoe-1st-Tech-Extra|예상 기술 질문 — 보강 (범용 백엔드 안전망, 10개 영역 30+개)]]
- [[Interview-Prep-Yunhoe-1st-Lead-Questions|백엔드 리드, 컬처핏, **AI 도구 깊이**(★ 6개월 책임 영역), **워라밸 강도**, 역질문, 체크리스트]]
- [[Interview-Prep-Yunhoe-1st-Cheatsheet|🔥 30분 훑기용 치트시트 (면접 직전)]]

## 마스터 답변 참조

- [[My-Self-Intro|자기소개 마스터]] (회사 매핑 끝줄: "CARE ID의 DPP는 물리적 사물과 디지털 데이터를 잇는 일이라 본질이 같다")
- [[My-Motivation-Reasons|이직 사유 마스터]] (시솔 옵션 B + 잦은 이직, 공백기 꼬리)
- [[My-Tech-Cards|기술 카드 마스터 8개]] (이 자리 강조: 카드 1 DB Lock, 카드 2 EventBridge+SQS, 카드 5 Grafana, 카드 6 Docker/ECS), [[My-Tech-Cards-Extended|기술 심화]]
- [[My-FIT-Answers|FIT 답변 마스터 12개]] (왜 백엔드, 5년 후, 갈등, 소통, **AI 도구 깊이**, **워라밸 강도**, 실패), [[My-FIT-Answers-Extended|보조 11개]]
- [[My-Reverse-Questions|역질문 마스터]] (이 자리 우선: A1, A2, A3, A4 재무, B2 CTO R&R)

## prep/ 가이드 정렬 체크 (회사별 fork시 누락 위험 → 본 섹션으로 구조화)

- [[Self-Analysis|WHY 시드]] — 본인 욕구(주도성, 성장, 가치) → "왜 백엔드", "왜 DPP" 근거. 시솔 옵션 B의 자기 학습 근거
- [[Developer-Interview-13-Questions|13Q 의도]] — 단골 질문 의도 (특히 #4 동기, #6 실패, #11 왜 이 회사)
- [[Developer-Interview-Signals|시그널]] — "함께 일하고 싶은 사람" 신호 (모르면 모른다, 약점 솔직, 팀/개인 기여 분리)
- [[Sensitive-Question-Answers|민감 질문 치환]] — #1 잦은 이직, #2 공백기, **#7 워라밸 (부정 단어 본인이 먼저 X)**
- [[FIT-Framework|메타 가이드]] — 대표 직접 면접 톤, 역질문 마이크 넘기기, "장기적 함께"의 결

## 5/15 통화에서 검증된 어필 카드 4장 (본 미팅에서도 재활용)

| 카드 | 5/15 반응 | 본 미팅에서의 활용 |
|---|---|---|
| 1. 보안 (보안학과, FIDO/패스키) | 대표가 ISMS-P까지 파고듦 → 보안 중요 시그널 | DPP의 진위 검증, 위변조 방지, 공급망 추적은 본질적으로 보안 도메인. CARE ID에 적합 |
| 2. 물류, VMI 도메인 (식품→제약, 부자재) | 대표가 "어쩌다 물류?"까지 파고들 만큼 정확한 어필 | DPP도 결국 **물리적 사물 ↔ 디지털 데이터** 추적. VMI에서 풀던 정합성, 이벤트 흐름과 동형 |
| 3. 자동화 리포트 (IoT 집계 → 알림톡/이메일, 채널별 DLQ) | 신선한 반응 | DPP 발급, 상태 변경 이벤트 → 브랜드사, 재활용업체, 소비자 알림이 그대로 매핑 |
| 4. Claude Code 하네스, AI 협업 파이프라인 | 대표 "아직 적용 안 함, 솔루션 안정 후 채울 계획" → **명확한 공백 인정** | **입사 후 6개월 책임 영역**으로 직접 제안 가능 (계층형 CLAUDE.md, Subagent, Stop Hook 자가 리뷰, 실DB 통합테스트) |

## 핵심 리스크 (본 미팅 의사결정용)

- **재무 fit** (가장 큰 미해결): 매출 9.5억, 평균연봉 3,262만, 1년 9명 퇴사 → Series-A 클로징과 매출 가시성이 *생존선*
- **합격하더라도** 처우 협의에서 시장가, 사이닝, 옵션 비중을 따져야 함. "이 회사에 가고 싶다"가 곧 "어떤 조건이든 OK"는 아님

## 관련 문서

- [[Interview-Prep-Yunhoe-CoffeeChat-Questions|커피챗 질문지 (원본)]]
- [[Interview-Prep-Yunhoe-CoffeeChat-Retro|1차 전화 회고 (26.05.15)]]
- [[Interview-Prep-Yunhoe-Domain|도메인 브리프 (DPP, ESPR, 순환경제)]]
- [[My-Motivation-Reasons|FIT 이직 사유 답변 원칙]]
- [[Salary-Negotiation-Guide|연봉 협상 가이드]]
