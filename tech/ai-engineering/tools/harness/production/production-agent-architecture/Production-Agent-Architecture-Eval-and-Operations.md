---
tags: [ai, agent, architecture, evaluation, availability]
status: done
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture Eval and Operations", "프로덕션 에이전트 Eval과 고가용성"]
---

# 프로덕션 에이전트 아키텍처: Eval, 운영 루프와 고가용성

배포 전 검증 4축, 피드백을 지식과 테스트로 환원하는 운영 루프, 처리 시간 계측의 상태 정의와 워커 풀 고가용성을 다룬다. 상위: [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처]].

## Eval 시스템과 운영 루프

배포 전 자동 검증(예: 100+ shell test/eval)을 4축으로 본다.

| 축 | 측정 |
|---|---|
| **정확성** | 수치가 맞는가 |
| **행동 경로** | 어떤 워커를 거쳤는가 |
| **안정성** | 같은 요청에 같은 답인가 |
| **형식** | 요청한 출력 형식인가 (엑셀/시트/이미지) |

운영 루프는 피드백을 지식, 테스트로 환원한다.

```
사용자 피드백 ("이거 이상해요")
    ↓
근본 원인 분석 (Knowledge 부재? Rule 누락? Skill 결함?)
    ↓
Knowledge 수정 (Metric Registry / Rule / Skill)
    ↓
재발 방지 eval 추가 (테스트 케이스화)
```

지표, 규칙, 테스트가 동시에 성장하며 엣지 케이스 커버리지가 누적된다.

### 처리 시간은 시작과 종료 상태를 함께 정의한다

모델 응답 시간, 서류 검토 시간, 대기열 해소 시간과 외부 시스템의 최종 처리 시간은 서로 다른 지표다. 다음은 업무 에이전트에 적용하는 계측 설계 제안이다.

- 요청 접수, 자료 확보, 검토 완료, 승인과 외부 실행 완료를 서로 다른 상태로 남긴다.
- 필요한 서류를 안내한 상태를 심사 승인으로, 이의제기 자료를 만든 상태를 환급 완료로 기록하지 않는다.
- 정상 완료뿐 아니라 추가 자료 요청, 사람 검토, 실패와 재작업을 함께 집계한다. 완료된 쉬운 건만 골라 평균 시간을 내지 않는다.

AWS의 2026-03-11 Zamp 공개 사례는 차지백 처리 기간 단축과 고객 확인에 필요한 누락 서류 안내를 구분해 설명한다. 이 사례는 단계별 완료 의미를 구분하는 참고이며, 제시된 속도를 모든 업무의 최종 완료 시간이나 독립 검증된 성과로 일반화하지 않는다.

## 고가용성: 워커 풀

활성 워커와 대기 워커를 풀로 두고, Dispatcher가 리밋(주간/시간당), API 에러를 감지하면 즉시 교체한다. 사용자는 "워커 죽었으니 새 스레드 파세요" 안내를 받지 않는다 → **동료로서의 신뢰** 유지.

비용 관점에서는 토큰당 API 호출 대신 Claude Code Max 다중 계정 + 헤드리스 모드 + Docker 병렬 실행으로 단가를 떨어뜨릴 수 있다.

## 출처
- [Zamp: Realizing an autonomous future for enterprise, with AWS — AWS](https://aws.amazon.com/aws-startups/learn/zamp-realizing-an-autonomous-future-for-enterprise-with-aws/)
- [Product Engineer | 하루 500건 분석 요청을 받아내는, 데이터 에이전트 — 일을 돕는 AI에서 일을 수행하는 AI로 — 마이리얼트립 Product](https://medium.com/myrealtrip-product/product-engineer-%ED%95%98%EB%A3%A8-500%EA%B1%B4-%EB%B6%84%EC%84%9D-%EC%9A%94%EC%B2%AD%EC%9D%84-%EB%B0%9B%EC%95%84%EB%82%B4%EB%8A%94-%EB%8D%B0%EC%9D%B4%ED%84%B0-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EC%9D%BC%EC%9D%84-%EB%8F%95%EB%8A%94-ai%EC%97%90%EC%84%9C-%EC%9D%BC%EC%9D%84-%EC%88%98%ED%96%89%ED%95%98%EB%8A%94-ai%EB%A1%9C-dde9b6a891c5)

## 관련 문서
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (묶음 인덱스)]]
- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]
- [[Production-Agent-Architecture-Knowledge|지식 체계]]
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]
- [[LLM-Eval-Strategy|LLM 평가 전략 (Pass@k, Multi-gate 품질, CSAT vs 정확도)]]
- [[Evaluation-Driven-Development|평가 주도 개발 (여기의 Eval 4축을 개발 프로세스로 확장한 두 축과 성숙도)]]
