---
tags: [infrastructure, aws, ssm, systems-manager, parameter-store, patch-manager, session-manager]
status: done
category: "Infrastructure - AWS"
aliases: ["SSM", "AWS Systems Manager", "Systems Manager"]
verified_at: 2026-07-21
---

# AWS Systems Manager (SSM)

**EC2, 온프레미스 인프라**를 운영하는 **통합 관리 도구 모음**. 패치, 구성, 세션, 자동화, 인벤토리를 단일 콘솔에서 처리한다. **SSM Agent**가 설치된 노드라면 AWS, 온프레미스, 다른 클라우드 모두 동일하게 관리 가능.

## SSM Agent — 전제 조건

- 대부분 AWS AMI(Amazon Linux, Ubuntu, Windows Server)에 **사전 설치**
- 노드는 환경에 맞는 IAM 권한과 Systems Manager 등록이 필요. EC2는 instance profile 또는 조건을 충족한 Default Host Management Configuration, 하이브리드와 멀티클라우드 노드는 service role과 managed-instance activation 등을 사용
- 에이전트가 SSM 엔드포인트와 통신 → **인바운드 포트 개방 불필요** (아웃바운드만)

## 주요 도구

### Parameter Store

**구성, 비밀**을 안전하게 저장 (자세한 내용은 [[SSM-Parameter-Store]]).

- **Standard vs Advanced**: Standard 4 KB, 무료, Advanced 8 KB, TTL, 정책 지원 (유료)
- **String / StringList / SecureString** 3가지 유형. SecureString은 **KMS** 암호화
- 서비스별 참조 방식이 다르다. CloudFormation은 stack, change set 처리 중 `{{resolve:ssm:/db/url}}` dynamic reference를 해석한다. CodeBuild는 buildspec의 `env: parameter-store`를 사용할 수 있고, Lambda 런타임은 AWS SDK, Parameters and Secrets Lambda Extension 또는 Powertools 등으로 조회한다
- vs **Secrets Manager**:
  - **자동 회전, 교차 리전 복제 = Secrets Manager 강점**
  - **저비용, 일반 설정값 = Parameter Store 강점**

### Patch Manager

**Windows/Linux 패치 자동화**.

- **Patch Baseline**: 어떤 패치를 승인할지 규칙 정의 (자동 승인일, 심각도 필터)
- **Patch Group**: 태그로 인스턴스 그룹화 → 그룹별로 다른 베이스라인 적용 (예: prod는 보수적, dev는 즉시 적용)
- **Maintenance Window**와 결합해 정해진 시간에 패치 실행
- 패치 적용 결과를 **Compliance Report**로 추적

### Run Command

**대규모 인스턴스 그룹에서 명령 실행** — SSM의 시그니처 기능.

- SSH, 액세스 키 **불필요** (에이전트 + IAM 권한으로 충분)
- **수십~수천 대 동시 실행**, rate control(동시 실행 수, 오류 허용치) 지원
- 사용 시나리오:
  - 소프트웨어 설치, 업데이트
  - PowerShell, Bash 스크립트 실행
  - Windows Update 트리거
  - 설정 파일 일괄 변경
- 결과를 **S3, CloudWatch Logs**로 출력
- **EventBridge**로 트리거 가능 (이벤트 기반 자동화)

#### 명령 전달 실패와 실행 실패를 구분한다

부분 검증(2026-10-16): Run Command는 command 전체, 노드별 invocation과 document의 실행 블록인 plugin 상태를 따로 제공한다. 전체 `Success`만으로 모든 노드에서 의도한 변경이 끝났다고 판단하지 않는다. 태그에 맞는 대상이 없거나 일부 실행이 실패해도 집계 상태가 성공일 수 있다.

1. 대상 노드의 등록과 Agent 연결 상태, 호출자의 명령 실행 권한을 먼저 확인한다. 연결이 끊긴 상태에서 스크립트만 고치지 않는다.
2. `DeliveryTimedOut`은 전달 확인 경계, `ExecutionTimedOut`은 노드에서 시작한 실행의 시간 초과로 구분한다. Agent의 종료 응답을 받지 못한 경우에도 전달 시간 초과로 보고될 수 있다.
3. `Failed`이면 노드별 plugin의 종료 코드, 입력 파라미터와 실제 명령을 확인한다. 스크립트가 실패를 0으로 반환하지 않도록 하고, 원하는 상태 변화도 별도로 검사한다.
4. 기본 명령 출력은 앞의 24,000자만 반환된다. 전체 출력은 권한을 구성한 S3 또는 CloudWatch Logs로 보내고, Agent 자체 문제는 Linux의 `/var/log/amazon/ssm/amazon-ssm-agent.log`와 `errors.log`를 확인한다.

이 절은 공식 문서 기반 진단 순서이며 실제 인스턴스 장애를 재현한 결과는 아니다. 다른 SSM 기능 전체의 검증일은 유지한다.

### Session Manager

**SSH/RDP 없이** 브라우저, AWS CLI로 인스턴스 셸 세션.

- **22번 포트 개방 불필요, Bastion 호스트 불필요** — 공격면 대폭 감소
- 세션 설정과 권한을 구성하면 지원되는 셸 세션의 명령과 출력을 **S3, CloudWatch Logs**로 기록
- IAM 정책으로 사용자별, 인스턴스별 접근 제어
- 시험에서 **SSH 없이 인스턴스 접속** 또는 **Bastion 제거** → Session Manager

#### 접속 대상과 세션 소유자의 권한을 나눈다

부분 검증(2026-10-16): Session Manager의 IAM 예제 정책을 대조했다. 노드의 Agent 권한과 별개로, 접속하는 사용자나 역할의 세션 시작 권한을 구성한다.

- `ssm:StartSession`의 대상 노드와 허용할 Session document를 확인한다. 특정 노드 ARN으로 범위를 제한하거나 노드의 태그 조건을 사용할 수 있다. 태그 조건을 쓰더라도 세션 문서에 대한 권한을 함께 확인한다.
- `ssmmessages:OpenDataChannel`은 세션 데이터 채널 권한이다. `ssm:ResumeSession`, `ssm:TerminateSession`의 세션 리소스 범위도 별도로 제한해 다른 사용자의 세션을 조작하지 못하도록 구성한다.
- IAM 사용자용 `${aws:username}` 기반 종료 제한을 페더레이션 사용자에게 그대로 적용하지 않는다. 페더레이션 접근에는 공식 예제의 AWS 제공 세션 태그 방식 등 해당 인증 방식에 맞는 정책을 확인한다.
- CLI, Session Manager 콘솔과 EC2 콘솔의 예제 정책은 같지 않다. 콘솔 조회 권한과 세션 작업 권한을 구분하고, 실제 사용할 진입점에 맞는 정책을 선택한다.

권한 검증 제안: 허용 노드 접속, 비허용 노드 거부, 자기 세션 종료와 다른 사용자의 세션 종료 거부를 각각 시험한다. 문서 대조에 한정하며 실제 계정의 정책 조합은 검증하지 않았고 기존 기능 전체의 검증일도 유지한다.

#### API 호출 감사와 세션 내용 기록의 차이

2026-10-10 Session Manager 공식 문서의 부분 검증이다. 다른 SSM 기능 전체를 재검증한 것은 아니므로 문서의 `verified_at`은 유지한다.

- CloudTrail은 Session Manager API 호출 정보를 기록한다. 이 기록이 셸에서 실행한 모든 명령과 출력까지 포함한다는 뜻은 아니다.
- 세션 내용은 별도 로깅 설정과 저장 대상의 IAM 권한을 확인한다. 입력한 명령과 출력에 비밀 값이 포함될 수 있으므로 로그 접근 범위도 관리한다.
- **SSH와 포트 포워딩으로 연결한 Session Manager 세션은 세션 내용 로깅을 지원하지 않는다.** 접속 이력과 작업 내용의 증거를 구분한다.

운영 점검 제안: 일반 셸 세션에서 비민감 시험 명령을 실행하고 API 감사 이벤트와 S3 또는 CloudWatch Logs의 세션 출력을 각각 확인한다. SSH 터널이나 포트 포워딩을 허용하는 운영 경로는 별도 감사 수단과 기록 범위를 정한다.

#### 연결 실패를 나누어 진단하기

부분 검증(2026-10-16): 아래 연결 진단과 앞의 EC2 권한 부여 경로를 AWS 공식 문서로 대조했다. 다른 SSM 기능의 검증 날짜를 바꾸지는 않는다.

| 증상 | 먼저 확인할 경계 |
|---|---|
| 관리 노드가 목록에 없거나 Agent가 offline | 등록, Agent 실행 상태, 서비스 endpoint까지의 네트워크 경로 |
| 노드는 보이지만 세션 시작이 거부됨 | 호출자의 세션 시작 권한과 노드의 Session Manager 권한을 각각 확인 |
| `TargetNotConnected` | 대상의 세션 설정, 호출 계정과 리전이 대상과 일치하는지 확인 |
| CLI에서 plugin을 찾지 못함 | 접속하는 로컬 컴퓨터의 Session Manager plugin 설치와 Windows `PATH` |
| 세션을 시작해도 빈 화면 | 노드의 루트 볼륨 여유 공간, 로그 대상 존재 여부, 로그 전송 경로와 암호화 설정 |

- KMS로 세션 데이터를 암호화하면 세션 시작 사용자와 대상 노드 모두 해당 키를 사용할 권한이 필요하다. 기본 관리 권한만으로 모든 암호화와 로깅 구성이 충족된다고 판단하지 않는다.
- Default Host Management Configuration을 사용한다면 실제 권한을 제공하는 IAM 역할을 확인한다. instance profile만 고치는 것으로 해결됐다고 간주하지 않는다.
- VPC endpoint를 쓰는 구성에서는 세션 연결 경로와 로그 전송 경로를 나눠 점검한다. S3 기록에는 `s3`, CloudWatch Logs 기록에는 `logs` endpoint 구성을 확인한다.
- 암호화 필수 설정과 로그 저장소가 맞지 않으면 접속이 실패할 수 있다. 운영 복구안은 요구한 암호화, 저장소와 권한을 맞추는 것으로 잡고, 암호화 검사를 끈 접속 성공만으로 복구를 완료 처리하지 않는다.

이 절은 문서 기반 진단 순서다. 실제 인스턴스에서 연결과 로그 저장을 재현한 결과는 아니다.

#### RDP를 포트 포워딩으로 연결하기

부분 검증(2026-10-16): 관리 노드 자체의 RDP 포트에 연결하는 절차를 대조했다. Session Manager 터널을 쓰면 보안 그룹에 외부 RDP 인바운드를 열거나 bastion을 둘 필요가 없지만, 노드의 SSM 통신 경로와 Windows의 RDP 수신 설정은 필요하다.

- 로컬 AWS CLI에 Session Manager plugin을 설치하고, 대상 노드에는 최신 SSM Agent를 사용한다. 호출자는 대상 노드와 `AWS-StartPortForwardingSession` 문서로 세션을 시작할 권한이 필요하다.
- 2026-10-16 대조 시 공식 전제조건은 포트 포워딩에 `3.0.222.0` 이상을 요구하지만 세션 시작 가이드와 RDP 안내에는 `2.3.672.0` 이상으로 적혀 있다. 최소 버전 표기가 서로 다르므로 구형 버전의 지원 여부를 단정하지 않고, 최신 Agent 사용 안내를 따른다.
- `aws ssm start-session`에서 위 문서를 지정한다. `portNumber`는 대상 Windows의 RDP 포트(기본 `3389`), `localPortNumber`는 로컬에서 사용할 포트다. `portNumber`를 생략하면 `80`이므로 RDP에는 명시한다.
- 로컬 포트를 `55678`로 정했다면 RDP 클라이언트는 `localhost:55678`로 접속한다. 터널이 열렸어도 RDP가 실패하면 Windows의 실제 listener 포트와 로그인 정보를 따로 확인한다.
- 작업을 마치면 RDP 연결과 포트 포워딩 세션을 모두 종료한다. 터널의 세션 내용은 Session Manager 로깅 대상이 아니므로 위의 감사 경계를 적용한다.

문서 기반 접속 절차이며 실제 Windows 인스턴스 접속은 시험하지 않았다. 다른 SSM 기능의 검증일은 유지한다.

### State Manager

**원하는 구성 상태 유지** (Desired State Configuration).

- Association을 생성하거나 정해진 일정에 다시 적용해 원하는 구성을 유지하고 컴플라이언스를 보고한다. 실행 주기 사이의 드리프트를 연속적으로 막는 기능은 아니다.
- 예: 모든 노드에 CloudWatch Agent 설치 유지, 방화벽 규칙 일관성 보장
- 정기 일정으로 Association 재실행

### Automation

- 일반 운영 작업을 **Runbook**(이전 Document)으로 정의해 자동 실행
- AMI 생성, EBS 스냅샷, EC2 재시작, 복구 절차 등
- 콘솔/API/EventBridge/CloudWatch Alarm으로 트리거

### Inventory

- 인스턴스에 설치된 **소프트웨어, OS 버전, 네트워크 구성** 수집
- 라이선스 추적, 보안 감사, 드리프트 탐지 기반 데이터
- 결과를 S3 → Athena로 쿼리, QuickSight로 시각화 가능

### Maintenance Window

- 정해진 시간 창에 **Patch Manager, Run Command, Automation** 작업 실행
- 운영 시간 회피 + 변경 관리 정책 준수

### OpsCenter

- 운영 이슈(OpsItem)를 **단일 위치에서 추적, 해결**
- CloudWatch 알람, Config 규칙 위반 등이 OpsItem으로 생성됨
- 해결 자동화(Runbook) 연결 가능

## 시험 체크포인트

- **Parameter Store vs Secrets Manager**: 회전, 교차 리전, RDS 통합 = Secrets Manager / 저비용 일반 설정 = Parameter Store
- **SSH 없이 EC2 접속, Bastion 제거** → **Session Manager** (포트 22 닫혀도 동작)
- **수백 대 인스턴스에 명령 일괄 실행** → **Run Command** (SSH 키 관리 불필요)
- **OS 패치 자동화, 컴플라이언스 추적** → **Patch Manager + Maintenance Window**
- **인스턴스 구성 드리프트 방지** → **State Manager**
- **운영 작업 표준화(AMI 생성, 복구)** → **Automation Runbook**
- **설치 소프트웨어, OS 인벤토리 감사** → **Inventory**
- SSM Agent, 등록과 **적절한 IAM 권한**이 필요 — 서비스 endpoint로 나가는 경로가 있으면 관리용 인바운드 포트를 열지 않고 운영 가능

## 관련 문서

- [[Secrets-Manager]], [[SSM-Parameter-Store]], [[IAM]], [[CloudWatch]], [[EC2|EC2]]

## 출처

- [AWS, Understanding command statuses](https://docs.aws.amazon.com/systems-manager/latest/userguide/monitor-commands.html)
- [AWS, Configuring Amazon CloudWatch Logs for Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)
- [AWS, Troubleshooting SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/troubleshooting-ssm-agent.html)
- [AWS, Complete Session Manager prerequisites](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-prerequisites.html)
- [AWS, Start a session](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html)
- [How do I use Session Manager port forwarding without a bastion host to connect to my EC2 instance through RDP? — AWS re:Post](https://repost.aws/knowledge-center/systems-manager-session-manager-connect)
- [AWS, Sample IAM policies for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-quickstart.html)
- [AWS, Additional sample IAM policies for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/getting-started-restrict-access-examples.html)
- [AWS, Troubleshooting Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-troubleshooting.html)
- [AWS, Verify or add instance permissions for Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html)
- [AWS, Turn on KMS key encryption of session data](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-preferences-enable-encryption.html)
- [AWS, Install the Session Manager plugin for the AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
- [AWS, AWS Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [AWS, Enabling and disabling session logging](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html)
- [AWS Systems Manager State Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-state.html)
- [CloudFormation의 SSM dynamic reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html)
- [CodeBuild buildspec의 Parameter Store](https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html)
- [Lambda Parameters and Secrets Extension](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html)
