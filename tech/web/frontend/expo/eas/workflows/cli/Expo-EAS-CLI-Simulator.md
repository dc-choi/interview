---
tags: [expo, eas, workflows]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Simulator 실험 CLI"]
---

# EAS Simulator 실험 CLI

## 원격 session

simulator(sim:start/simulator:start)는 원격 Android/iOS session을 시작한다. 현재 experimental이며 sim:availability로 계정 제공 여부를 확인한다. sim:list/get/events/stop으로 session 상태를 관리하고 sim:exec는 session 환경을 로드한다.

Build ID, fingerprint, application archive URL 또는 Expo Go 중 원하는 앱 공급 방식을 선택한다. device, launch-arg, open-url과 SDK version을 지정할 수 있다. Session type은 agent-device/appium/argent/web-preview-only이며 모두 web preview를 포함하지만 마지막 유형에는 automation interface가 없다.

## 수명과 설정 파일

name/tag로 구분하고 최대 실행 시간과 idle timeout을 정한다. 최대 duration customization은 유료 plan 조건이 있다. Idle timeout을 생략하면 idle 상태만으로 종료되지 않고 최대 시간까지 유지된다.

기본 force=true는 기존 session 정보가 있어도 새 session을 만들 수 있다. 작업 후 정확한 session ID로 stop하고 상태를 확인한다. 연결 정보는 기본 .env.eas-simulator에 저장하며 --out-config-type env는 shell export를 출력한다. 이 파일/출력을 Git이나 공개 문서에 넣지 않는다.

## Local egress

현재 iOS의 --egress local은 proxy를 따르는 HTTP(S)/WebSocket 등의 요청을 로컬 PC를 통해 보낸다. --egress-allow는 허용할 정확한 host:port 목록이다. localhost/127.0.0.1은 해당 port를 로컬 PC로 forward한다.

Egress client가 끊기면 이 요청은 실패한다. Proxy와 환경 변수를 모두 무시하는 연결은 simulator에서 거절되고 로그에 표시된다. 원격 session에 내부 network 접근을 열 때 필요한 destination만 허용한다. 모든 트래픽이 어떤 조건에서도 투명하게 통과하는 VPN으로 설명하지 않는다.

## 출처

- [Expo Documentation, EAS CLI reference](https://docs.expo.dev/eas/cli)

## 관련 문서

- [[Expo-EAS-CLI-Reference]]

- [[Expo]]
