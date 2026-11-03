---
tags: [infrastructure, video-conferencing, byod, logitech]
status: done
verified_at: 2026-11-04
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["하이브리드 회의실의 연결과 호환성", "Hybrid Meeting Room Design"]
---

# 하이브리드 회의실의 연결과 호환성

회의실 장비는 카메라와 마이크만 고르는 문제가 아니다. 회의 앱이 어디서 실행되는지, 노트북이 어떤 주변 장치를 사용하는지, 장비와 플랫폼의 조합이 지원되는지를 함께 정한다. 다음 제품별 조건은 2026-11-04 공식 문서 확인 기준이다.

## 회의 앱의 실행 위치부터 나눈다

| 구성 | 실행 위치 | 확인할 조건 |
| --- | --- | --- |
| BYOD | 참가자의 노트북 | 화면과 카메라, 마이크, 스피커 연결 및 앱의 장치 선택 |
| 전용 appliance | 회의실 장비 | 지원 플랫폼, 장비 소프트웨어와 회의실 라이선스 |

Rally Board 65는 BYOD에서 노트북 앱과 함께 디스플레이, 카메라와 오디오를 사용할 수 있다. Teams Rooms on Android나 Zoom Rooms on Android의 전용 appliance로 구성하면 해당 서비스의 회의실 라이선스가 필요하다. BYOD 사용에 전용 회의실 라이선스가 필수는 아니지만, 이를 모든 앱 기능의 무료 사용으로 해석하지 않는다.

같은 USB-C 연결이라도 충전까지 포함된다고 가정하지 않는다. Rally Board 65는 BYOD 호스트 노트북에 전원을 공급하지 않으므로 별도 전원 준비가 필요하다.

## 주변 장치 연결과 플랫폼 지원은 별도다

Logitech Extend의 공식 호환성 목록은 Android 기반 회의실에서 Rally Bar, Rally Bar Mini, Rally Bar Huddle와 Rally Board 65를 열거한다. RoomMate와 Google Meet on Android는 지원하지 않는다고 명시한다. 이를 노트북에서 실행하는 Google Meet의 사용 가능 여부와 혼동하지 않는다.

Extend는 USB 표준 프로토콜을 따르지만 제조사의 검증 범위는 목록에 있는 제품이다. 다른 USB 장치가 연결될 가능성과 검증된 지원은 다르며, 카메라와 운영체제에 따라 기능이 달라질 수 있다.

모바일 화면 공유에는 USB-C의 DisplayPort Alt Mode 지원이 필요하다. 화면을 표시하는 기능과 회의실 카메라, 마이크, 스피커로 모바일 앱의 영상통화를 실행하는 기능도 구분한다. 후자는 플랫폼별 지원을 확인한다.

## 현장에서 확인할 항목

아래는 공식 호환성 조건에서 도출한 검수 제안이며 실측 결과가 아니다.

1. 실제 사용할 노트북과 앱으로 화면, 카메라, 마이크와 스피커를 각각 확인한다.
2. 케이블을 연결한 뒤 선택된 오디오 장치와 노트북 충전 상태를 따로 확인한다.
3. 외부 참가자가 말소리와 공유 화면을 확인하도록 하고, 회의실 안의 화면만 보고 통과시키지 않는다.
4. BYOD를 끝낸 뒤 전용 회의실 모드로 복귀하는 절차를 확인한다.
5. 지원표의 장비 모델, 운영체제와 플랫폼을 실제 구성과 맞춘다.

공개 데모의 자동 화면 전환이나 소음 억제만으로 모든 공간의 수음 품질, 생산성 향상이나 프라이버시 보호를 보장하지 않는다. 이 문서는 연결과 호환성만 대조했으며 실제 설치, 신제품 전체 사양, 관리 포털과 보안 기능은 검증하지 않았다.

## 출처

- [Logitech, Frequently asked questions about Rally Board 65](https://hub.sync.logitech.com/rallyboard65/post/frequently-asked-questions-about-rally-board-65-FnZMdd8pbC01JhP) — 2026-11-04 BYOD, appliance 라이선스와 노트북 전원 공급 여부 확인.
- [Logitech, Compatibility and Verified Devices - Get Started with Logitech Extend](https://hub.sync.logitech.com/extend/post/1-x-compatibility-and-verified-devices---logitech-extend-BmMTaBbynP53pS6) — 2026-11-04 장비, 플랫폼, USB 검증 범위와 모바일 화면 공유 조건 확인.

## 관련 문서

- [[Server-Quotation-Checklist|장비 견적과 지원 조건 확인]]
- [[인프라&클라우드(Infrastructure&Cloud)|인프라와 클라우드 지도]]
