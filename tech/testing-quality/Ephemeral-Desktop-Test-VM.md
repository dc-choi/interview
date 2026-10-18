---
tags: [testing, windows, vm, isolation, e2e]
status: done
category: "테스트&품질(Testing&Quality)"
aliases: ["Ephemeral Desktop Test VM", "일회용 데스크톱 테스트 VM"]
---

# 일회용 데스크톱 테스트 VM

데스크톱 E2E 테스트에서 실행기와 테스트 대상 OS를 분리하면 기존 CI에서 원격 앱을 제어할 수 있다. 테스트마다 새 VM을 할당하고 폐기하면 이전 실행의 파일, 레지스트리와 로그인 상태가 남는 문제를 줄인다.

## 준비된 VM 풀의 수명주기

1. 기준 이미지로 VM을 만들고 부팅과 로그인, 제어 도구 준비를 완료한다.
2. 스케줄러가 한 실행에 한 VM을 할당하고 제어 주소를 전달한다.
3. 실행기는 앱을 설치하고 브라우저와 네이티브 앱을 제어한다.
4. 로그와 화면 기록을 수집하고, 실행 종료나 유실 시 VM을 회수해 폐기한다.
5. 새 VM으로 풀을 보충한다.

warm pool은 부팅 지연을 감추는 대신 유휴 비용을 쓴다. VM 폐기는 외부 DB와 공유 계정의 상태까지 초기화하지 않으므로 실행별 데이터 격리도 필요하다.

## QA Wolf 사례

2026-10-15 발췌와 QA Wolf의 10-14 엔지니어링 글을 10-16에 대조했다. Kubernetes 스케줄러가 GCE Windows VM을 관리하고, 테스트 코드는 Linux pod에 남는다. 브라우저는 Playwright/CDP, 네이티브 앱은 WebdriverIO/Appium/WinAppDriver로 다룬다. 화면은 별도 에이전트가 전송하고 기록한다.

부팅과 로그인을 마친 풀로 2~3분의 콜드 스타트 대기를 줄이는 사례다. 매 실행 앱 설치, 준비 VM 비용, 기준 이미지 업데이트와 Windows 라이선스도 운영 조건이다. 실제 배포나 성능 측정은 하지 않았다.

## 검증 포인트

중복 할당, 실행기 종료 뒤 회수, 로그인 세션 유실, 풀 고갈, 기준 이미지 갱신과 실패 산출물 보존을 시험한다. VM이 실행 중이라는 상태와 UI 자동화가 가능한 준비 상태를 구분한다.

## 출처

- [E2exe: How we solved Windows desktop automation for enterprise scale — QA Wolf](https://www.qawolf.com/blog/how-we-solved-windows-desktop-automation)

## 관련 문서

- [[Device-Farm|디바이스 팜과 lease]]
- [[Test-Isolation|테스트 격리]]
- [[Agentic-Verification|에이전트 기반 검증]]
