---
tags: [security, privacy, identity, age-assurance, compliance, data-minimization]
status: index
category: "보안(Security)"
aliases: ["연령 검증", "신원 검증", "Age Assurance", "Identity Verification", "Age Verification", "IDV", "KYC", "연령 보증"]
---

# 연령/신원 검증 (Age & Identity Verification)

온라인 서비스가 이용자의 나이나 신원을 확인하도록 요구하는 통제다. 미성년 보호, 오남용과 사기 방지, 규제 준수가 도입 동인이고, 2025~2026년 사이 다수 관할에서 권고에서 강제로 전환됐다. AI 플랫폼은 여기에 더해 고위험 기능과 에이전트 기능 접근을 신원으로 게이팅하는 흐름으로 들어왔다.

이 주제의 핵심 긴장은 강한 검증과 데이터 최소화의 충돌이다. 나이나 신원을 더 확실히 증명하게 할수록 신분증, 얼굴, 생년월일 같은 회복 불가능한 민감정보를 더 수집하게 되고, 그 수집물은 곧 유출 표적이 된다. 규제가 robust 검증과 최소 수집을 동시에 요구하므로, 영지식증명과 토큰화 같은 프라이버시 보존 기술(PET)이 적합성의 사실상 전제가 된다.

## 핵심 구분

- 연령 보증(age assurance)은 임계 연령 충족 여부라는 불리언만 판정한다. 신원을 알 필요가 없어 데이터 최소화에 유리하다.
- 신원 검증(identity verification, IDV/KYC)은 그 사람이 누구인지까지 확인한다. 더 강하지만 PII 노출 면적이 크다.
- 둘은 별개 축이고, 같은 서비스가 트리거에 따라 어느 쪽을 발동할지 나눈다.

## 문서

- [[Age-Assurance-Methods|검증 방법론과 PET]] — 자기신고부터 하드 신분증까지 5방식, 얼굴 연령추정 정확도와 편향, double-blind/ZKP/IEEE 2089.1
- [[Age-Verification-Regulation|규제 지형]] — 영국 OSA HEAA, EU eIDAS 블루프린트, 미국 Paxton, 호주 16세, COPPA, 생체 프라이버시 충돌, 프론티어 AI 게이팅
- [[Identity-Verification-Processor-Risk|제3자 위탁 리스크]] — 외주 검증의 breach 클래스, 검증과 학습 데이터 경계, FTC disgorgement, 완화 설계, Claude 신원검증 사례

## 관련 문서

- [[Claude-Fable-5-Mythos-5|Claude Fable 5, Mythos 5 (모델 접근 제한 — 신원 게이팅과 같은 계층의 접근 제어, 모델 가용성 외생 리스크)]]
- [[PII-Masking|PII 마스킹 (검증 시 수집되는 민감정보의 로그 보호)]]
- [[Long-Term-Retention|장기 보존 (검증 데이터 보존 기간과 최소화의 트레이드오프)]]
- [[FIDO-Seminar|FIDO, 패스키 (생체 데이터 로컬 처리 원칙)]]
- [[Cognito|AWS Cognito (가입 시 신원 검증 로직 삽입 플랫폼)]]
- [[Production-Agent-Architecture|프로덕션 에이전트 아키텍처 (Defense in Depth — 신원 게이팅 = Hook 레이어 최종 차단)]]
