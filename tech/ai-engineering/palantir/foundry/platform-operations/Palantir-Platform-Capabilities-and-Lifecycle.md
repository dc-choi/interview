---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir 플랫폼 경계와 기능 수명"]
---

# Palantir 플랫폼 경계와 기능 수명

Palantir는 Foundry를 data operations, AIP를 generative AI와 operations의 연결, Apollo를 software delivery로 설명한다. 이는 공급자의 아키텍처 설명이며 모든 기능이 모든 enrollment에 켜져 있다는 의미는 아니다.

## Data, logic와 action

Ontology는 data를 object/link로, logic을 model/function/rule/분석으로, action을 상태 변경과 외부 효과로 연결한다. Pipeline의 batch LLM 결과와 live function 호출은 다른 실행 시점이다. 제안 object를 기록하고 사람이 검토하는 패턴은 모델 출력과 실제 action을 분리해 결과 feedback을 남긴다.

Scenario는 변경의 영향을 실험하는 별도 branch 문맥이다. 실제 실행의 권한, side effect와 approval을 simulation 결과만으로 보장하지 않는다. 외부 연동과 OSDK는 읽기와 쓰기 경로 모두의 권한 검토가 필요하다. Overview의 보안 전파 설명은 [[Palantir-Security-Control-Propagation]]의 read-time policy와 외부 export 제한을 함께 적용한다.

## 기능 상태와 도입 조건

| 상태 | 유지/지원과 이용 조건 |
|---|---|
| Beta | 적극 개발, opt-in/점진 rollout, 문서와 지원 제공, GA 진입 보장 없음 |
| GA | 기본 enablement와 지원을 지향하지만 infrastructure/계약/SaaS 조건과 rollout 지연 가능 |
| Legacy | critical fix와 지원 유지, 적극 기능 개발 없음, 신규 고객 opt-in 가능, 폐기일 미정 |
| Sunset | 기존 고객 유지, 신규 enable 불가, 폐기를 예상하지만 날짜 미정 |
| Planned deprecation | 확정 폐기일과 migration 안내, 기존 기능 지원 유지, 신규 enrollment enable 불가 |
| Deprecated | 기능/API/integration과 지원 종료, 공개 문서 제거를 원칙으로 설명 |

상태 설명 자체도 기능에 따라 차이가 있을 수 있다. GA 발표 후 개별 enrollment 도달은 1주 이상 늦을 수 있다. Legacy를 이미 deprecated라고 부르거나 sunset에 확정 deadline이 있다고 가정하지 않는다. Upgrade Assistant와 관리자 공지는 migration 근거다.

## Assist의 문맥과 client 전제

이 prefix의 Assist 안내는 현재 app 문맥은 알지만 작업 중 data/metadata에는 접근하지 않는다고 설명한다. 동시에 custom Notepad/Markdown source와 사용자 정의 chatbot을 검색 문맥으로 등록할 수 있다고 명시한다. 이 설명을 모든 AIP agent의 tool/data 접근 계약으로 확대하지 않고 실제 Assist 모드와 별도 최신 문서를 확인한다.

문서 기반 질문은 기능, 오류와 원하는 입력/출력 예시를 구체적으로 제시할수록 검토하기 쉽다. 자연어 답변이 지원 기능이나 실행 결과를 증명하지는 않는다.

Recovered 한국어 network/browser 문서는 AIP 번역 정확성이 미검증된 역사 자료다. WebSocket 연결과 HTTP/2를 전제하며 proxy의 WebSocket 미지원/HTTP1.1 downgrade가 기능과 성능을 훼손할 수 있다고 설명한다. 최근 6개월 Chrome/Edge 완전 지원, Firefox critical fix와 mobile Chrome/Edge/Safari 표기도 이 출처 시점의 계약으로 보존하며 현재 browser 지원을 runtime으로 검증하지 않았다.

Architecture/interoperability 독립 페이지는 Architecture Center를 가리키는 짧은 안내다. 연결된 Architecture Center 전체를 이 prefix에서 추가 학습한 것으로 세지 않는다.

## 출처

- [Palantir platform-overview, platform-overview](https://www.palantir.com/docs/foundry/platform-overview)
- [Palantir platform-overview, aip-assist](https://www.palantir.com/docs/foundry/platform-overview/aip-assist)
- [Palantir platform-overview, aip-best-practices](https://www.palantir.com/docs/foundry/platform-overview/aip-best-practices)
- [Palantir platform-overview, aip-capabilities](https://www.palantir.com/docs/foundry/platform-overview/aip-capabilities)
- [Palantir platform-overview, architecture](https://www.palantir.com/docs/foundry/platform-overview/architecture)
- [Palantir platform-overview, development-life-cycle](https://www.palantir.com/docs/foundry/platform-overview/development-life-cycle)
- [Palantir platform-overview, interoperability](https://www.palantir.com/docs/foundry/platform-overview/interoperability)
- [Palantir platform-overview, network-requirements](https://palantir.com/docs/kr/foundry/platform-overview/network-requirements/)
- [Palantir platform-overview, overview](https://www.palantir.com/docs/foundry/platform-overview/overview)
- [Palantir platform-overview, supported-browsers](https://palantir.com/docs/kr/foundry/platform-overview/supported-browsers/)

## 관련 문서

- [[Palantir-Platform-Operations]]
