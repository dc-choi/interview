---
tags: [ai, agent, model, memory, domain-evaluation, approval]
status: done
verified_at: 2026-10-27
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Model Capability Contracts", "Muse Wonder", "GLM-Legal", "Ultramarine 1 Flash", "Claude Duet"]
---

# 에이전트 모델의 기억, 장기 작업, 전문 영역 평가와 승인 경계

에이전트 모델의 능력은 한 번의 답변 정확도뿐 아니라 기억 검색, 요구사항 유지, 도구 실행과 최종 산출물로 평가한다. 사용자를 대신해 행동하는 에이전트는 무엇을 승인받고 무엇을 하지 않는지도 능력 계약의 일부다. 범용 지식, 전문 영역, 기억과 장기 작업을 하나의 순위로 합치면 실패 원인을 놓치기 쉽다.

## 능력별로 다른 완료 조건을 둔다

| 능력 | 확인할 결과 | 잘못된 대체 지표 |
|---|---|---|
| 기억 | 지난 대화의 필요한 사실을 정확히 회수 | 긴 컨텍스트를 지원한다는 스펙 |
| 장기 작업 | 요구사항을 유지하며 장애 뒤 완료 | 오래 실행하거나 많은 토큰을 사용 |
| 전문 지식 | 원문, 적용 규칙과 결론의 연결 | 법률 용어가 자연스러운 문장 |
| 코딩 | 요구사항, 동작과 회귀 검증 통과 | 생성 코드 줄 수 |
| 위임 행동 | 승인한 내용대로만 실행하고 금지 작업은 거부 | 승인 화면이 있다는 기능 설명 |

기억이 있다는 기능명만으로 저장 위치, 보존 기간과 삭제 범위를 알 수 없다. 장기 실행도 예산, 중단, 재개와 검증 경계가 필요하다.

## Muse Wonder의 Active Memory와 Active Focus

2026-10-16 Meta 공식 발표 대조 기준, 2026-10-12 공개한 Muse Wonder와 Muse Wonder Full은 개인 및 업무 에이전트 작업을 겨냥한다. Active Memory는 대화 사이의 중요한 정보를 유지하고 현재 작업에 필요한 내용을 검색하는 능력, Active Focus는 대안을 시도하며 장애를 해결하고 목표를 이어가는 능력을 설명한다.

공식 발표는 전문 지식과 코딩 작업도 평가하며 Muse Code와 API 제공 범위를 구분한다. 제공 발췌에는 여러 파일의 수정과 반복 테스트, 이미지 기반 3D 게임, 달리기 계획과 좌석 배치 시연이 포함된다. 시연 결과를 모든 업무의 정확도나 사용자별 기억 정책 보장으로 일반화하지 않는다.

실무 평가에서는 대화 간 잘못 저장한 사실을 정정하는지, 오래된 선호를 현재 지시보다 우선하지 않는지, 실패한 도구 호출을 성공으로 보고하지 않는지 확인한다. 계정별 가용성과 실제 호출은 시험하지 않았다.

## GLM-Legal의 전문 후학습과 산출물 평가

2026-10-16 Z.ai 공식 발표 대조 기준, GLM-Legal은 GLM-5.3-Flash를 기반으로 법률 자료의 중간 학습과 업무 환경 후학습을 결합한 모델이다. 계약 조항 수정, 증거 간 모순 분석과 법률 산출물 작성을 대상으로 한다.

공식 소개는 Harvey LAB 전체 통과율 19.2%, 기반 모델 대비 12.5%포인트 개선을 보고하고 Harvey LAB과 LegalBench는 Vals가 독립 평가했다고 안내한다. **전체 통과율 19.2%는 업무를 맡겨도 안전하다는 확률이 아니다.** 제공 발췌의 LegalBench 86.2와 PLawBench 77.3은 이번에 전체 평가표와 직접 대조하지 못한 세부 점수다.

전문 모델 평가는 적용 관할과 기준일, 인용 조문의 존재, 사실과 증거의 대응, 누락한 쟁점 및 최종 형식을 따로 본다. 특정 모델의 출시가 자격을 갖춘 법률 검토를 대신한다는 의미는 아니다. 이 문서는 모델 평가 지식이며 개별 사안의 법률 조언이 아니다.

## Ultramarine 1 Flash: 같은 기반 모델의 업무 산출물 후학습

2026-10-27 Paper Instruments 공식 페이지와 기술 보고서(2026-10-14) 대조 기준이다. Ultramarine 1 Flash는 GLM-5.3 Flash에 대규모 강화학습을 적용해 금융, 법률, 컨설팅, 운영 업무의 완성 산출물을 겨냥한 모델이다. 위 GLM-Legal과 같은 기반 모델에서 출발한 전문 영역 후학습 사례다.

- **학습 환경**: 4개 영역(금융 34, 법률 15, 컨설팅 28, 운영 11)의 88개 환경 유형과 19개 실무 분야에서, 과제마다 이진 기준 루브릭으로 채점했다. 수정한 CISPO 목적함수와 LoRA rank 64를 썼고, 학습과 내부 벤치마크 평가를 모두 자사 Feather 하네스(읽기, 편집, 쓰기, grep, glob, bash, todo 도구)에서 실행했다.
- **평가**: 내부 벤치마크 PI Knowledge Work는 Excel, PowerPoint, Word 완성본과 ERP, MES 같은 업무 시스템 안의 작업을 요구하고, 과제별 루브릭을 GPT-5.6 Terra가 채점한다. 기반 모델 대비 6개 벤치마크에서 평균 4.1점 개선(PI Knowledge Work 52.0에서 59.3, JobBench 56.3에서 62.9 등)과 출력 토큰 6.5% 감소를 보고한다.
- **스스로 밝힌 한계**: 여러 하네스에서의 학습은 연산 예산상 하지 못했고, 실제 운영 기록(production trace)과 시각 입력으로는 학습하지 않았다.

산출물 평가는 파일이 열리는지에서 끝나지 않는다. 수식과 참조의 정확성, 숫자의 출처, 서식 규칙과 업무 시스템 작업의 부작용을 따로 채점한다(평가 설계 제안). 내부 벤치마크, LLM 채점자와 비교 대상 선택의 문제, API 가격과 가중치 공개 상태는 [[Model-Release-Claims#자체 보고 점수는 비교 대상, 채점자와 독립성을 본다|모델 발표 수치 읽기]]에서 다룬다.

## Claude Duet: 개인 에이전트의 승인 경계

2026-10-27 Anthropic 공식 소개(2026-10-21)와 안전, 개인정보, 보안 문서 대조 기준이다. Claude Duet은 Claude Opus 5.5 기반의 연구 프리뷰 개인 에이전트이며, 미국 Pro와 Max 구독자부터 대기 명단으로 열었다. iOS, Android 앱과 claude.ai에서 쓴다. 계정별 가용성과 실제 동작은 이 문서에서 시험하지 않았다.

- **상시 실행**: 자체 가상 머신과 브라우저에서 돌아 사용자의 노트북이나 휴대폰이 꺼져 있어도 작업을 이어간다. 아침마다 연결 앱의 요약을 보내고 몇 시간마다 연결 계정을 확인해 처리가 필요할 때만 연락한다. 이 백그라운드 확인도 플랜 사용 한도에 들어간다.
- **승인 경계**: 메시지 전송, 결제, 문서 서명, 삭제 전에는 실행할 내용을 그대로 보여 주고 승인을 기다린다. 증권 거래와 계좌 간 이체처럼 승인해도 하지 않는 작업이 있고, 결제와 송금, 주문 삭제, 계정 생성은 다시 묻지 않기 규칙의 대상이 될 수 없다.
- **자격 증명과 검사의 위치**: 에이전트는 비밀번호, 쿠키와 로그인 토큰을 보지 못하고 기억에 저장할 수 없다. 연결 서비스에는 자리표시 값으로 요청하고, 에이전트 밖의 프록시가 실제 자격 증명을 넣는다. 행동이 사용자 의도와 맞는지 보는 자동 검사는 작업 모델 밖에서 돌아 페이지에 숨긴 지시가 판정에 영향을 주지 못하게 한다고 설명한다. 페이지 본문과 내려받은 파일은 여전히 에이전트에 들어가므로 다른 검사도 함께 필요하다고 밝힌다.
- **기억과 삭제**: 대화 기록과 기억은 사용자가 지우거나 기억을 재설정할 때까지 남는다. 앱 연결을 끊으면 새 접근은 멈추지만 이미 배운 정보는 기억을 재설정할 때까지 남는다.
- **스스로 밝힌 한계**: 대화 흐름이나 긴급도를 잘못 판단할 수 있고, 티켓 예약 같은 개인 심부름은 업무보다 약하며, 작업 중인 브라우저 화면을 보여 주지 못한다.

평가에서는 승인 화면의 내용과 실제 실행이 같은지, 금지 작업을 다른 경로로 우회하지 않는지, 연결을 끊은 앱의 정보가 기억에 남는 범위가 사용자 안내와 같은지를 시험한다(평가 제안). 승인 화면과 결정적 집행의 일반 원칙은 [[LLM-Application-Security|LLM 애플리케이션 보안]]의 LLM01 완화 절과 같다.

## 출처

- [Muse Wonder: A Frontier Model For Personal & Professional AI Agents — Meta AI Research](https://research.meta.ai/blog/muse-wonder)
- [GLM-Legal: Advancing Agentic Legal Intelligence — Z.ai](https://z.ai/blog/glm-legal)
- 사용자 제공 GeekNews 발췌: 2026-10-13 Muse Wonder와 GLM-Legal. 미대조 세부 점수와 시연의 한계를 본문에 남겼다.
- [Ultramarine — Paper Instruments](https://www.paperinstruments.com/ultramarine) — 2026-10-27 열람, 차트, 가격과 가중치 공개 표시
- [Ultramarine 1 Flash technical report — Paper Instruments](https://www.paperinstruments.com/blog/ultramarine) — 2026-10-14, 학습 환경, 판정 모델, 기반 모델 대비 점수와 한계
- [Introducing Claude Duet — Anthropic](https://claude.com/resources/articles/claude-duet) — 2026-10-21, 기능, 승인 경계, 제공 범위와 한계
- [Claude Duet Safety, Privacy, and Security — Anthropic](https://claude.com/resources/articles/claude-duet-safety-privacy-and-security) — 실행 격리, 자격 증명 처리, 금지 작업, 기억 보존
- 사용자 제공 GeekNews 알림(2026-10-16~10-27): Ultramarine 1 Flash, Claude Duet. 학습 계기이며 내용은 위 공식 자료로 대조했다.

## 관련 문서

- [[Agent-Memory-Retain-Recall-Reflect|기억 저장과 검색]]
- [[Long-Context-Evaluation|긴 문맥 평가]]
- [[Agent-Runtime-Deployment|런타임과 배포 책임]]
- [[LLM-Eval-Strategy|평가 전략]]
- [[Model-Release-Claims|모델 발표 수치 읽기]] — 자체 벤치마크와 LLM 채점자
- [[LLM-Application-Security|LLM 애플리케이션 보안]] — 승인 화면과 결정적 집행
