---
tags: [ai, agent, architecture, delegation, hitl]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Delegation", "Closure-loop 위임 경계"]
---

# 프로덕션 에이전트 아키텍처: Closure-loop 위임 경계와 자율권

사람과 에이전트의 담당 경계, 승인과 실행 권한과 감사 기록의 구분, 작업별 증거로 넓히고 다시 줄이는 자율권과 무엇을 맡길지 정하는 사고 도구를 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## Closure-loop: 위임 경계

반복적 워크플로우는 에이전트에 **완전 위임**하고, 사람은 정의, 정책, 신규 에이전트 개발에 집중한다.

| 사람 담당 | 에이전트 담당 |
|---|---|
| 신규 지표 설계 | 기존 지표 추출, 조합 |
| 정책 의사결정 | 정책 적용 |
| 새 에이전트, 워크플로우 개발 | 기존 워크플로우 실행 |

이 문서에서 Human-in-the-loop은 사람의 실행 검토를 포함하고, Closure-loop은 사전에 정한 위임 범위 안에서 실행을 닫힌 루프로 맡기는 운영 구분이다.

사람의 승인은 실행 권한과 감사 기록을 대신하지 않는다. 운영 설계에서는 승인 화면에 실제 작업 내용을 보여 주고, 실행 자격증명의 접근 범위를 제한하며, 호출한 API와 입력, 응답을 추적하는 세 통제를 함께 점검한다. 승인받은 작업이 실행에 실패할 수 있으므로 승인 여부와 실행 결과도 구분한다.

Mindflow AI Rooms의 공개 제품 설명은 중요한 작업의 실행 전 승인, 제공한 자격증명에서 상속한 접근권, API endpoint와 입력 및 응답의 감사 기록을 각각 제시한다(2026-10-10 확인). 이는 세 통제를 구분하는 사례이며 모든 행동에 승인이 강제되거나 권한 우회가 불가능하다는 실증은 아니다. 실제 도입에서는 승인 없이 실행 가능한 범위와 감사 기록의 민감정보 처리를 별도로 확인한다.

### 자율권은 작업별 증거로 넓히고 다시 줄인다

2026-10-10 AWS의 공개 보안 원칙과 대조한 운영 기준이다. 에이전트의 제안, 사람의 승인 또는 거절, 실제 실행 결과를 함께 기록한다. 같은 유형의 작업에서 이 세 결과가 지속적으로 맞는지 평가한 뒤 사전 승인에서 사후 검토로 전환할 수 있다. 한 업무에서 얻은 신뢰를 관련 없는 업무의 실행 권한으로 확대하지 않는다.

자율권 확대는 단방향 승격이 아니다. 모델, 프롬프트, 도구와 데이터가 바뀌면 행동을 다시 평가하고, 근거가 악화되면 사람의 감독을 복원한다. 저위험 작업까지 모두 승인 대상으로 만들어 검토가 형식적인 클릭으로 바뀌지 않도록 하되, 허용할 수 없는 결과를 막는 외부 권한 경계는 유지한다.

정책 검사와 행동 차단도 구분한다. Bedrock Automated Reasoning은 검사 결과를 반환하는 detect mode이며 후속 차단은 애플리케이션 책임이다. 정책 변수로 표현되지 않은 내용까지 검증됐다고 보지 않는다. 구체적인 검사 범위와 API 실행 확인은 [[LLM-Hallucination-Verification#Bedrock의 근거 검사와 정책 검증|정책 검증]]을 따른다. 이 절은 운영 설계 기준이며 실제 서비스의 자율 실행 안전성을 시험한 결과는 아니다.

### 무엇을 맡기고 얼마나 풀어 줄지 정하는 사고 도구

자동화 범위, 자율권과 검증 대상을 정할 때 익숙한 사고 모형을 확률적인 실행자에 다시 적용할 수 있다. 아래 표는 15개 모형을 다섯 결정으로 묶은 2026-10-19 Product Mindset 뉴스레터의 틀을 위임 설계의 질문으로 옮긴 것이다. 수치는 원 출처를 확인한 것만 남겼고, 나머지 서술은 판단을 돕는 틀이지 실증 결과가 아니다.

| 결정 | 모형 | 위임 설계의 질문 |
|---|---|---|
| 경제성 | 제번스 역설 | 지능 단가가 내려가면 절감보다 사용량과 제품 범위가 늘어난다. 예산을 비용 절감이 아니라 사용량 증가로 잡았는가 |
| 경제성 | 해결한 작업당 비용 | 토큰 단가가 아니라 허용 기준 안에서 끝낸 결과로 센다. 같은 작업 묶음을 후보 모델에 돌려 성공한 결과의 비용을 비교했는가 |
| 경제성 | 자동화 경계선 | 작업 비용이 작업 가치보다 낮아지면 자동화할 이유가 생기고, 모델이 바뀔 때마다 경계가 움직인다. 자동화 범위를 정기적으로 다시 보는가 |
| 명세 | 들쭉날쭉한 능력 경계 | 데모의 최고점이 아니라 자사 작업과 시험으로 실패 지점을 찾았는가 |
| 명세 | 오류의 누적 | 모든 단계의 성공이 필요하고 앞선 단계가 모두 성공했다는 조건에서 각 단계의 성공률이 95%라면, 전체 성공률은 10단계 약 60%, 30단계 약 21%다. 개별 단계 성공률을 그대로 곱하려면 독립성 가정이 필요하다. 사슬을 줄이고 체크포인트와 병렬화를 넣었는가 |
| 명세 | 평가가 곧 명세 | 확률적 기능은 수용 가능한 답, 적절한 실패와 금지 행동의 비율, 응답 유보 규칙으로 정의한다. 평가 묶음을 쓸 수 없다면 기능을 아직 이해하지 못한 것이다 |
| 신뢰 | 자율성 다이얼 | 자율은 제안, 초안, 승인 후 실행, 실행 후 보고로 이어지는 연속선이다. 워크플로와 사용자군마다 단계를 정하고 증거로 조정하는가 |
| 신뢰 | 일방향 문과 양방향 문 | 읽기, 요약과 초안은 되돌릴 수 있고 지출, 발송, 삭제와 게시는 되돌리기 어렵다. 호출 가능한 도구마다 문 유형을 붙였는가 |
| 신뢰 | 굿하트의 법칙 | 해결률을 최적화하게 하면 티켓 종료를 배운다. 평가 묶음도 공략 대상이므로 가장 빠른 시스템이 이 지표를 어떻게 속일지 출시 전에 물었는가 |
| 남는 가치 | 차세대 모델 테스트 | 기반 모델이 열 배 좋아지면 제품이 더 좋아지는가, 필요 없어지는가 |
| 남는 가치 | 데이터 플라이휠 | 평가셋, 실패 기록과 사람의 수정 이력처럼 제품만 만드는 자료를 배포마다 남기는가 |
| 남는 가치 | 쓴 교훈 | 다음 모델이 쓸모없게 만들 정교한 프롬프트와 고정 흐름에 과투자하지 않았는가 |
| 사람 | 제약 이론 | 처리량은 생성이 아니라 결정, 검토와 검증이 정한다. 검토 구조를 바꾸지 않은 채 생성량만 늘리지 않았는가 |
| 사람 | 위임할 일 | 사용자가 없애고 싶은 일과 직접 하고 싶은 일을 나눴는가 |
| 사람 | 안목 | 선택지 열 개를 만드는 비용은 낮고, 아홉 개를 근거 있게 버리는 판단이 일이다 |

실패한 실행도 비용을 쓰므로 단위 비용은 성공 작업당 원가(전체 실행 비용 ÷ 성공한 작업 수)로 본다. 한 번에 1,000원이 들고 성공률이 80%면 성공 작업 하나에 1,250원이다. 성공한 실행만 골라 세면 장부가 좋아 보일 뿐이다. 작업 길이도 성공률을 바꾼다. METR의 2025-03-19 측정에서 당시 모델은 사람이 4분 안에 끝내는 과제를 거의 100% 성공했지만 약 4시간 넘는 과제는 10% 미만이었다. 같은 연구에서 사람 전문가의 수행 시간으로 잰 50% 성공 기준 작업 길이는 2019년 이후 약 7개월마다 두 배가 됐다. 측정 당시 기준이므로 이후 모델에 수치를 그대로 쓰지 않는다. 후속 Time Horizon 1.1의 추세와 측정 한계는 [[AI-Capability-and-Cost-Trends#5. 긴 소프트웨어 과제 수행 능력의 추세|긴 과제 수행 능력의 추세]]를 따른다. 자율성 다이얼과 문 유형은 위 절의 확대, 축소 원칙과 같은 방향이며, 사람에게 올릴 범위를 좁혀 승인이 형식화되지 않게 하는 방법은 [[Harness-Gate-Placement#사람 승인과 실질적인 검토를 구분한다|게이트 배치]]를 따른다.

## 업무 단계와 검토 경계를 나눈다

여러 단계의 업무 전체를 한꺼번에 에이전트로 바꾸기보다, 정보 수집, 판단 제안, 승인, 실행을 나누고 각 단계의 권한을 정한다. 2026-10-18 AWS의 보안 원칙과 대조한 설계 예시다.

- 정형 조건은 코드로 검사하고, 에이전트는 문서 해석이나 예외 설명처럼 판단이 필요한 부분을 맡긴다. 에이전트의 제안을 실행 허용 판정과 같은 값으로 쓰지 않는다.
- 금액 임계값만으로 자동 실행을 허용하지 않는다. 운영 데이터 변경, 외부 정보 전달과 되돌릴 수 없는 효과도 함께 평가해 사람 검토로 보낼 범위를 정한다.
- 사람에게 넘길 때는 제안, 실행 대상과 입력, 근거와 미확인 사항을 함께 보여준다. 검토 뒤의 실행 성공이나 실패도 별도로 기록한다.

이는 일반적인 업무 분해 제안이다. 특정 산업의 자동 심사 허용 범위나 규제 준수를 확인한 절차가 아니며, 사람 검토를 다른 에이전트로 대체한 것만으로 같은 통제 수준을 얻었다고 판단하지 않는다.

## 문서 연동에서도 읽기와 변경 권한을 나눈다

문서 시스템을 MCP로 연결할 때는 서버 연결 성공, 사용자의 문서 접근권과 상태 변경 권한을 따로 확인한다. 검색과 요약을 맡겼다는 사실만으로 문서 생성이나 업무 완료 처리까지 위임된 것으로 해석하지 않는다.

2026-10-22 STP.Documents 공식 문서는 문서 목록, 검색과 읽기 외에 `stp_doc_create_document`와 `stp_doconprem_complete_task`도 제공한다고 설명한다. 같은 서버가 읽기와 변경 도구를 함께 노출할 수 있는 사례다. OAuth resource indicator로 서버 대상 scope를 제한하고, `doc3.mcp4`만 받은 서버는 내부 token exchange로 사용자 대신 하위 API를 호출한다. 이 인증 흐름 자체가 개별 변경 작업의 사람 승인을 뜻하지는 않는다.

같은 날 확인한 Legal Twin Case Knowledge 문서는 사건 상세 조회 시 원천 시스템에서 접근권을 확인한다고 명시한다. 문서 목록과 요약, 분석 메타데이터, 실제 본문 조회도 별도 도구로 나눈다. 이 사례를 모든 MCP 서버가 같은 권한 검사를 제공한다는 보장으로 확대하지 않는다.

적용 제안: 읽기 전용 업무에는 실행 가능한 도구와 자격증명 범위를 그 업무에 맞게 제한하고, 문서 생성이나 업무 완료에는 대상과 입력을 확인하는 별도 실행 경계를 둔다. 요약과 분석 메타데이터를 원문 사실과 구분하며, 접근권을 철회한 뒤 목록, 본문과 캐시에서 이전 자료가 다시 노출되지 않는지 확인한다. 위 사례는 공개 계약을 대조한 것이며 실제 고객 환경의 권한 격리를 시험한 결과는 아니다.

## 출처
- [stp.one Help Center, STP.Documents MCP](https://support.stp.one/hc/en-us/articles/30884494431389-MCP) — 2026-10-22 읽기와 변경 도구, OAuth scope와 사용자 위임 흐름 대조
- [stp.one Help Center, Case Knowledge MCP](https://support.stp.one/hc/en-us/articles/34341319681693-MCP) — 2026-10-22 사건 조회의 원천 접근권 검사와 문서 조회 단계 대조
- [Four security principles for agentic AI systems — AWS Security Blog](https://aws.amazon.com/blogs/security/four-security-principles-for-agentic-ai-systems/)
- [Amazon Bedrock, Integrate Automated Reasoning checks in your application](https://docs.aws.amazon.com/bedrock/latest/userguide/integrate-automated-reasoning-checks.html)
- [Amazon Bedrock, Automated Reasoning checks concepts](https://docs.aws.amazon.com/bedrock/latest/userguide/automated-reasoning-checks-concepts.html)
- [AI Rooms — Mindflow](https://www.mindflow.io/ai-rooms)
- [Mental Models in the Agentic Era — Product Mindset](https://productmindset.substack.com/p/mental-models-in-the-agentic-era) — 2026-10-19 뉴스레터, 15개 모형과 다섯 결정의 분류를 2026-10-27 원문 대조. 인용된 실험 수치 중 METR 외는 원 출처를 확인하지 못해 쓰지 않음
- [Measuring AI Ability to Complete Long Tasks — METR](https://metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/) — 2025-03-19, 4분과 4시간 과제의 성공률과 약 7개월 배증 주기를 2026-10-27 대조. 2026-10-28 50% 성공 기준과 사람 전문가의 수행 시간이라는 단위를 재대조
- [AI 네이티브 핸드북 2026: 지능을 전기처럼 쓰는 시대 — 전종홍](https://drive.google.com/file/d/1Kve5XiR8kMN260Uc0BW6eeoQi4cJzptA/view) — 제2부 AI 생산원가 장의 성공 작업당 원가 식과 예시, 2026-10-27 열람
- [AI 에이전트 제품을 설계할 때 필요한 15가지 사고 도구 — GeekNews](https://news.hada.io/topic?id=35887) — 학습 계기
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[Harness-Engineering|하네스 엔지니어링 (Constrain/Inform/Verify/Correct/HITL)]]
- [[AX-Transformation|AX 조직 전환]]
- [[Developer-Role-AI-Era|AI 시대 개발자 역할]]
