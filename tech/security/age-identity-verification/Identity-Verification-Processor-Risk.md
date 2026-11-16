---
tags: [security, privacy, data-governance, identity, third-party-risk]
status: done
category: "보안(Security)"
aliases: ["Identity Verification Processor Risk", "제3자 검증 리스크", "Verification Data Boundary", "IDV Breach", "Algorithmic Disgorgement"]
---

# 제3자 위탁 리스크

신원과 연령 검증을 외주 벤더에 맡기면 정부 신분증, 셀카, 생체 템플릿이라는 회복 불가능한 데이터가 위탁사와 하위처리자 체인 끝단에 집중된다. 이 집중 자체가 IDV 벤더를 하나의 침해 클래스로 만든다. 같은 패턴의 유출이 해마다 연쇄로 터진다.

## 외주 검증이 별도 breach 클래스인 이유

검증 벤더는 다수 다운스트림 클라이언트의 신분 데이터를 한곳에 모으는 honeypot이고, 단일 실패점이 되며, 규제 압박으로 보안 성숙 전에 급히 도입된다. 사용자는 자기 데이터가 어느 하위처리자까지 흘러가는지 가시성이 없다. 한 사례에서는 외주 CS 벤더가 침해돼, 연령 관련 이의 제기에 사용된 운전면허와 여권 등 정부 발급 신분증 사진이 약 7만 명 규모로 노출됐을 가능성이 확인됐다.

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
- 목적 제한 위반 — 데이팅 서비스가 약 300만 사용자 사진을 동의 없이 안면인식 기술 업체에 이전해 FTC 제재를 받은 사례. 이 사건의 합의명령은 프라이버시 관련 허위표시 금지와 통지, 보고, 기록 보관 의무를 부과했지만 사진이나 학습 모델 삭제는 요구하지 않았다. 알고리즘 삭제(disgorgement)는 Everalbum 등 별도 사건의 선례다.
- 지원사업이 연결한 솔루션 공급기업의 유출 — 2026-11-13 중소벤처기업부 보도참고자료로 대조했다. 2차 모두의 창업은 참가자의 외부 AI 솔루션 이용료를 지원하고, 공급기업 50곳이 각자 시스템에서 솔루션을 운영하며, 참가자는 계정 발급에 필요한 개인정보의 제3자 제공에 동의한 뒤 쓴다. 선정 때 개인정보 보안 여부를 평가했지만 그중 한 곳(아미쿠스렉스, 솔루션명 로폼)이 11-11 08:30 외부 해킹 정황을 포착했고, 그 회사가 보유한 20,028명의 이름, 전화번호와 이메일 주소가 유출됐다. 이 가운데 참가자는 818명이다. 창업진흥원이 사고를 전달받은 것은 11-12 18:10이었고, 회사는 해외 IP 접속 차단 등을 한 뒤 11-13 15:00 개별 통지했다. 주관 기관은 따로 참가자에게 스미싱 같은 2차 피해 예방을 안내하고 다른 공급기업에 자체 점검을 요청했으며, 접근 권한 관리와 보유기간이 지난 정보의 파기를 계속 점검하겠다고 밝혔다. 선정 시점의 평가는 운영 중 통제를 대신하지 않고, 유출 범위는 지원사업 참가자가 아니라 그 회사의 전체 이용자이며, 데이터를 받는 사업자가 늘수록 사고 지점도 는다(해석). 받은 쪽이 자기 목적으로 처리하는 제3자 제공과 처리위탁의 책임 구분은 [[Privacy-Operations-for-Small-Business#외주업체와 클라우드에 맡겨도 되는가|처리위탁과 제3자 제공]]을 따른다.

## 면접 체크포인트

- IDV 벤더를 연동한다면 데이터가 거치는 하위처리자 체인을 매핑하고 각 hop의 보관과 삭제, 접근권한을 DPA 수준에서 강제하고 감사하는 방법을 설명한다.
- 검증과 학습 경계를 아키텍처로 보장하는 법은 동일 버킷 공유 금지, 학습 입력에서 원본 차단, 토큰화 경계다. FTC disgorgement 리스크를 엔지니어링으로 푼다.
- over-retention을 코드로 막는다. 원본은 메모리에서만 다루고 결과는 불리언이나 해시만 영속하며 TTL 자동 삭제로 즉시 폐기를 약속이 아니라 설계로 강제한다.

## 관련 문서

- [[연령신원검증(AgeIdentityVerification)|연령/신원 검증 (개요)]]
- [[Age-Assurance-Methods|검증 방법론과 PET]]
- [[Age-Verification-Regulation|규제 지형]]
- [[PII-Masking|PII 마스킹 (수집 데이터의 로그 보호)]]
- [[Long-Term-Retention|장기 보존 (보관 기간 통제)]]
- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5 (모델 접근 제한, 외생 리스크)]]
- [[Privacy-Operations-for-Small-Business|대표의 개인정보 운영 (처리위탁과 제3자 제공, 유출 대응)]]

## 출처

- [10 (Not So) Hidden Dangers of Age Verification — EFF](https://www.eff.org/deeplinks/2025/12/10-not-so-hidden-dangers-age-verification)
- [The Breachies 2025 — EFF](https://www.eff.org/deeplinks/2025/12/breachies-2025-worst-weirdest-most-impactful-data-breaches-year)
- [Update on Security Incident Involving Third-Party Customer Service — Discord](https://discord.com/press-releases/update-on-security-incident-involving-third-party-customer-service)
- [Major Identity Verification Firm AU10TIX Exposes User Data — CloudDefense.AI](https://www.clouddefense.ai/major-identity-verification-firm-au10tix-exposes-user-data/)
- [Match Group Americas and Humor Rainbow Stipulated Order — FTC](https://www.ftc.gov/system/files/ftc_gov/pdf/MatchGroupAmericasandHumorRainbowStipulatedOrder.pdf)
- [FTC Requires Everalbum to Delete Improperly Obtained Photos and Derived Models — FTC](https://www.ftc.gov/news-events/news/press-releases/2021/01/ftc-requires-photo-app-developer-delete-users-photos-videos-it-improperly-used-develop-facial)
- [Mitigating Risk to Rights with Age Verification — CDT](https://cdt.org/insights/mitigating-risk-to-rights-with-age-verification-privacy-preserving-guardrails-that-should-accompany-deployments-of-age-verification-approaches/)
- [Anthropic Privacy Policy (Verification Data, 2026-07-08 발효)](https://www.anthropic.com/legal/privacy)
- [Identity verification on Claude — Claude Help Center](https://support.claude.com/en/articles/14328960-identity-verification-on-claude)
- [클로드 쓰려면 신원 밝혀라, 앤트로픽 개인정보처리방침 개정안 — 보안뉴스](https://www.boannews.com/media/view.asp?tab_type=1&idx=144131&page=1)
- [민간 AI 솔루션 기업 A사 개인정보 유출, 유출 대상에 2차 모두의 창업 참가자 818명 포함 — 대한민국 정책브리핑, 중소벤처기업부](https://www.korea.kr/briefing/actuallyView.do?newsId=148975732) — 2026-11-14 게시. 2026-11-16 첨부 보도참고자료(2026-11-13) 원문으로 경위, 규모, 항목과 조치 대조
