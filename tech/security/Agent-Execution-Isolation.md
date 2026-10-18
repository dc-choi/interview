---
tags: [security, agent, sandbox, least-privilege]
status: done
verified_at: 2026-10-16
category: "보안(Security)"
aliases: ["Agent Execution Isolation", "에이전트 실행 격리", "MXC"]
---

# 에이전트 실행 격리

에이전트가 읽을 자료와 실행할 도구를 제한하는 권한 경계는 모델 외부에서 강제한다. 모델이 지시를 따르려 한다는 기대와 실제 파일, 네트워크, 자격 증명 접근 통제는 서로 다른 보호 장치다.

## 경계를 나누는 방법

| 자원 | 확인할 통제 |
| --- | --- |
| 파일 | 필요한 입력만 읽기, 작업 디렉터리만 쓰기, 호스트 자격 증명 경로 차단 |
| 네트워크 | 목적지와 송수신 정책, 내부 서비스와 메타데이터 접근, 프록시 우회 여부 |
| 도구 | 사용자 권한과 작업별 권한, 고위험 동작의 승인, 자격 증명 수명 |
| 실행 | 시간과 자원 제한, 자식 프로세스, 취소 뒤 정리와 결과 보존 |
| 관측 | 도구 호출, 차단과 외부 통신 기록, 이상 탐지와 강제 중지 |

정책 파일이 존재하는 것과 선택한 백엔드가 그 정책을 실제로 강제하는 것은 다르다. 허용된 정상 작업과 거절돼야 할 작업을 모두 시험한다. 프롬프트만으로 비밀 파일 접근이나 외부 전송을 차단했다고 판단하지 않는다.

## MXC의 공통 API와 백엔드 차이

2026-10-16 Microsoft 공식 README 기준, MXC는 앱에 내장하는 Rust, .NET, Node SDK다. Windows, Linux, macOS에서 OS 프로세스 샌드박스부터 VM까지 여러 백엔드를 같은 요청 모델로 다룬다. 파일 경로의 읽기/쓰기/차단, 네트워크와 GUI 정책을 제공하지만 기능 강도는 백엔드별로 확인해야 한다.

생성, 시작, 명령 실행, 정지와 제거의 수명주기도 다룬다. 일부 VM 백엔드는 실험 상태다. `--audit`은 분석 대상의 샌드박스 보안을 끄므로 신뢰하지 않는 코드에 사용하지 않는다. SDK의 존재를 특정 호스트에서의 격리 성공 증거로 삼지 않는다. 실제 설치와 탈출 저항 시험은 하지 않았다.

## 내부자 위험과 사고 해석

다음 두 입력은 재사용할 보안 관점을 제공하지만 개별 사고 원인의 확정 근거와 구분한다.

- **2026-10-12, 모델도 내부자 위험으로 다뤄야 한다**: 민감한 데이터와 업무 권한을 가진 주체는 악의가 없어도 실수하거나 침해될 수 있다는 관점이다. 지능의 공급과 권한 부여를 분리하고 제공자의 보증과 사용 조직의 책임을 구분한다. 공개 기고 URL은 식별했으나 본문 전체 대조는 미완료다.
- **2026-10-15, 프론티어 AI 랩의 보안 기본**: 제공 발췌에는 Hugging Face 관련 사고를 격리 구성과 외부 통신, 며칠간의 탐지 실패로 해석하는 전문가 비판이 있다. 보안 운영을 AI 행동 정렬만의 문제로 축소하지 않는 교훈으로 연결한다. 사고의 포렌식 원문과 전체 영향은 확인하지 않았으므로 발췌의 사건 서술은 미검증 사례다.

후속 확인은 모델 평가가 아니라 선택한 실행 환경의 정책 행렬, 외부 통신 경로와 사고 원문이다.

## 출처

- [Microsoft eXecution Container — Microsoft](https://github.com/microsoft/mxc)
- [Models as Insider Risks in the Super Intelligence Era — Satya Nadella](https://x.com/satyanadella/article/2108931348857827686) (원문 전체 대조 미완료)
- [AI agents aren’t ‘going rogue.’ Frontier labs are skipping security basics. — CSO](https://www.csoonline.com/article/4234854/ai-agents-arent-going-rogue-frontier-labs-are-skipping-security-basics.html) (제공 발췌 식별, 사고 기술 검증 근거로 사용하지 않음)

## 관련 문서

- [[LLM-Application-Security|LLM 애플리케이션 보안]]
- [[Access-Control-Models|접근 제어 모델]]
- [[Security-Incident-Response|사고 대응]]
