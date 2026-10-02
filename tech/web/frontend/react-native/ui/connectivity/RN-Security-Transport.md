---
tags: [react-native, mobile, networking, security]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native TLS와 certificate pinning

React Native 0.87 Security 기준. HTTPS는 앱과 서버 사이에서 평문이 노출되는 위험을 줄이는 기본 전송 보호다. endpoint의 HTTPS 표기만으로 앱의 인증, 데이터 저장과 모든 공격에 대한 안전을 판단하지 않는다.

## HTTPS와 신뢰 체계

가이드는 SSL encryption이라는 표현을 사용한다. 실제 앱의 HTTPS 전송은 플랫폼 TLS 구성과 인증서 검증을 확인해야 한다. 서버가 신뢰하는 CA에서 발급된 유효한 인증서를 제시했는지와 전송 중 암호화를 구분해 이해한다.

사용자 기기 또는 앱이 공격자가 통제하는 root CA를 신뢰하는 조건에서는 TLS 중간자 interception 위험이 있다. 임의로 설치한 사용자 CA를 모든 현대 Android와 iOS 앱이 기본으로 신뢰한다고 단정하지 않는다. 이 공격 조건은 앱의 실제 trust 설정을 함께 확인해야 한다.

## pinning의 의미

certificate pinning은 앱이 허용하는 인증서를 개발 시점에 제한하여 플랫폼 CA trust에만 의존하는 범위를 줄이는 기법이다. 가이드는 trusted certificate 목록을 앱에 포함하는 접근을 설명한다.

```text
일반 TLS 검증: 플랫폼이 신뢰하는 CA와 인증서 조건
pinning 추가: 앱이 정한 pin과도 일치해야 요청 허용
```

모든 앱에 pinning을 자동 적용하는 기능이 RN 코어 가이드에 제시된 것은 아니다. 실제로 사용하는 네트워크 라이브러리와 네이티브 전송 계층에서 구현 범위를 확인한다.

## 인증서 갱신과 오래된 앱

pinning은 인증서 교체에 따른 운영 위험을 늘린다. 서버 인증서를 갱신했지만 사용자 앱은 예전 인증서만 포함하면 요청이 실패할 수 있다. 앱 업데이트를 아직 설치하지 않은 사용자도 고려해야 한다.

가이드의 과거 인증서 수명 수치를 현재 모든 인증서의 유효기간 규칙으로 쓰지 않는다. 실제 인증서 expiry와 CA 정책을 확인한다.

추가 적용 점검은 다음과 같다.

- 현재와 다음 인증서 또는 적절한 교체 전략을 앱 배포와 함께 계획할 수 있는지
- 구버전 앱의 pin으로 새 서버에 접속할 때 어떤 결과가 나는지
- pinning 실패를 사용자가 이해할 수 있는 오류로 처리하는지
- 이미지와 WebSocket을 포함해 필요한 요청 경로에 실제로 같은 보호가 적용되는지

이는 가이드의 만료 경고를 실제 운영 조건에 연결한 점검 제안이며 특정 pinning 구현의 동작을 확인한 사실은 아니다.

## 위험에 비례한 선택

수집하고 저장하는 데이터의 민감도, 계정 탈취의 피해와 사용자 수를 보고 추가 보호를 평가한다. pinning 도입 자체를 보안 완료로 취급하지 않고 [[RN-Security-Storage|디스크 사본과 로그]], [[RN-Security-Authentication|인증 redirect]]의 별도 노출 경로도 확인한다.

저장하거나 요청하지 않은 정보는 해당 노출 경로가 줄어든다. 필요 없는 민감 데이터의 수집을 줄이는 선택은 암호화 옵션 추가와 함께 검토할 수 있다.

## 확인할 점

정상 HTTPS, 만료 인증서, pin 불일치, 서버 인증서 교체, 구버전 앱을 각각 확인한다. 플랫폼별 trust 구성과 네트워크 계층을 확인하지 않았으므로 이 문서만으로 특정 앱의 pinning 효과나 안전성을 보장하지 않는다.

## 출처

- [React Native 0.87, Security](https://reactnative.dev/docs/security)

## 관련 문서

- [[RN-Networking|플랫폼 HTTPS와 cleartext 조건]]
- [[RN-Security-Storage|민감정보 저장과 monitoring]]
- [[RN-Security-Authentication|OAuth redirect와 PKCE]]
