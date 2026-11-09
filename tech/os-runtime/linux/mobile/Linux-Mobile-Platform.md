---
tags: [linux, mobile, phosh, plasma, hardware]
status: done
category: "OS&런타임(OS&Runtime)"
aliases: ["Linux Mobile Platform", "Linux 폰"]
---

# Linux 모바일: 운영체제보다 기기 계약

Linux 폰의 실용성은 부팅 성공 외에도 모뎀, 절전, 카메라와 일상 앱의 작동 여부로 평가한다. 데스크톱과 모바일의 사용자 공간을 공유해도 기기별 드라이버와 전력 관리가 자동으로 해결되지는 않는다.

## 소프트웨어 계층

Phosh와 Plasma Mobile은 모바일 사용자 인터페이스다. 배포판 자체와 구분한다. Plasma Mobile은 KDE 기반 기술, Wayland, ModemManager와 오디오 스택 등을 재사용한다. 공통 스택은 새 제조사의 개발 범위를 줄이지만, 통화와 카메라의 기기별 통합은 남는다.

## 하드웨어 경로의 절충

2026-10-13 GeekNews 입력은 세 가지 후보 경로를 제시했다. 다음 표는 입력의 주장과 평가 질문을 보존한 것이며 각 SoC의 실제 지원 인증을 뜻하지 않는다.

| 후보 | 확인할 질문 |
| --- | --- |
| RK3588S 같은 범용 SoC | 유휴 전력과 모뎀 통합이 휴대전화에 맞는가? |
| Qualcomm IoT SoC | 보드 설계 비용, 드라이버 공개 범위와 양산 수량을 감당하는가? |
| 장기 지원 Android SoC | 벤더 커널과 바이너리에 의존하는 범위와 종료 이후 유지보수 경로가 있는가? |

소규모의 지속 가능한 대안 시장이 형성될 수 있다는 전망은 시장 예측이다. Android/iOS와의 기능 동등성이나 사용자 확대가 확인된 사실로 바꾸지 않는다.

## Android의 소스 공개와 앱 배포 권한은 별개다

Android 기반 기기를 선택할 때 AOSP 소스의 공개 여부와 Google 인증 기기에서 앱을 설치하는 정책은 나눠 본다. Keep Android Open은 개발자 신원 확인과 앱 등록이 독립 배포의 진입 장벽과 중앙 통제를 늘린다고 비판하는 캠페인이다. 이 우려를 모든 Android 기기에서 외부 앱 설치가 이미 불가능하다는 사실로 바꾸지는 않는다.

2026-10-28 Google 공식 안내와 FAQ를 확인한 범위는 다음과 같다.

- 2026-09-30 시행 범위는 브라질, 인도네시아, 싱가포르와 태국의 Android 7 이상 인증 기기에서 참여 스토어를 통한 설치다. 다른 스토어와 직접 sideload는 이 초기 단계의 대상이 아니며, Google은 2027년부터 확대할 계획이라고 밝힌다.
- 개발용 ADB 설치는 등록 없이 유지한다. 관리 기기의 조직 스토어로 배포하는 기업 앱도 예외지만, 일반 스토어나 비관리 기기로 배포하면 별도다.
- limited distribution 계정은 정부 발행 신분증과 등록비 없이 최대 20대에 공유하는 경로다. 미등록 개발자의 앱을 쓰려는 사용자를 위한 advanced flow도 안내하지만, 일반 설치와 같은 마찰 없는 경로로 보지는 않는다.
- 앱 등록은 패키지명과 서명 키의 소유 관계를 확인하는 절차다. 개인 서명 키 자체를 Google에 제출하는 절차라고 단정하지 않는다.

대안 OS를 고를 때는 소스 라이선스, 기기 인증, 앱 배포 정책과 실제 필요한 앱의 호환성을 각각 평가한다(적용 제안).

## 실제 사용 전 검증

- 통신사와 지역별 음성 통화, VoLTE, 문자와 데이터 연결
- 대기 전력, suspend/resume, 배터리 수명과 발열
- 카메라, GPS와 블루투스 오디오
- 업무, 인증과 결제에 필요한 앱 및 웹 흐름
- 보안 업데이트의 주체, 지원 기간과 복구 이미지

2026-10-16 Phosh와 Plasma Mobile 공식 소개로 사용자 인터페이스의 역할과 스택 재사용을 확인했다. 입력 아티클의 원문 URL, 세 SoC 경로의 개별 사양과 시장 전망은 미확인이다. 후속으로 원문 식별과 기기별 지원표 대조가 필요하다.

## 출처

- [Android Developers, Android developer verification](https://developer.android.com/developer-verification?hl=en) — 2026-10-28 시행 범위, 일정과 제한 배포 경로 대조
- [Android Developers, Developer verification FAQ](https://developer.android.com/developer-verification/guides/faq?hl=en) — 2026-10-28 ADB, 관리 기기, 참여 스토어와 advanced flow 대조
- [Keep Android Open](https://keepandroidopen.org/) — 독립 배포 통제에 반대하는 캠페인의 입장
- [Phosh](https://phosh.mobi/)
- [Plasma Mobile](https://plasma-mobile.org/)
- GeekNews, 2026-10-13 제공 발췌: Linux 폰은 Android/iOS 양강 체제의 실용적인 대안이 될 수 있을까? (원문 식별 대기)

## 관련 문서

- [[Linux-File-System|Linux 파일시스템]]
- [[Self-Hosting-Small-Server|소형 서버 셀프호스팅]]
- [[Mobile-OS-Porting|모바일 OS 이식]]
