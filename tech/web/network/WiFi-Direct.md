---
tags: [network, wireless, wifi, p2p, android]
status: done
verified_at: 2026-11-17
category: "Web - 네트워크"
aliases: ["Wi-Fi Direct", "와이파이 다이렉트", "Wi-Fi P2P", "Wi-Fi Peer-to-Peer", "그룹 오너", "Group Owner"]
---

# Wi-Fi Direct

Wi-Fi Direct는 액세스 포인트(AP) 없이 Wi-Fi 기기끼리 직접 연결하는 Wi-Fi Alliance의 기술이다. Windows 문서는 이를 Wi-Fi Alliance의 Wi-Fi Peer-to-Peer Technical Specification을 바탕으로 한 기능으로 설명하며, 운영체제 API에서는 Wi-Fi P2P라는 이름으로도 나타난다. 일대일 연결과 여러 기기가 함께 붙는 그룹 연결을 모두 만들 수 있다.

## 기존 Wi-Fi와 무엇이 다른가

| 구분 | 인프라 모드 | Wi-Fi Direct |
|---|---|---|
| 중계 장비 | AP를 거친다 | 없음 |
| 역할 | AP와 단말 | 그룹 안에서 한 기기가 그룹 오너(GO), 나머지는 클라이언트 |
| 인터넷 | AP의 상위망을 쓴다 | 연결 자체는 인터넷 없이 성립 |

- **그룹 오너가 AP 역할을 맡는다.** Android의 `createGroup()`은 현재 기기를 그룹 오너로 하는 그룹을 만들며, P2P를 지원하지 않는 기존 Wi-Fi 기기는 이 그룹 오너를 일반 AP처럼 보고 접속한다. 연결 뒤 클라이언트는 그룹 오너의 주소(`groupOwnerAddress`)로 소켓 통신을 연다.
- **애드혹 모드의 대체.** Windows 문서는 Wi-Fi Direct의 목표를 AP도 기존 애드혹(IBSS) 방식도 쓰지 않는 기기 간 연결로 설명하고, Windows 8.1과 Windows Server 2012 R2부터 애드혹 모드 대신 Wi-Fi Direct를 쓰라고 안내한다.
- **인터넷과 동시에 쓸 수 있다.** Wi-Fi Alliance는 인터넷 연결 없이 기기끼리 자체 네트워크를 만든다고 설명한다. Android 문서는 P2P 연결이 생겨도 기기가 모바일망 같은 다른 상위 연결을 유지해 인터넷을 쓴다고 적는다.

## 연결 과정

Wi-Fi P2P Technical Specification v1.5(2014) 기준이며, R2를 포함한 현행 규격의 세부 절차는 이 문서에서 대조하지 않았다. 아래 순서는 두 기기가 새 그룹을 만드는 GO 협상 경로다. 이미 있는 그룹에 붙는 경로는 목록 뒤에 따로 적는다.

1. **기기 탐색(device discovery):** 주변의 P2P 기기를 찾는다. Android는 `discoverPeers()`이며, 연결 전에 Bonjour나 UPnP 서비스를 찾는 pre-association service discovery도 제공한다.
2. **설정 방식 합의(provision discovery):** 그룹 형성 전에 어떤 WPS(Wi-Fi Protected Setup) 설정 방식을 쓸지 상대와 맞춘다. 새 그룹 형성에서는 선택 절차다. P2P 기기끼리는 푸시 버튼(PBC), PIN(화면 표시, 입력)과 NFC를 쓰고, 규격은 P2P 기기 사이의 라벨 방식을 금지한다. Android의 `WpsInfo`에 있는 `LABEL`은 WPS 일반 상수이고, Windows API의 설정 방식도 푸시 버튼, PIN 표시, PIN 입력 세 가지다.
3. **그룹 오너 협상(group owner negotiation):** 누가 그룹 오너가 될지 정한다. 각 기기가 내는 group owner intent 값이 협상에 쓰이며, Android의 `WifiP2pConfig.groupOwnerIntent`는 0(가장 덜 원함)부터 15(가장 원함)까지이고 기본값은 자동(`-1`)이다.
4. **프로비저닝(provisioning):** 그룹 오너가 WPS 등록자(Registrar), 클라이언트가 등록 대상(Enrollee)이 되어 그룹 접속 자격 증명을 주고받는다. 규격은 그룹 형성을 GO 협상으로 시작해 프로비저닝으로 끝나는 과정으로 정의한다.
5. **연결 완료:** 클라이언트가 그룹에 접속하면 그룹 오너와 IP 통신을 연다.

이미 운영 중인 그룹에 붙는 경로는 다르다.

- **초대(invitation):** 선택 절차다. 그룹 쪽이 상대를 초대하면 provision discovery와 자격 증명 교환은 초대 뒤에 그룹 오너의 운영 채널에서 이뤄진다. Windows API도 GO 협상과 초대를 서로 다른 페어링 절차로 둔다.
- **직접 참가:** 자격 증명이 없는 기기는 초대 없이 그룹 오너에게 provision discovery를 보내고 프로비저닝을 거쳐 참가할 수 있다. 이 경로에서는 provision discovery가 필수다.
- **persistent 그룹 재가동:** 이전에 받은 자격 증명을 저장해 둔 그룹은 그 자격 증명으로 다시 붙으므로 프로비저닝을 반복하지 않는다.

Android API 35부터는 그룹 생성 실패 사유에 초대 실패와 provision discovery 실패가 따로 있어, 앱에서도 어느 단계에서 막혔는지 구분할 수 있다.

## 보안

Android API 36의 `WifiP2pConfig`는 그룹 오너의 보안 모드를 세 가지로 둔다. 기존 기기용 WPA2-Personal, WPA3-Personal과 WPA2-Personal을 함께 받는 호환 모드, Wi-Fi Direct R2 기기만 받는 WPA3-Personal 전용 모드다. 기기가 R2를 지원하는지에 따라 쓸 수 있는 보안 수준이 달라지므로, 오래된 기기와 연결해야 하는 제품은 WPA2 호환 범위를 확인한다.

## 개발 체크포인트

- 권한은 앱의 target SDK로 갈린다. Android 13(API 33) 이상을 타깃하는 앱은 `discoverPeers()`와 `connect()`에 `NEARBY_WIFI_DEVICES`가 필요하고, 더 낮은 버전을 타깃하는 앱은 대신 `ACCESS_FINE_LOCATION`이 필요하다. 위치 추정에 쓰지 않는다는 `neverForLocation` 선언 여부와 위치 모드 조건은 Android 가이드에서 함께 확인한다.
- 그룹 오너를 특정 기기(예: 화면을 받는 TV, 프린터)로 두고 싶으면 그 기기의 intent를 높게 두거나 `createGroup()`으로 미리 그룹을 만든다. intent는 협상에 반영되는 선호도라 결과를 보장하지 않으므로 연결 뒤 `isGroupOwner`로 실제 역할을 확인한다.
- 지원 대역과 PHY 세대, 실제 전송 속도는 이 문서의 출처가 정하지 않는다. Android는 그룹 오너 대역을 2.4GHz, 5GHz, 6GHz(6GHz는 API 36)로 지정하는 상수를 두지만 기기가 지원해야 쓸 수 있다. 블루투스보다 빠르다는 비교는 기기 조합마다 측정해 확인한다.

## 출처

- [Wi-Fi Alliance, Alternative Topologies (Wi-Fi Direct)](https://www.wi-fi.org/discover-wi-fi/wi-fi-direct)
- [Android Developers, Wi-Fi Direct (peer-to-peer or P2P) overview](https://developer.android.com/develop/connectivity/wifi/wifip2p)
- [Android Developers, WifiP2pManager](https://developer.android.com/reference/android/net/wifi/p2p/WifiP2pManager)
- [Android Developers, WifiP2pConfig](https://developer.android.com/reference/android/net/wifi/p2p/WifiP2pConfig)
- [Android Developers, WpsInfo](https://developer.android.com/reference/android/net/wifi/WpsInfo)
- [Microsoft Learn, About the Wi-Fi Direct feature](https://learn.microsoft.com/en-us/windows/win32/nativewifi/about-the-wi-fi-direct-api)
- [Microsoft Learn, WiFiDirectConnectionParameters.GroupOwnerIntent](https://learn.microsoft.com/en-us/uwp/api/windows.devices.wifidirect.wifidirectconnectionparameters.groupownerintent)
- [Microsoft Learn, WiFiDirectConfigurationMethod](https://learn.microsoft.com/en-us/uwp/api/windows.devices.wifidirect.wifidirectconfigurationmethod)
- [Microsoft Learn, WiFiDirectPairingProcedure](https://learn.microsoft.com/en-us/uwp/api/windows.devices.wifidirect.wifidirectpairingprocedure)
- [Wi-Fi Alliance, Specifications](https://www.wi-fi.org/discover-wi-fi/specifications) — 현행 Wi-Fi Direct 규격의 공식 배포 목록. 이 문서에서는 현행판(R2 포함)을 대조하지 않음
- [Wi-Fi Alliance, Wi-Fi Peer-to-Peer (P2P) Technical Specification v1.5](https://cse.iitkgp.ac.in/~bivasm/sp_notes/wifi_direct_2.pdf) — 대학 강의 자료로 공개된 사본. 3.1.4절 그룹 형성, provision discovery와 프로비저닝 순서, 라벨 방식 금지 대조
- [YouTube, 길리랩 - 실전 구현 랩, #NW 0039 - 공유기 없이 기기끼리 직접 연결? 와이파이 다이렉트 90초 완벽 정리](https://www.youtube.com/watch?v=sMJes-7AmXE) — 학습 계기. 사실은 위 공식 문서로 대조했고 802.11n 기반, 소프트웨어 업그레이드만으로 구현 같은 영상의 주장은 확인하지 못해 쓰지 않음

## 관련 문서

- [[WiFi-Generations|Wi-Fi 세대와 연결 구간 진단]]
- [[Network-Security-Lab-Interpretation|네트워크 보안 시연을 해석하는 기준]]
- [[Realtime-Communication-Comparison|실시간 통신 기술 비교]]
- [[네트워크(Network)|네트워크 인덱스]]
