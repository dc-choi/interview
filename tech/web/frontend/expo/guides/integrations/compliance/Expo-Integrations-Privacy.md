---
tags: [expo, expo-integrations, compliance]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 서비스 데이터와 앱 compliance의 경계"]
---

# Expo 서비스 데이터와 앱 compliance의 경계

Expo의 privacy 문서는 developer와 end-user data 수집 범위를 Privacy Policy와 Privacy Explained로 공개한다고 설명한다. 서비스의 정책과 Expo로 만든 앱의 실제 데이터 처리는 별도 책임이다. 이 문서는 지정 공식 자료의 설명을 기록하며 사용자의 앱에 법적 준수 판정을 내리지 않는다.

## Expo service의 주장과 앱의 책임

Data/privacy overview는 Expo가 최소한의 product/service 개선 data를 수집하며 GDPR/CCPA/Data Privacy Framework에 맞게 처리한다고 명시한다. 개별 SDK/provider/hosting/telemetry 경로에서 어떤 data가 나가는지는 해당 policy와 현재 설정을 확인한다. 원문의 general compliance 선언을 app의 analytics/replay/backend 모든 data flow에 자동 확장하지 않는다.

GDPR 페이지는 Expo로 compliant 앱을 만들 수 있지만 앱 개발자의 privacy practice를 보증하지 않는다고 설명한다. 앱이 정한 collection 목적, 사용자 권리/consent, retention/deletion, processor와 transfer 조건은 앱 범위에서 관리한다. Expo policy의 역할과 application policy를 분리한다.

HIPAA 페이지는 Expo가 individually identifiable health data를 수집하지 않는다고 설명하고 앱은 자신이 수집한 data를 책임진다고 명시한다. 해당 페이지는2023 자료로 vendor contract/BAA, application health-data flow와 실제 현재 service 사용 조건까지 확인한 증거가 아니다. 건강정보를 crash breadcrumb/replay/user property나 source map에 실수로 포함하는 경로도 앱에서 검토한다.

## 문서의 사용 범위

세 source는 overview와 책임 구분 자료이며 data schema/SDK runtime/contract 검증 결과가 아니다. provider의 공개 client key와 server secret, anonymized identifier와 개인 identity, crash stack와 screen replay를 구분해 data inventory를 작성할 때 참고한다. regional hosting 선택이 모든 법적 준수를 해결하는 조건도 아니다. 각 앱의 적용 법과 provider 현재 계약은 출시/운영 판단 시 공식 규정과 계약으로 다시 확인한다.

## 출처

- [Expo Documentation, Data and privacy protection](https://docs.expo.dev/regulatory-compliance/data-and-privacy-protection)
- [Expo Documentation, GDPR compliance and Expo](https://docs.expo.dev/regulatory-compliance/gdpr)
- [Expo Documentation, HIPAA compliance and Expo](https://docs.expo.dev/regulatory-compliance/hipaa)

## 관련 문서

- [[Expo-Integrations-Analytics]]
- [[Expo-Integrations-Authentication]]
- [[Expo-Integrations-PostHog]]
- [[Expo-Integrations-Supabase]]
