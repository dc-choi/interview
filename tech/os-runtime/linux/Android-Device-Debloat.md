---
tags: [android, adb, dns, privacy, supply-chain]
status: done
verified_at: 2026-10-27
category: "OS&런타임(OS&Runtime)"
aliases: ["Android Debloat", "Android TV 광고 줄이기", "Private DNS", "adb pm disable-user"]
---

# Android 기기의 광고 줄이기: 패키지 비활성화, 런처 교체와 Private DNS

Android TV 같은 기기의 광고는 한 곳에서 나오지 않는다. 홈 화면 런처의 추천 영역, 개별 앱 안의 광고, 영상 스트림에 섞인 광고가 서로 다른 계층이라 한 가지 수단으로 모두 막을 수 없다. 계층마다 쓸 수단, 되돌리는 방법과 남는 위험을 나눠 본다.

## 계층별 수단

| 광고가 나오는 곳 | 수단 | 한계 |
|---|---|---|
| 홈 화면 런처 | 다른 런처를 기본 홈으로 지정하고 기본 런처 패키지를 비활성화 | 기본 런처가 입력 전환 같은 기능을 맡는 기기가 있다 |
| 광고 도메인을 따로 쓰는 앱과 추적 | DNS 필터링(Private DNS, Pi-hole 같은 네트워크 DNS) | 콘텐츠와 같은 도메인에서 오는 광고는 막지 못한다 |
| 영상 서비스의 스트림 광고 | 광고 UI가 없는 다른 클라이언트로 교체 | 비공식 APK의 공급망 위험 |

## ADB로 패키지를 다루는 방법

Android 11 이상은 개발자 옵션의 무선 디버깅에서 페어링 코드를 받아 `adb pair <ip>:<port>`로 한 번 페어링한다. 페어링한 컴퓨터는 디버깅 권한을 취소하기 전까지 같은 네트워크에서 자동으로 다시 연결되고, always allow on this network를 고르면 그 네트워크가 신뢰 네트워크가 된다. 작업이 끝나면 무선 디버깅을 꺼서 같은 네트워크의 다른 기기가 붙을 여지를 없앤다(설계 점검).

| 명령 | 효과 | 되돌리기 |
|---|---|---|
| `pm disable-user --user 0 <package>` | 사용자 0에게서 패키지를 비활성화한다. 삭제하지 않는다 | `pm enable <package>` |
| `pm uninstall --user 0 <package>` | 사용자 0에게서 패키지를 제거한다. `--user`가 없으면 모든 사용자에게서 지운다 | 펌웨어에 들어 있던 앱은 `cmd package install-existing <package>` (커뮤니티 가이드 기준) |
| `cmd package set-home-activity <component>` | 기본 홈 activity를 지정한다 (커뮤니티 가이드 기준) | 원래 런처 component를 다시 지정 |

펌웨어에 포함된 앱은 일반 삭제가 `DELETE_FAILED_INTERNAL_ERROR`로 실패할 수 있어 `--user 0` 제거를 쓴다(커뮤니티 가이드 기준). 비활성화가 삭제보다 되돌리기 쉽다. 패키지 이름은 제조사와 기기마다 다르고, 설정 마법사 패키지를 끄자 저장된 Wi-Fi를 잊은 사례도 보고됐다. 한 번에 하나씩 바꾸고 바꾼 목록을 기록해 둔다.

## Private DNS

Android 9에서 추가된 Private DNS는 DNS 질의를 TLS로 보낸다. 기본인 자동 모드는 네트워크의 DNS 서버가 지원하면 TLS로 바꾸고, 사용자가 호스트 이름을 지정하는 엄격 모드는 모든 질의를 그 서버로 보낸다. 엄격 모드에서 서버에 닿지 못하면 네트워크가 인터넷 연결 없음으로 표시되므로, 필터링 DNS 제공자의 장애가 곧 기기의 인터넷 장애가 된다.

설정 화면에 Private DNS가 없는 TV에서는 `settings put global private_dns_mode hostname`과 `settings put global private_dns_specifier <호스트>`로 지정하는 방법이 쓰인다. AOSP 소스에서 두 키는 공개 API가 아닌 `@hide` 설정이므로 기기와 버전에 따라 다르게 동작할 수 있고, 적용 뒤 실제 질의 경로를 확인한다.

DNS 필터링은 이름 단위로 막으므로 광고가 콘텐츠와 같은 도메인에서 오면 효과가 없다. 영상 서비스의 스트림 광고가 그 대표 사례로 꼽힌다(커뮤니티 가이드 기준). DNS 자체의 구조는 [[DNS]]에서 다룬다.

## 비공식 클라이언트의 공급망 위험

광고 UI가 없는 영상 클라이언트(SmartTube 등)는 Google Play 같은 일반 앱 스토어로 받을 수 없어 APK를 직접 설치하는 경우가 많다. 2026-10-27 확인한 SmartTube README는 어떤 앱 스토어에도 공식 게시하지 않는다고 밝히면서 F-Droid와 GitHub 배지, Telegram 채널과 프로젝트 사이트를 배포 경로로 연결한다. 앱 스토어, APK 사이트나 블로그의 파일은 다른 사람이 올린 것이라 악성코드나 광고가 들어 있을 수 있다며 받지 말라고 경고한다. 같은 README는 개발 환경이 알 수 없는 악성 소프트웨어에 감염돼 일부 빌드가 영향을 받았을 수 있고 공개 키도 노출됐을 수 있다며 새 키를 안내한다. 계정을 연결했다면 Google 계정의 서드파티 연결 목록에서 접근을 취소할 수 있다.

설치 전 점검(설계 점검):

1. 배포처가 프로젝트가 밝힌 공식 경로인지, 서명 키가 현재 공지와 맞는지 확인한다.
2. 계정 연결이 필요한지, 필요하면 권한 범위와 취소 방법을 확인한다.
3. 펌웨어 업데이트 뒤 비활성화한 패키지와 기본 홈 설정이 유지되는지 다시 본다.

공급망 공격 일반은 [[Supply-Chain-Security|공급망 보안]]을 따른다.

## 출처

- [Android Developers, Android Debug Bridge (adb)](https://developer.android.com/tools/adb) — 2026-10-27 무선 페어링과 `pm` 명령 대조
- [DNS over TLS support in Android P Developer Preview — Android Developers Blog](https://android-developers.googleblog.com/2018/04/dns-over-tls-support-in-android-p.html)
- [Settings.java (frameworks/base) — AOSP](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/main/core/java/android/provider/Settings.java) — `private_dns_mode`, `private_dns_specifier`의 `@hide` 선언
- [SmartTube README — GitHub, yuliskov](https://github.com/yuliskov/SmartTube)
- [An ad-free Android TV — Cretezy](https://cretezy.com/2026/ad-free-android-tv)
- [광고 없는 Android TV 만들기 — GeekNews](https://news.hada.io/topic?id=35697)

## 관련 문서

- [[Linux-Mobile-Platform|Linux 모바일]]
- [[DNS|DNS]]
- [[Supply-Chain-Security|공급망 보안]]
