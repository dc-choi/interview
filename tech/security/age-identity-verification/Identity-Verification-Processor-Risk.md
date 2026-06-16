---
tags: [security, privacy, data-governance, identity, third-party-risk]
status: done
category: "보안(Security)"
aliases: ["Identity Verification Processor Risk", "제3자 검증 리스크", "Verification Data Boundary", "IDV Breach", "Algorithmic Disgorgement"]
---

# 제3자 위탁 리스크

신원과 연령 검증을 외주 벤더에 맡기면 정부 신분증, 셀카, 생체 템플릿이라는 회복 불가능한 데이터가 위탁사와 하위처리자 체인 끝단에 집중된다. 이 집중 자체가 IDV 벤더를 하나의 침해 클래스로 만든다. 같은 패턴의 유출이 해마다 연쇄로 터진다.

## 외주 검증이 별도 breach 클래스인 이유

검증 벤더는 다수 다운스트림 클라이언트의 신분 데이터를 한곳에 모으는 honeypot이고, 단일 실패점이 되며, 규제 압박으로 보안 성숙 전에 급히 도입된다. 사용자는 자기 데이터가 어느 하위처리자까지 흘러가는지 가시성이 없다. 한 사례에서는 서비스에서 외주 CS 벤더로, 다시 티켓 SW로 이어지는 체인 끝의 티켓 시스템이 뚫려, 사용자와 직접 관계도 없는 벤더에서 수백만 장의 연령검증 사진(운전면허, 여권 포함)이 노출됐다.

## 핵심 실패 모드

| 실패 모드 | 내용 |
|---|---|
| over-retention | 검증 통과 후 원본 신분증과 셀카를 남기는 것. 어떤 연령확인 법도 보관을 요구하지 않는데 외주 시스템에 잔존 |
| 목적 제한 위반 | 검증용 수집물을 동의 없이 2차 이용, 특히 AI 학습 전용 |
| 보관과 삭제 불투명 | 즉시 폐기를 약속해도 폐쇄소스라 사용자가 이행을 독립 검증 불가, 자격증명이 1년 넘게 노출되기도 |
| 비가역 생체 | 얼굴 템플릿과 여권번호는 비밀번호처럼 교체 불가, 1회 유출이 영구 피해 |

## 검증 데이터와 학습 데이터의 경계

가장 핵심적인 구조적 통제는 검증 데이터와 학습 데이터를 분리하는 것이다. 검증용으로 수집한 얼굴과 신분 데이터가 모델 학습에 흘러들면 단순 프라이버시가 아니라 소비자 보호 위반으로 재구성되고, 시정은 모델까지 폐기하는 algorithmic disgorgement로 이어진다. 부정 취득 데이터로 학습한 알고리즘 자체를 삭제 인증하게 한 FTC 선례가 있다. 따라서 경계 분리는 동일 스토리지 공유 금지, 학습 파이프라인 입력에서 IDV 원본 차단, 토큰화 경계로 아키텍처에 박아야 한다.

## 완화 — 보관할 raw 데이터를 없앤다

완화의 본질은 폐기를 약속하는 것이 아니라 raw 데이터를 애초에 보관할 곳을 없애는 설계다. 온디바이스 처리로 원본을 서버에 올리지 않고, 결과는 불리언이나 해시만 영속하며, TTL 기반 자동 삭제로 원본을 즉시 폐기한다. ZKP와 double-blind 토큰은 검증자가 raw PII를 소유하지 않게 해 중앙 DB라는 공격 표적 자체를 제거한다. 프라이버시 옹호 단체의 1순위 통제는 기술적 완화보다 앞서 처음부터 수집하지 않는 것이다.

## 사례

- Claude 신원검증 — Anthropic이 2026-07-08 발효로 개인정보처리방침에 검증 데이터(Verification Data) 카테고리를 신설했다. Free, Pro, Max 개인 이용자가 대상이고 팀, 엔터프라이즈, 개발자 플랫폼은 별도 약관으로 제외된다. 전원 강제가 아니라 18세 미만 의심, 특정 고급 기능 접근, 정기 무결성 점검 같은 트리거로 발동한다. 연령 추정은 Yoti, 신원 확인은 Persona가 처리하고, 신분증과 셀카는 Anthropic 서버가 아니라 위탁사가 보관하며 Anthropic은 필요 시 위탁 플랫폼을 통해서만 접근한다. 검증 데이터는 모델 학습과 광고에 쓰지 않는다고 명시해 검증과 학습 경계를 통제로 내세웠다. 다만 구체적 보관 기간과 삭제 시점은 공개되지 않아 제3자 위탁의 사각지대가 남는다. 같은 흐름의 모델 접근 제한은 [[Claude-Fable-5-Mythos-5]].
- 외주 검증 벤더 유출 — 신분증 검증 벤더의 관리자 자격증명이 1년 넘게 공개 노출돼 신분 문서와 라이브니스 결과에 접근 가능했던 사례, 검증 사진이 하위처리자 체인 끝에서 대량 유출된 사례가 같은 해 연쇄로 발생했다.
- 목적 제한 위반 — 데이팅 서비스가 약 300만 사용자 사진을 동의 없이 안면인식 모델 학습용으로 이전해 FTC 제재를 받고, 사진과 그로 학습된 모델까지 삭제(disgorgement)한 사례.

## 면접 체크포인트

- IDV 벤더를 연동한다면 데이터가 거치는 하위처리자 체인을 매핑하고, 각 hop의 보관과 삭제, 접근권한을 DPA 수준에서 강제하고 감사하는 방법을 설명한다.
- 검증과 학습 경계를 아키텍처로 보장하는 법은 동일 버킷 공유 금지, 학습 입력에서 원본 차단, 토큰화 경계다. FTC disgorgement 리스크를 엔지니어링으로 푼다.
- over-retention을 코드로 막는다. 원본은 메모리에서만 다루고 결과는 불리언이나 해시만 영속하며, TTL 자동 삭제로 즉시 폐기를 약속이 아니라 설계로 강제한다.

## 관련 문서

- [[연령신원검증(AgeIdentityVerification)|연령/신원 검증 (개요)]]
- [[Age-Assurance-Methods|검증 방법론과 PET]]
- [[Age-Verification-Regulation|규제 지형]]
- [[PII-Masking|PII 마스킹 (수집 데이터의 로그 보호)]]
- [[Long-Term-Retention|장기 보존 (보관 기간 통제)]]
- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5 (모델 접근 제한, 외생 리스크)]]

## 출처

- [10 (Not So) Hidden Dangers of Age Verification — EFF](https://www.eff.org/deeplinks/2025/12/10-not-so-hidden-dangers-age-verification)
- [The Breachies 2025 — EFF](https://www.eff.org/deeplinks/2025/12/breachies-2025-worst-weirdest-most-impactful-data-breaches-year)
- [Discord partner's age verification data breach includes selfies — Biometric Update](https://www.biometricupdate.com/202510/discord-partners-manual-age-verification-data-breach-includes-selfies)
- [Major Identity Verification Firm AU10TIX Exposes User Data — CloudDefense.AI](https://www.clouddefense.ai/major-identity-verification-firm-au10tix-exposes-user-data/)
- [FTC's OkCupid Action Reframes AI Training Data as a Consumer Protection Issue — ComplexDiscovery](https://complexdiscovery.com/ftcs-okcupid-action-reframes-ai-training-data-as-a-consumer-protection-issue/)
- [Mitigating Risk to Rights with Age Verification — CDT](https://cdt.org/insights/mitigating-risk-to-rights-with-age-verification-privacy-preserving-guardrails-that-should-accompany-deployments-of-age-verification-approaches/)
- [Anthropic Privacy Policy (Verification Data, 2026-07-08 발효)](https://www.anthropic.com/legal/privacy)
- [Identity verification on Claude — Claude Help Center](https://support.claude.com/en/articles/14328960-identity-verification-on-claude)
- [클로드 쓰려면 신원 밝혀라, 앤트로픽 개인정보처리방침 개정안 — 보안뉴스](https://www.boannews.com/media/view.asp?tab_type=1&idx=144131&page=1)
