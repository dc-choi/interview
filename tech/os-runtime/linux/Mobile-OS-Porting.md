---
tags: [os, mobile, xnu, ios, android, porting, bring-up, device-tree]
status: done
verified_at: 2026-10-27
category: "OS&런타임(OS&Runtime)"
aliases: ["Mobile OS Porting", "모바일 OS 이식", "iOS on Android", "HackiOS", "HakiOS", "ios-sweet", "XNU 이식"]
---

# 모바일 OS 이식: 부팅 성공과 실사용 사이

한 기기용 OS를 다른 SoC의 휴대전화에서 돌리는 이식은 부트 체인, 커널, 기기 기술(device tree), 드라이버, 사용자 공간과 보안 모델을 각각 옮기거나 우회하는 작업이다. 홈 화면까지 부팅하는 것은 첫 관문이고 통신, GPU, 보안 칩과 앱 생태계가 실사용을 정한다. 이 관점은 [[Linux-Mobile-Platform|Linux 모바일]]의 기기 계약과 같다. 아래 사례는 2026년 10월 Qualcomm SoC Android 휴대전화에서 iOS 16 사용자 공간을 부팅했다고 밝힌 두 공개 프로젝트이며, 기능 설명은 각 저장소 README의 자기 보고(2026-10-27 확인)다.

## 계층별로 옮기는 것

| 계층 | 하는 일 | 사례에서의 처리 |
|---|---|---|
| 부트 체인 | 잠금 해제한 부트로더에서 자체 로더를 실행한다 | `fastboot boot`로 로더를 RAM에 올려 boot 파티션을 바꾸지 않는다. ios-sweet는 MMU를 직접 설정하고 실행 중인 FDT를 읽는 bare-metal shim을, HakiOS는 기기별 UEFI 포트 위에서 도는 EFI 애플리케이션 로더를 쓴다 |
| 커널 | 공개된 커널 소스를 새 SoC에 맞게 패치한다 | Apple이 APSL 2.0으로 공개한 XNU의 iOS 16 세대(xnu-8796 계열)를 쓴다. ios-sweet 기준으로 pointer authentication이 없는 ARMv8.2 코어, Apple 실리콘의 FIQ가 아니라 GICv3 Group 1 IRQ로 오는 타이머, PSCI로 깨우는 보조 코어에 맞추고, Apple 내부 구성요소 자리에는 stub이나 대체 구현(corecrypto를 쓰지 않는 난수 생성기, 최소 AMFI 등)을 넣는다 |
| 기기 기술 | 하드웨어 배치를 커널이 기대하는 형식으로 옮긴다 | Android 기기의 device tree에서 주소, 인터럽트와 전원 레일을 읽어 Apple Device Tree를 만들고, IPSW의 device tree에서 뽑은 실제 iPhone 기종 정보를 넣어 iOS가 특정 iPhone으로 인식하게 한다 |
| 드라이버 | 저장장치, 화면, 입력과 전원부터 새로 쓴다 | UFS 호스트, 부트로더가 남긴 프레임버퍼를 iOS 화면 서비스로 노출하는 드라이버, I2C 터치, PMIC 버튼, 배터리. GPU, Wi-Fi, 오디오 DSP, 모뎀과 카메라가 다음 단계다 |
| 사용자 공간 | 수정하지 않은 OS 사용자 공간을 올린다 | 사용자가 Apple 서버의 IPSW로 직접 이미지를 만든다. launchd, 시스템 데몬, backboardd, SpringBoard와 기본 앱이 뜬다 |
| 보안 모델 | 서명과 격리 검사를 끄거나 흉내 낸다 | 코드 서명(AMFI)과 sandbox 정책을 permissive로 두고 키 저장소를 stub으로 둔다. Secure Enclave가 없어 Face ID와 Apple 계정은 쓸 수 없다 |

## 두 사례 비교

| 항목 | ios-sweet | HakiOS(HackiOS) |
|---|---|---|
| 기기 | Redmi Note 10 Pro (SM7150, Snapdragon 732G) | POCO X5 Pro 5G (Snapdragon 778G) |
| 사용자 공간 | iPhone X용 iOS 16.7.16 | iOS 16.5 |
| 커널 | xnu-8796 | xnu-8796.121.2 |
| 설치 | iOS 루트를 userdata 파티션에 기록해 Android 사용자 데이터를 지운다. boot 파티션은 바꾸지 않는다 | 기본으로는 기기에 기록하지 않고 세션 동안 시스템을 RAM에 둔다. 재부팅하면 Android로 돌아간다(`/private/var` 유지는 선택) |
| 화면 | GPU 드라이버 없이 CPU가 초당 20~30프레임으로 그린다 | Adreno에서 Mesa 기반 OpenGL ES로 렌더링하고 Metal은 없다 |
| 통신과 입력 | Wi-Fi, Bluetooth, 셀룰러, 오디오, 카메라, 센서와 GPS가 없고 앱에서 나가는 제스처가 아직 동작하지 않는다 | 터치, 스피커와 마이크, Wi-Fi, 카메라, 진동이 동작한다고 밝힌다. 셀룰러는 진행 중이고 Bluetooth와 충전은 아직이다 |
| CPU | 8코어 중 Cortex-A55 6개 | 8코어 전체 |
| 기타 | 첫 부팅에 약 4~5분. QEMU는 커널 시험용 | QEMU `virt`에서도 같은 시스템을 실행 |
| 공개 | 2026-10-14 생성 저장소, 루트 LICENSE는 MIT. XNU 파생 패치에 적용되는 범위는 추가 확인 필요 | 2026-10-22 생성 저장소. 커널 패치는 APSL 2.0이라고 명시 |

두 프로젝트 모두 iOS 파일을 저장소에 넣지 않고 사용자가 Apple 서버에서 받은 IPSW로 이미지를 만들게 한다. HakiOS는 GPU, Wi-Fi, 모뎀 등의 펌웨어도 사용자가 자기 휴대전화에서 꺼내도록 한다. HakiOS는 커널 패치를 APSL 2.0으로 명시하지만 ios-sweet의 루트 MIT 표기만으로 XNU 파생 코드까지 MIT라고 판단하지 않는다. Apple APSL 2.0의 2.2(c)는 외부 배포하는 수정 코드의 소스를 같은 라이선스 조건으로 제공하도록 요구한다. 패치별 고지와 적용 범위는 추가 확인이 필요하다. OS 사용자 공간과 기기 펌웨어는 별도의 바이너리라 재배포 경계도 갈린다.

## 실사용 판단 질문

- 무엇이 하드웨어 가속이고 무엇이 stub인가. GPU 드라이버가 없으면 CPU 렌더링이 화면 갱신과 전력을 제한한다.
- 셀룰러, Wi-Fi, Bluetooth, 충전과 대기 전력이 동작하는가([[Linux-Mobile-Platform#실제 사용 전 검증|실제 사용 전 검증]]).
- 보안 모델이 어디까지 꺼져 있는가. 코드 서명과 sandbox가 permissive이고 데이터 보호가 없으면 개인 데이터를 두지 않는다. ios-sweet README도 같은 경고를 둔다.
- 설치가 무엇을 지우거나 바꾸는가. userdata를 지우는 방식과 RAM에서만 도는 방식은 되돌리는 비용이 다르다. 시도 전에 기기별 보정 데이터가 든 persist, modem 관련 파티션을 백업하라는 안내를 확인한다.
- 재현 가능한가. 공개 소스, 빌드 절차와 독립 재현 보고가 있는지 보고, 시연 영상만으로 동작 범위를 판단하지 않는다.
- 사용권과 재배포 조건이 맞는가. Apple iOS 16 SLA 2(a)의 사용 허락은 Apple 브랜드 기기 한 대로 한정한다. 비Apple 기기에 이식한 커널의 공개 라이선스가 iOS 사용자 공간의 실행 권한까지 주지는 않는다. 관할법에 따른 적용과 집행 판단은 별도다.

## 확인 수준

- 확인한 것: 두 저장소의 README와 메타데이터(생성일, 라이선스 표기), Apple XNU 저장소의 APSL 2.0 라이선스와 xnu-8796 태그. 기능 표는 프로젝트의 자기 보고이며 직접 실행하거나 독립 재현을 확인하지 않았다.
- 시점 차이: 2026-10-19 보도는 당시 HackiOS의 공개 소스와 독립 검증이 없다고 전했고, 커널과 userland 저장소의 생성일은 둘 다 2026-10-22다(공개 전환 시점은 미확인). 생성일만으로 보도 당시의 공개 여부를 판정하지 않는다. 같은 보도가 전한 다른 기기(Redmi Note 12, Nothing 3a)의 시연 영상은 원문을 확인하지 않았다.
- 이해관계: HackiOS 웹사이트 소스(2026-10-21 커밋)의 설정 파일에 BNB Chain 기반 토큰 정보가 들어 있다. 기술 주장을 평가할 때 홍보 동기를 함께 본다.
- 미확인: Apple 사용권의 관할법별 적용과 집행, ios-sweet 파생 패치별 라이선스 고지, README 이후의 진행 상황.

## 출처

- [dipa-studio/ios-sweet — GitHub](https://github.com/dipa-studio/ios-sweet) — README 2026-10-27 확인
- [oosexgang/hackios-xnu-kernel — GitHub](https://github.com/oosexgang/hackios-xnu-kernel) — HakiOS README 2026-10-27 확인
- [oosexgang/hackios-web — GitHub](https://github.com/oosexgang/hackios-web) — 웹사이트 소스의 토큰 설정 확인
- [Apple, iOS 16 and iPadOS 16 Software License Agreement](https://www.apple.com/legal/sla/docs/iOS16_iPadOS16.pdf) — 2026-10-28 2(a)의 사용 허락 범위 대조
- [Apple Public Source License 2.0 — Apple](https://github.com/apple-oss-distributions/xnu/blob/main/APPLE_LICENSE) — 2026-10-28 2.2(b), 2.2(c) 대조
- [oosexgang/hackios-xnu-userland — GitHub](https://github.com/oosexgang/hackios-xnu-userland) — 2026-10-28 생성일 메타데이터 대조
- [apple-oss-distributions/xnu — GitHub](https://github.com/apple-oss-distributions/xnu)
- [Hackers Are Running Apple's iOS on Android Phones for the First Time — Decrypt](https://decrypt.co/381351/Calif.io) — 2026-10-19 보도
- [HackiOS - Android 휴대폰에서 실제 iOS 16.5 실행하기 — GeekNews](https://news.hada.io/topic?id=35830) — 2026-10-23 소개 글, 원문 식별에 사용

## 관련 문서

- [[Linux-Mobile-Platform|Linux 모바일: 운영체제보다 기기 계약]]
- [[Android-Device-Debloat|Android 기기의 광고 줄이기]]
