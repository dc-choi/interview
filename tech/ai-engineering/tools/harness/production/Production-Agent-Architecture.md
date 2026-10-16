---
tags: [ai, agent, architecture, index]
status: index
category: "AI엔지니어링(AIEngineering)"
aliases: ["Production Agent Architecture", "프로덕션 에이전트 아키텍처", "Multi-Agent Architecture"]
---

# 프로덕션 에이전트 아키텍처 (Production Agent Architecture)

LLM 단발 호출을 도구로 쓰는 단계를 넘어, **에이전트에게 일을 위임해 끝내게 만드는** 시스템 설계. 두 축이 필요하다.

- **하니스(Harness)** — 행동을 제어하는 장치 (분업, 권한 분리, 안전망, 고가용성)
- **지식 체계(Knowledge)** — 결정론적 답변을 위한 정의 (지표 레지스트리, 메타데이터, 정책)

도구는 사람이 들고 쓰고, 동료는 위임받아 끝낸다. 프로덕션 에이전트의 목표는 **위임 가능한 수준의 신뢰**다.

## 목차

- [[Production-Agent-Architecture-Orchestration|분업과 오케스트레이션]]: 컴포넌트 분업과 Parent의 재확인 책무, 라우팅과 대화 전달 계약, 환경을 넘는 위임의 호출자 권한 보존, 프레임워크 vs 자체 구현 엔진, Lazy Load 컨텍스트
- [[Production-Agent-Architecture-Guardrails|다층 안전망과 루프 가드레일]]: Defense in Depth 4겹(Role, Gate, Rule, Hook), 시스템 프롬프트 3계층, 백엔드의 프롬프트 합성, 루프의 코드 레벨 가드레일, 사후 반영 사용량 제한
- [[Production-Agent-Architecture-Knowledge|지식 체계]]: Metric Registry, 조회 우선순위, Auto Memory 비활성화
- [[Production-Agent-Architecture-Eval-and-Operations|Eval, 운영 루프와 고가용성]]: 배포 전 검증 4축, 피드백을 지식과 테스트로 환원하는 운영 루프, 처리 시간의 시작과 종료 상태, 워커 풀
- [[Production-Agent-Architecture-Delegation|Closure-loop 위임 경계와 자율권]]: 사람과 에이전트의 담당, 승인과 실행 권한과 감사 기록의 구분, 작업별 증거로 넓히고 줄이는 자율권, 정책 검사와 행동 차단의 구분
- [[Production-Agent-Architecture-Cases-and-Interview|사례와 면접 포인트]]: Meta Muse의 Sentinel 승인과 격리, 마이리얼트립 데이터 에이전트, LY SRELens, 면접 질문 4개

## 함께 볼 문서

- [[Harness-Production|프로덕션 에이전트 운영과 격리]]
