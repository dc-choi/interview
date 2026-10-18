---
tags: [ai, agent, model, memory, domain-evaluation]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Model Capability Contracts", "Muse Wonder", "GLM-Legal"]
---

# 에이전트 모델의 기억, 장기 작업과 전문 영역 평가

에이전트 모델의 능력은 한 번의 답변 정확도뿐 아니라 기억 검색, 요구사항 유지, 도구 실행과 최종 산출물로 평가한다. 범용 지식, 전문 영역, 기억과 장기 작업을 하나의 순위로 합치면 실패 원인을 놓치기 쉽다.

## 능력별로 다른 완료 조건을 둔다

| 능력 | 확인할 결과 | 잘못된 대체 지표 |
|---|---|---|
| 기억 | 지난 대화의 필요한 사실을 정확히 회수 | 긴 컨텍스트를 지원한다는 스펙 |
| 장기 작업 | 요구사항을 유지하며 장애 뒤 완료 | 오래 실행하거나 많은 토큰을 사용 |
| 전문 지식 | 원문, 적용 규칙과 결론의 연결 | 법률 용어가 자연스러운 문장 |
| 코딩 | 요구사항, 동작과 회귀 검증 통과 | 생성 코드 줄 수 |

기억이 있다는 기능명만으로 저장 위치, 보존 기간과 삭제 범위를 알 수 없다. 장기 실행도 예산, 중단, 재개와 검증 경계가 필요하다.

## Muse Wonder의 Active Memory와 Active Focus

2026-10-16 Meta 공식 발표 대조 기준, 2026-10-12 공개한 Muse Wonder와 Muse Wonder Full은 개인 및 업무 에이전트 작업을 겨냥한다. Active Memory는 대화 사이의 중요한 정보를 유지하고 현재 작업에 필요한 내용을 검색하는 능력, Active Focus는 대안을 시도하며 장애를 해결하고 목표를 이어가는 능력을 설명한다.

공식 발표는 전문 지식과 코딩 작업도 평가하며 Muse Code와 API 제공 범위를 구분한다. 제공 발췌에는 여러 파일의 수정과 반복 테스트, 이미지 기반 3D 게임, 달리기 계획과 좌석 배치 시연이 포함된다. 시연 결과를 모든 업무의 정확도나 사용자별 기억 정책 보장으로 일반화하지 않는다.

실무 평가에서는 대화 간 잘못 저장한 사실을 정정하는지, 오래된 선호를 현재 지시보다 우선하지 않는지, 실패한 도구 호출을 성공으로 보고하지 않는지 확인한다. 계정별 가용성과 실제 호출은 시험하지 않았다.

## GLM-Legal의 전문 후학습과 산출물 평가

2026-10-16 Z.ai 공식 발표 대조 기준, GLM-Legal은 GLM-5.3-Flash를 기반으로 법률 자료의 중간 학습과 업무 환경 후학습을 결합한 모델이다. 계약 조항 수정, 증거 간 모순 분석과 법률 산출물 작성을 대상으로 한다.

공식 소개는 Harvey LAB 전체 통과율 19.2%, 기반 모델 대비 12.5%포인트 개선을 보고하고 Harvey LAB과 LegalBench는 Vals가 독립 평가했다고 안내한다. **전체 통과율 19.2%는 업무를 맡겨도 안전하다는 확률이 아니다.** 제공 발췌의 LegalBench 86.2와 PLawBench 77.3은 이번에 전체 평가표와 직접 대조하지 못한 세부 점수다.

전문 모델 평가는 적용 관할과 기준일, 인용 조문의 존재, 사실과 증거의 대응, 누락한 쟁점 및 최종 형식을 따로 본다. 특정 모델의 출시가 자격을 갖춘 법률 검토를 대신한다는 의미는 아니다. 이 문서는 모델 평가 지식이며 개별 사안의 법률 조언이 아니다.

## 출처

- [Muse Wonder: A Frontier Model For Personal & Professional AI Agents — Meta AI Research](https://research.meta.ai/blog/muse-wonder)
- [GLM-Legal: Advancing Agentic Legal Intelligence — Z.ai](https://z.ai/blog/glm-legal)
- 사용자 제공 GeekNews 발췌: 2026-10-13 Muse Wonder와 GLM-Legal. 미대조 세부 점수와 시연의 한계를 본문에 남겼다.

## 관련 문서

- [[Agent-Memory-Retain-Recall-Reflect|기억 저장과 검색]]
- [[Long-Context-Evaluation|긴 문맥 평가]]
- [[Agent-Runtime-Deployment|런타임과 배포 책임]]
- [[LLM-Eval-Strategy|평가 전략]]
