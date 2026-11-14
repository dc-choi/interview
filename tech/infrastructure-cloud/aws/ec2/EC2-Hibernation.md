---
tags: [infrastructure, aws, ec2, compute, hibernation]
status: done
verified_at: 2026-11-15
category: "Infrastructure - AWS"
aliases: ["EC2 Hibernation", "EC2 최대 절전 모드", "Stop - Hibernate"]
---

# AWS EC2 — 최대 절전 모드 (Hibernation)

## 정의

최대 절전은 인스턴스를 중지할 때 메모리(RAM) 내용을 EBS 루트 볼륨에 저장해 두고, 다시 Start하면 그 메모리를 불러와 중지 전의 프로세스를 이어 실행하는 중지 방식이다. OS의 최대 절전(suspend-to-disk)에 해당하며, 입문 강의에서는 노트북을 닫았다 열면 작업 화면이 그대로 돌아오는 경험에 빗대 설명한다. 일반 Stop 후 Start는 OS를 처음부터 부팅하므로 애플리케이션 초기화와 캐시 적재를 다시 해야 한다.

이 문서는 2026-11-15 AWS EC2 사용 설명서의 Hibernation 절(개요, 동작 방식, 사전 조건, 활성화, 실행 절차)을 대조한 기준이다. 지원 인스턴스 패밀리와 AMI 목록은 자주 바뀌므로 적용 전에 공식 표를 다시 확인한다.

## 동작 순서

1. 최대 절전을 요청하면 EC2가 OS에 suspend-to-disk를 신호하고 인스턴스는 `stopping`이 된다.
2. OS가 모든 프로세스를 멈추고 RAM 내용을 EBS 루트 볼륨에 저장한 뒤 일반 종료를 한다. 인스턴스는 `stopped`가 된다.
3. 다시 시작하면 EBS 루트 볼륨이 이전 상태로 복원되고, RAM 내용을 다시 불러와 이전에 실행 중이던 프로세스가 재개된다. 연결돼 있던 데이터 볼륨도 다시 붙고 인스턴스 ID는 유지된다.
4. 대부분 새 물리 호스트로 옮겨져 시작된다.

최대 절전이 실패하면 일반 종료가 일어난다. CLI에서는 `aws ec2 stop-instances --instance-ids <ID> --hibernate`로 요청하며, 사용자가 시작한 최대 절전의 상태 사유 코드는 `Client.UserInitiatedHibernate`다.

## 일반 Stop과 같은 점, 다른 점

| 항목 | 최대 절전 후 Start | 일반 Stop 후 Start |
| --- | --- | --- |
| 메모리와 실행 중 프로세스 | 복원된다 | 복원되지 않고 OS를 새로 부팅한다 |
| `stopping` 동안 인스턴스 요금 | 발생한다 | 발생하지 않는다 |
| 중지 중 속성 변경 | 인스턴스를 수정할 수 없다 | 인스턴스 유형 등 일부 속성을 바꿀 수 있다 |
| EBS 볼륨 데이터 | 유지된다. 저장된 RAM 내용도 루트 볼륨에 남는다 | 유지된다 |
| Instance store 데이터 | 볼륨은 붙어 있지만 데이터는 사라진다 | 같다 |
| 사설 IPv4, IPv6 | 유지된다 | 같다 |
| 자동 할당 공인 IPv4 | 해제되고 Start할 때 새 주소를 받는다 | 같다. 고정이 필요하면 Elastic IP를 쓴다 |
| Elastic IP | 연결이 유지되고 요금이 발생한다 | 같다 |

## 비용

일반 Stop과 달리 RAM을 저장하는 `stopping` 동안에는 인스턴스 사용 요금이 발생한다. `stopped`(최대 절전) 상태가 되면 인스턴스 사용 요금이 없고, RAM 내용을 EBS 루트 볼륨으로 옮기는 데이터 전송에도 요금이 없다. 저장된 RAM 내용을 포함한 EBS 저장 비용과 연결된 Elastic IP 요금은 계속 발생한다. 상태별 비교는 [[EC2-Cost#접속 종료와 인스턴스 중지를 구분한다|EC2 비용 모델의 상태별 요금 표]]에 있다.

## 사전 조건

- **처음 실행(launch)할 때만 켤 수 있다.** 실행 중이든 중지 상태든 기존 인스턴스에는 최대 절전을 켤 수 없고, launch한 뒤에는 켜거나 끌 수 없다. 콘솔의 Stop - Hibernate behavior를 Enable로 두거나 `run-instances ... --hibernation-options Configured=true`로 launch한다.
- **구매 옵션:** On-Demand와 Spot 인스턴스에서 켤 수 있다. Spot은 요청 유형이 `persistent`여야 하고 launch group을 지정할 수 없다.
- **AMI:** 최대 절전을 지원하는 HVM AMI여야 한다. Amazon Linux 2023, Amazon Linux 2, Ubuntu와 Windows Server는 지원을 시작한 릴리스 이후 AMI만 해당하고, RHEL, CentOS, Fedora는 추가 구성이 필요하며 Nitro 기반 인스턴스에서만 지원한다.
- **인스턴스 패밀리:** 지원 패밀리여야 하고 bare metal은 지원하지 않는다. 지원 여부는 `aws ec2 describe-instance-types --filters Name=hibernation-supported,Values=true`로 조회한다.
- **RAM 크기:** Linux는 150GiB 미만, Windows는 16GiB 이하여야 한다.
- **루트 볼륨:** instance store가 아닌 EBS여야 하고 유형은 gp2, gp3, io1, io2다. RAM 내용과 예상 사용량을 담을 만큼 커야 하며, RAM을 저장할 공간은 launch 시점에 루트 볼륨에 할당된다.
- **루트 볼륨 암호화 필수:** 최대 절전 중 디스크에 남는 메모리 내용을 보호하기 위해서다. EC2는 launch 전에 루트 볼륨이 암호화됐는지 검증한다. EBS 기본 암호화, launch 시 암호화 지정이나 암호화된 AMI로 맞춘다. 이 검증은 EC2 콘솔, CLI, API로 요청한 최대 절전에만 적용되고 게스트 OS 안에서 직접 시작한 suspend-to-disk에는 적용되지 않는다.

## 제한

- 최대 절전 상태로 60일 넘게 두는 것은 지원하지 않는다. 더 오래 둘 인스턴스는 시작한 뒤 일반 Stop하고 다시 시작한다.
- Auto Scaling 그룹에서 서비스 중인 인스턴스나 Amazon ECS가 쓰는 인스턴스는 사용자가 직접 최대 절전시킬 수 없다. ASG 인스턴스를 최대 절전하려 하면 Auto Scaling이 중지된 인스턴스를 비정상으로 표시하고 교체할 수 있다. 예외로 ASG의 Warm Pool은 대기 인스턴스를 Hibernated 상태로 둘 수 있으며, 이때도 위 사전 조건을 모두 충족해야 한다([[Auto-Scaling|EC2 Auto Scaling]]의 Warm Pool 절).
- UEFI Secure Boot를 켠 인스턴스와, FIPS 모드에서 커널이 5.10 미만인 인스턴스는 최대 절전할 수 없다.
- Capacity Reservation이 있어도 최대 절전한 인스턴스의 재개를 보장하지 않는다. 다시 시작할 때 용량 부족이 날 수 있다.
- 최대 절전한 인스턴스나 최대 절전이 켜진 인스턴스로 만든 스냅샷이나 AMI에서 새 인스턴스를 시작하면 접속하지 못할 수 있다.
- Spot을 EC2가 최대 절전시키면 재개도 EC2만 할 수 있고, 용량과 최고 가격 조건이 맞아야 재개된다. 최대 절전 전에 2분 중단 예고가 있다.

## 언제 쓰나

부트스트랩이나 메모리 적재에 시간이 오래 걸려 바로 일할 수 있는 상태가 되기까지 오래 걸리는 인스턴스를 미리 데워 둘 때 쓴다. 최대 절전을 켜고 launch해 원하는 상태까지 준비한 뒤 최대 절전시키고, 필요할 때 그 상태로 재개한다. 개발용 인스턴스처럼 업무 시간에만 쓰면서 작업 상태를 이어가려는 경우에도 같은 원리를 적용할 수 있지만, 위의 60일 제한과 공인 IPv4 변경, instance store 데이터 손실을 함께 고려한다.

## 체크포인트

- 최대 절전은 launch 시점에만 켤 수 있다. 운영 중인 인스턴스에 나중에 적용할 수 없으므로 Launch Template이나 launch 설정 단계에서 결정한다.
- 루트 볼륨이 암호화되지 않았으면 launch 전 검증에서 걸린다. 루트 볼륨 크기는 RAM 내용과 평소 사용량을 함께 담도록 launch 전에 잡는다.
- 최대 절전이 실패하면 일반 종료가 일어나므로 메모리 상태 보존을 전제로 한 절차는 실패 경로를 함께 둔다.
- 메모리를 복원해도 공인 IPv4와 instance store 데이터는 이어지지 않는다.

## 출처

- [AWS 공식 문서, Hibernate your Amazon EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html) — 2026-11-15 재개 시 복원 범위, 요금, 미리 데우기 용도 대조
- [AWS 공식 문서, How Amazon EC2 instance hibernation works](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html) — 2026-11-15 동작 순서, IP와 볼륨 처리, 제한 대조
- [AWS 공식 문서, Prerequisites for EC2 instance hibernation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html) — 2026-11-15 구매 옵션, AMI, 패밀리, RAM, 루트 볼륨과 암호화 조건 대조
- [AWS 공식 문서, Enable hibernation for an Amazon EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enabling-hibernation.html) — 2026-11-15 시작 후 변경 불가와 활성화 방법 대조
- [AWS 공식 문서, Hibernate an Amazon EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-instances.html) — 2026-11-15 실패 시 일반 종료와 상태 사유 코드 대조
- [AWS 공식 문서, Warm pools for Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html) — Warm Pool의 Hibernated 대기 상태와 사전 조건
- [AWS 공식 문서, Amazon EC2 instance state changes](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html) — 최대 절전의 `stopping` 동안 과금
- [YouTube, 데브아트 DevArt, 최대 절전 모드 EC2 Hibernate](https://www.youtube.com/watch?v=WEB9NGs_qeE) — 최대 절전 개념 소개(쇼츠)

## 관련 문서

- [[EC2-Operations|EC2 운영과 수명주기]]
- [[EC2-Cost|EC2 비용 모델]]
- [[EC2-Compute|EC2 컴퓨트 아키텍처]] — Instance Store와 EBS의 영속성
- [[EC2-Network-Access|EC2 네트워크와 접근]] — Elastic IP
- [[Auto-Scaling|EC2 Auto Scaling]]
- [[EBS|EBS, Elastic Block Store]]
