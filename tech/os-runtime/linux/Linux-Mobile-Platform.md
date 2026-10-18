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

## 실제 사용 전 검증

- 통신사와 지역별 음성 통화, VoLTE, 문자와 데이터 연결
- 대기 전력, suspend/resume, 배터리 수명과 발열
- 카메라, GPS와 블루투스 오디오
- 업무, 인증과 결제에 필요한 앱 및 웹 흐름
- 보안 업데이트의 주체, 지원 기간과 복구 이미지

2026-10-16 Phosh와 Plasma Mobile 공식 소개로 사용자 인터페이스의 역할과 스택 재사용을 확인했다. 입력 아티클의 원문 URL, 세 SoC 경로의 개별 사양과 시장 전망은 미확인이다. 후속으로 원문 식별과 기기별 지원표 대조가 필요하다.

## 출처

- [Phosh](https://phosh.mobi/)
- [Plasma Mobile](https://plasma-mobile.org/)
- GeekNews, 2026-10-13 제공 발췌: Linux 폰은 Android/iOS 양강 체제의 실용적인 대안이 될 수 있을까? (원문 식별 대기)

## 관련 문서

- [[Linux-File-System|Linux 파일시스템]]
- [[Self-Hosting-Small-Server|소형 서버 셀프호스팅]]
