---
tags: [os, process, observability, macos, windows, permissions]
status: done
verified_at: 2026-11-16
category: "OS&런타임(OS&Runtime)"
aliases: ["Process Inspection Tools", "프로세스 관찰 도구", "Process Explorer", "Procexp-Mac"]
---

# 프로세스 관찰 도구: 보이는 정보와 권한 경계

프로세스 관찰 도구는 실행 중인 프로세스의 트리와 각 프로세스가 연 자원(파일과 핸들, 적재한 라이브러리, 스레드, 네트워크 연결)을 보여 주고 종료나 일시 정지 같은 제어를 제공한다. 무엇을 보여 줄 수 있는지는 OS가 공개한 API와 도구가 얻은 권한이 정한다. 같은 이름의 도구라도 OS가 다르면 보이는 범위가 다르다.

## 무엇을 보여 주나

Windows의 Sysinternals Process Explorer는 위 창에 현재 프로세스 목록과 소유 계정을 보여 주고, 아래 창에는 모드에 따라 선택한 프로세스가 연 핸들이나 적재한 DLL과 메모리 매핑 파일을 보여 준다. 특정 핸들이나 DLL을 가진 프로세스를 찾는 검색이 있어 어떤 프로그램이 파일이나 디렉터리를 붙잡고 있는지, DLL 버전 문제와 핸들 누수가 어디서 생기는지 추적하는 데 쓴다. 명령행 도구로는 Handle, ListDLLs, PsList가 같은 정보를 나눠 맡는다.

Microsoft가 GitHub에 공개한 macOS판 Procexp-Mac은 같은 사용 경험을 Swift, SwiftUI와 AppKit으로 구현한 네이티브 앱이다. README 기준으로 macOS 14 이상에서 다음을 제공한다.

- 실시간 프로세스 트리와 적재한 이미지, 파일 디스크립터, 스레드를 보는 아래 창
- 프로세스별 TCP/IP 연결과 TCP 상태, 환경 변수, 문자열
- 서명자, 인증서 체인, Team ID, 공증 상태, SHA-256 같은 코드 서명 정보와 VirusTotal 조회
- CPU, 메모리, 스왑, 디스크와 네트워크 I/O, GPU 그래프와 Apple Silicon의 성능 코어, 효율 코어 구분

데이터는 `libproc`, `sysctl`, Mach host 통계, Security.framework, IOKit과 Metal 같은 공개 API에서 읽는다.

## 권한이 보이는 범위를 정한다

| 실행 방식 | 보이는 범위 | 제어 |
|---|---|---|
| 일반 권한 | 같은 사용자의 프로세스 상세. 다른 사용자와 시스템 프로세스는 목록과 상세가 일부만 보일 수 있다 | 권한이 필요 없는 범위 |
| 권한 있는 헬퍼 사용 | 다른 사용자 프로세스까지 포함한 전체 목록, 스레드, 모듈, 환경 변수 | 권한이 필요한 프로세스 제어 |

Procexp-Mac의 헬퍼는 XPC로 통신하는 launchd 데몬이고 `SMAppService`로 등록한다. Apple 문서 기준으로 macOS 13 이상에서 앱 번들 안의 LaunchDaemon은 등록해도 관리자가 시스템 설정에서 승인하기 전에는 시작되지 않고, 승인한 뒤에는 부팅마다 시작된다. 승인을 기다리거나 사용자가 승인을 철회하면 상태가 `requiresApproval`이다. README는 헬퍼를 쓰려면 앱이 ad-hoc이 아닌 안정된 서명으로 서명돼야 하고, System Settings > General > Login Items & Extensions에서 한 번 승인하며, 여러 번 다시 설치하면 승인이 지워질 수 있다고 적는다. 등록이 거부되면 앱은 그 사실을 알리고 일반 권한으로 계속 동작한다.

공개 API가 모든 정보를 주지는 않는다. README는 macOS가 Process Explorer의 데이터 원천을 모두 공개 API로 노출하지는 않으며, 접근이 거부되거나 지원되지 않는 값은 지어내지 않고 비워 둔다고 밝힌다. 일부 값은 같은 사용자의 프로세스이거나 헬퍼가 켜져 있을 때만 나온다. 빈 칸을 0이나 정상 값으로 읽지 않고 권한과 API 범위부터 확인한다(해석).

## 도입 전 확인

다음은 위 근거에서 도출한 점검 제안이다.

- 권한 있는 헬퍼를 승인하기 전에 서명 주체와 헬퍼가 할 수 있는 일을 확인한다. 승인은 관리자 권한의 데몬을 부팅마다 띄운다는 뜻이다.
- 2026-11-16 확인한 저장소에는 LICENSE 파일이 없고 GitHub의 라이선스 정보도 비어 있다. 1.0.0 릴리스(2026-11-05)가 DMG를 제공하지만 사용, 수정과 재배포 조건은 정해지지 않은 상태이므로 조직에 들이기 전에 라이선스 공지를 확인한다.
- VirusTotal 조회처럼 외부 서비스에 보내는 기능은 무엇이 전송되는지 확인하고 사내 정책과 맞춘다.

## 출처

- [Microsoft Learn, Process Explorer](https://learn.microsoft.com/en-us/sysinternals/downloads/process-explorer) — 2026-11-05 게시(페이지 표기). 화면 구성, 핸들 모드와 DLL 모드, 용도와 관련 명령행 도구를 2026-11-16 대조
- [microsoft/Procexp-Mac — GitHub](https://github.com/microsoft/Procexp-Mac) — 2026-11-16 README, 루트 파일 목록과 GitHub API의 라이선스 값, 릴리스 목록 확인. 기능, 공개 API, 헬퍼 승인과 일반 권한 동작, 빈 값 정책
- [Apple Developer Documentation, SMAppService](https://developer.apple.com/documentation/servicemanagement/smappservice) — macOS 13 이상의 LoginItem, LaunchAgent, LaunchDaemon 등록
- [Apple Developer Documentation, SMAppService register()](https://developer.apple.com/documentation/servicemanagement/smappservice/register()) — 관리자 승인 전 LaunchDaemon이 시작되지 않는 조건
- [Apple Developer Documentation, SMAppService.Status.requiresApproval](https://developer.apple.com/documentation/servicemanagement/smappservice/status-swift.enum/requiresapproval) — 승인 대기와 철회 상태
- [Microsoft, macOS용 Process Explorer 공개 — GeekNews](https://news.hada.io/topic?id=36980)

## 관련 문서

- [[Process-Lifecycle|프로세스 생명주기]]
- [[File-Descriptor-Limit|File descriptor limit]] — 프로세스가 연 파일과 한도
- [[Desktop-Window-Management|데스크톱 창 관리]] — macOS 도구의 손쉬운 사용 권한, 서명과 공증 확인
- [[OS기초(OSFundamentals)|OS 기초]]
