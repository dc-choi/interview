---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 운영과 수명주기", "User Data, ASG, AMI"]
verified_at: 2026-10-07
---

# AWS EC2 — 운영과 수명주기

## User Data와 Cloud-init

부팅 시 1회 실행되는 스크립트로 자동 셋업한다. 아래는 AL2 계열의 과거 `yum` 예시다. AL2023의 패치 절차는 다음 절처럼 저장소 버전까지 지정한다.
```
#!/bin/bash
yum update -y
yum install -y docker
systemctl start docker
```

전형적 활용: 패키지 설치, 에이전트 등록(SSM Agent, CloudWatch Agent), 애플리케이션 부트. 단, 매 부팅 실행 아님 — `cloud-init-per` 또는 AMI 베이크가 정석.

## Amazon Linux 패치와 저장소 버전

2026-10-07 공식 문서 대조 기준이다. 먼저 `/etc/os-release`로 배포판과 버전을 확인한다. Amazon Linux용 명령을 Ubuntu 같은 다른 배포판에 그대로 적용하지 않는다. AL2는 공식 공지상 2026-06-30에 지원이 종료됐으므로, 기존 패키지 갱신과 지원되는 OS로의 이전을 별도 작업으로 관리한다.

AL2023 AMI는 특정 저장소 버전에 고정된다. 오래된 AMI로 인스턴스를 새로 만들거나 `dnf check-update`만 실행해도 이후 릴리스의 보안 패치가 자동 포함되는 것은 아니다. 버전 고정은 재현성을 주지만 운영자가 새 릴리스의 검토와 적용을 책임져야 한다.

### 조회와 적용을 나눈다

아래 조회 후 대상 버전을 선택한다.

```bash
cat /etc/os-release
sudo dnf check-release-update
```

`<검증한-릴리스>`는 위 출력에서 고른 실제 버전으로 바꾼다. 비운영 환경에서 애플리케이션을 검증하고 복구 가능한 AMI와 데이터 백업을 준비한 뒤 운영에 적용한다.

```bash
dnf check-update --releasever=<검증한-릴리스>
sudo dnf upgrade --releasever=<검증한-릴리스>
```

- `check-update`의 종료 코드 `100`은 갱신할 패키지가 있다는 뜻이고 `0`은 해당 저장소에 갱신 대상이 없다는 뜻이다. `100`을 통신 실패로 처리하지 않는다.
- 전체 릴리스 업그레이드가 끝나면 새 버전이 이후 DNF 작업의 기본 저장소 버전이 된다. 테스트와 운영에서 같은 버전을 지정해야 `latest`가 실행 시점마다 달라지는 문제를 피할 수 있다.
- AWS는 새 AL2023 릴리스의 전체 업데이트 적용을 권장한다. 보안 항목만 선택하는 것은 예외 운영으로 둔다.

### 보안 패치만 선택할 때의 경계

`dnf upgrade --security --releasever=<검증한-릴리스>`는 보안 권고가 있는 패키지로 갱신 대상을 제한한다. 특정 권고의 최소 수정 버전만 필요하면 `upgrade-minimal --advisory <권고-ID>`와 대상 `--releasever`를 조합한다. 실제 설치에는 관리자 권한이 필요하다.

일부 패키지만 갱신하고 `system-release`를 갱신하지 않으면 기본 저장소 버전은 이전 값으로 남을 수 있다. 그 상태에서 후속 설치를 하면 새 패키지의 의존성을 오래된 저장소가 충족하지 못할 수 있으므로, 설치 결과와 기본 저장소 버전을 따로 확인한다.

패키지 설치 완료와 실행 중인 코드의 교체도 다르다. 새 커널 활성화에는 재부팅이 필요하며, 서비스는 재시작이 필요할 수 있다. `smart-restart`를 설치한 환경에서는 패키지 변경 시 서비스 재시작이 발생할 수 있으므로 유지보수 창과 서비스별 제외 정책을 함께 확인한다. 적용 후에는 커널, 서비스 상태와 애플리케이션 상태 검사를 확인한다.

여러 인스턴스의 일정과 실행을 조정할 때는 [[Systems-Manager|Systems Manager Patch Manager]]를 검토한다. 이 절은 문서 대조이며 실제 EC2에서 패치나 재부팅을 실행한 기록은 아니다. 기존 수명주기와 AMI 절 전체를 다시 검증한 것으로 해석하지 않는다.

## Auto Scaling Group (ASG) 연계

- **Launch Template** — AMI, 인스턴스 타입, User Data, SG, IAM 정의
- **Desired/Min/Max** — 원하는, 최소, 최대 인스턴스 수
- **Scaling Policy** — Target Tracking(CPU 70%, ALB Request Count), Step, Scheduled
- **Health Check** — 2026-09-03 AWS 문서 기준, 기본 EC2 상태 검사에 더해 ELB, VPC Lattice, EBS 손상 검사와 `SetInstanceHealth`로 알리는 커스텀 검사를 사용할 수 있다. 비정상 인스턴스는 종료 후 교체
- **Lifecycle Hook** — 2026-09-03 AWS 문서 기준 시작(`EC2_INSTANCE_LAUNCHING`)과 종료(`EC2_INSTANCE_TERMINATING`) 전환을 wait 상태로 붙잡는 훅. 기본 제한 시간은 1시간이며, 시작 시 부트스트랩을 마치거나 종료 시 드레인과 로그 수집을 수행하는 데 쓴다

## EC2 인스턴스 상태(Lifecycle)

| 상태 | 의미 | 과금 |
|------|------|------|
| **Pending** | 부팅 준비 중 | 미청구 |
| **Running** | 정상 실행 중 | **청구** |
| **Stopping** | 중지 전환 중 | 미청구 (EBS 스토리지 비용은 별도) |
| **Stopped** | 중지 완료, EBS 데이터 유지 | EC2 미청구, **EBS, EIP는 별도** |
| **Shutting-down** | 종료 준비 중 | 미청구 |
| **Terminated** | 종료 완료 | 미청구 |

2026-09-03 AWS 문서 기준, **Stop/Start는 EBS 루트 볼륨 인스턴스만 가능**하다. Instance Store 루트 인스턴스는 Stop 기능 자체를 지원하지 않아 재부팅하거나 종료해야 한다. Stop된 인스턴스에 연결된 EIP에도 공인 IPv4 주소 요금이 발생한다.

### 콘솔의 종료는 삭제다 — Stop과 Terminate 구분

인스턴스 상태 메뉴의 Terminate(한국어 콘솔의 종료, 영문 콘솔의 `Terminate (delete) instance`)는 인스턴스를 잠시 끄는 것이 아니라 삭제하는 작업이다. 되돌릴 수 없고 다시 연결하거나 시작할 수 없어 같은 AMI로 새 인스턴스를 만들어야 한다. 잠시 끄려면 Stop(중지)을 쓴다. `terminated` 인스턴스는 잠시 목록에 남았다가 사라진다.

- 종료하면 `DeleteOnTermination`이 켜진 EBS 볼륨(보통 루트 볼륨)이 함께 삭제되고 instance store 데이터도 사라진다. 볼륨별 기본값은 [[EBS]] 참고
- termination protection(`DisableApiTermination`, 기본 꺼짐)을 켜면 콘솔과 `TerminateInstances` API의 종료를 막는다. 다만 OS 안의 shutdown이 종료로 이어지는 설정, Auto Scaling의 scale-in과 비정상 인스턴스 교체, AWS 예약 종료 이벤트는 막지 못하고 Spot 인스턴스에는 켤 수 없다. ASG 인스턴스는 instance scale-in protection으로 따로 보호한다
- `InstanceInitiatedShutdownBehavior`는 OS에서 `shutdown`, `poweroff`를 실행했을 때 stop과 terminate 중 무엇을 할지 정한다. EBS 기반 인스턴스의 기본값은 stop이고, 콘솔이나 `StopInstances` API로 멈추는 경우에는 적용되지 않는다
- Stop 후 Start하면 자동 할당된 공인 IPv4가 바뀐다. 고정 주소가 필요하면 [[EC2-Network-Access|Elastic IP]]를 쓴다

## AMI (Amazon Machine Image)

인스턴스를 시작하는 데 필요한 정보를 담은 **이미지 템플릿**. OS, 애플리케이션, 구성, 권한 정보 포함.

- **EBS 지원 AMI**: EBS 스냅샷에서 루트 볼륨 생성, Stop/Start 가능
- **Instance Store 지원 AMI**: S3에 저장된 템플릿에서 스토어 볼륨 생성, Stop 불가
- **리전 종속** — 다른 리전에서 사용하려면 `CopyImage`로 복사 필요
- **다른 계정과 공유 가능** (Launch Permission 부여)
- AMI에 연결된 **스냅샷은 단독 삭제 불가** — AMI Deregister 선행
- 출처:
  - AWS 제공 (Amazon Linux, Ubuntu 등)
  - **AWS Marketplace** — 서드파티 제공 AMI
  - 사용자 제작 (Packer로 베이크하여 ASG Launch Template 표준화)

AMI 기반 표준화는 부팅 시간 단축, 구성 일관성 확보의 핵심 패턴.

## 출처

- [AWS 공식 문서, Deterministic upgrades through versioned repositories on AL2023](https://docs.aws.amazon.com/linux/al2023/ug/deterministic-upgrades.html)
- [AWS 공식 문서, Manage package and operating system updates in AL2023](https://docs.aws.amazon.com/linux/al2023/ug/managing-repos-os-updates.html)
- [AWS 공식 문서, Applying security updates in-place](https://docs.aws.amazon.com/linux/al2023/ug/security-inplace-update.html)
- [Amazon Linux 2 version 2.0.20260918.0 release notes — AWS](https://docs.aws.amazon.com/AL2/latest/relnotes/relnotes-20260918.html)
- [AWS 공식 문서, EC2 Auto Scaling health checks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-health-checks.html)
- [AWS 공식 문서, Amazon EC2 Auto Scaling lifecycle hooks](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)
- [AWS 공식 문서, Stop and start Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Stop_Start.html)
- [AWS 공식 문서, Terminate Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/terminating-instances.html)
- [AWS 공식 문서, Change instance termination protection](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_ChangingDisableAPITermination.html)
- [AWS 공식 문서, Change instance initiated shutdown behavior](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_ChangingInstanceInitiatedShutdownBehavior.html)
- [인프런, JSCODE 박재성, EC2 접속하기 실습](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227959)
