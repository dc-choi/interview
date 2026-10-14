---
tags: [infrastructure, aws, ec2, troubleshooting, status-check, cloudwatch]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 Status Checks", "EC2 상태 검사", "EC2 접속 불가 진단", "StatusCheckFailed"]
verified_at: 2026-10-14
---

# AWS EC2 — 상태 검사 실패와 접속 불가 진단

EC2 상태 검사는 인스턴스가 애플리케이션을 실행하지 못하게 만드는 문제를 빠르게 가려내는 신호다. 어느 검사가 실패했는지에 따라 고칠 주체가 달라진다. 호스트 문제는 AWS가 고치거나 인스턴스를 다른 호스트로 옮겨야 하고, OS 문제는 사용자가 로그를 보고 구성을 고쳐야 한다. 이 문서는 2026-10-14 AWS 공식 문서와 AWS re:Post Knowledge Center 문서로 대조한 Linux 인스턴스 기준이다.

## 세 가지 관리형 검사

EC2는 상태 검사를 매분 수행해 통과 또는 실패를 반환한다. 모두 통과하면 인스턴스 상태는 `OK`, 하나라도 실패하면 `impaired`다. 시스템, 인스턴스, 연결된 EBS 검사는 EC2가 관리하며 끄거나 삭제할 수 없다. 애플리케이션의 HTTP, HTTPS 응답을 보는 application status check는 사용자가 만들어 연결하는 선택 기능이다.

| 검사 | 감시 대상 | 실패 원인 예 | 실패 지표 | 기본 대응 |
|---|---|---|---|---|
| 시스템 | 인스턴스가 실행되는 AWS 시스템 | 네트워크 연결이나 전원 상실, 물리 호스트의 소프트웨어 문제, 네트워크 도달성에 영향을 주는 호스트 하드웨어 문제 | `StatusCheckFailed_System` | AWS의 복구를 기다리거나, EBS 기반이면 Stop 후 Start로 대개 새 호스트로 옮긴다. instance store 기반은 종료 후 교체한다 |
| 인스턴스 | 개별 인스턴스의 소프트웨어와 네트워크 연결. EC2가 네트워크 인터페이스에 ARP 요청을 보내 확인한다 | 시스템 검사 실패, 잘못된 네트워크나 시작 구성, 메모리 고갈, 손상된 파일 시스템, 호환되지 않는 커널 | `StatusCheckFailed_Instance` | 사용자가 재부팅하거나 OS 구성을 고친다 |
| 연결된 EBS | 연결된 EBS 볼륨에 도달해 I/O를 완료할 수 있는지 | EBS 하부 스토리지의 하드웨어나 소프트웨어 문제, EBS 도달성에 영향을 주는 호스트 하드웨어 문제, 인스턴스와 볼륨 사이의 연결 문제 | `StatusCheckFailed_AttachedEBS` (Nitro 인스턴스만) | 기다리거나 영향을 받은 볼륨을 교체하거나 인스턴스를 Stop 후 Start한다 |

- 재부팅 중에는 인스턴스가 다시 사용 가능해질 때까지 인스턴스 검사가 실패로 보일 수 있다. bare metal 인스턴스를 재시작하면 시스템과 인스턴스 검사가 잠시 실패할 수 있다.
- `systemd-networkd`를 쓰는 최근 배포판은 네트워크가 다른 부팅 작업보다 먼저 준비될 수 있어, 네트워크에 의존하는 검사가 다른 작업이 끝나기 전에 정상으로 보고될 수 있다. 상태 검사 통과를 애플리케이션 준비 완료로 해석하지 않는다.
- 연결된 EBS 검사에 손상이 보이는데 워크로드가 그 볼륨에 I/O를 일으키지 않고 있다면 Stop 후 Start로 새 호스트로 옮겨 볼 수 있다. 볼륨별 I/O 성능은 EBS의 CloudWatch 지표로 따로 본다.

## 자동 복구와 경보 동작

- 자동 인스턴스 복구는 시스템 상태 검사 실패에서만 동작하며, 인스턴스 검사만 실패한 경우에는 동작하지 않는다. 지원 인스턴스에서는 simplified automatic recovery가 기본으로 켜져 있고, CloudWatch 경보 기반 복구는 따로 설정한다.
- 복구된 인스턴스는 인스턴스 ID, 공인, 사설, Elastic IP 주소, 메타데이터, 배치 그룹, 연결된 EBS와 AZ를 유지한다. 메모리의 데이터는 사라지고 OS uptime은 0부터 다시 시작한다. 경보 기반 복구에서는 instance store 데이터도 사라진다.
- 경보의 recover 동작은 `StatusCheckFailed_System`에만 쓸 수 있고, 인스턴스 검사 실패에는 reboot 동작이 권장된다. 두 경보의 평가 기간 수가 같으면 경합할 수 있어, 문서는 reboot 경보에 1분 평가 3회, recover 경보에 1분 평가 2회를 권한다.
- 상태 검사 경보는 지표 보고가 끊기면 정상 인스턴스에서도 잠시 `INSUFFICIENT_DATA`가 될 수 있다. AWS는 중지, 종료, 재부팅, 복구 동작을 거는 경보에서 이 상태를 위반이 아닌 누락 데이터로 다루도록 권한다.
- 복구가 실패하면 인스턴스가 문제 호스트에 남을 수 있다. 접속 불가나 시스템 검사 실패가 계속되면 Stop 후 Start한다. 자동 복구와 달리 Stop 후 Start하면 Elastic IP가 없는 인스턴스의 공인 IPv4가 바뀐다.
- ASG는 시스템과 인스턴스 검사 실패에 기본으로 대체 인스턴스를 시작한다. 연결된 EBS 검사 실패로 교체하려면 EBS 헬스 체크를 따로 켠다 — [[Auto-Scaling|EC2 Auto Scaling]].

## Stop 후 Start 전에 확인할 것

재부팅은 같은 물리 호스트에 남아 공인 DNS 이름, 사설 IP와 instance store 데이터를 유지한다. Stop 후 Start는 호스트를 옮길 수 있는 대신 아래 영향을 먼저 확인한다.

1. instance store 데이터는 Stop할 때 삭제되므로 EBS나 S3로 먼저 옮긴다.
2. 문제가 생기면 되돌릴 수 있도록 EBS 스냅샷을 만든다.
3. ASG에 속한 인스턴스는 Stop하면 `running`이 아니므로 ASG가 즉시 비정상으로 보고 교체한다. scale-in protection은 헬스 체크 교체를 막지 않으므로 작업 전에 인스턴스를 Standby로 옮기거나 그룹에서 잠시 분리한다.
4. OS 종료 동작(`InstanceInitiatedShutdownBehavior`)이 stop인지 확인한다 — [[EC2-Operations#콘솔의 종료는 삭제다 — Stop과 Terminate 구분|Stop과 Terminate 구분]].
5. 자동 할당 공인 IPv4는 바뀐다. 외부 트래픽에는 Elastic IP를 쓰고, Route 53 레코드가 공인 IP를 가리키면 갱신한다.

## 인스턴스 검사 실패는 시스템 로그에서 시작한다

인스턴스를 재부팅한 뒤 시스템 로그를 받아 오류를 찾는다. 재부팅은 로그의 불필요한 내용을 정리하며, 재부팅만으로 해결되는 경우도 있다. 로그에 로그인 프롬프트까지 나왔다면 부팅은 성공했으므로 OS 네트워크 구성을 의심한다. 직접 고칠 때는 EC2 Serial Console을 쓰되, 접속 불가 전에 Serial Console 접근을 설정해 두지 않았다면 쓸 수 없다. 그때는 같은 AZ의 구조용 인스턴스에 루트 볼륨을 연결해 고친다 — [[EC2-Operations#커널 업데이트 뒤 부팅에 실패했을 때|구조용 인스턴스 복구 순서]].

| 신호 | 원인 | 대응 |
|---|---|---|
| `Kernel panic - not syncing`, 부팅 오류 | 커널, initramfs와 부팅 구성 | 안정 커널로 되돌리거나 initramfs를 복구한다 — [[EC2-Operations|운영과 수명주기]] |
| `Failed to mount`, `Dependency failed for Local File Systems` | `/etc/fstab`의 장치 이름 불일치, 분리되거나 고장 난 볼륨 | 아래 마운트 절 |
| `CPUUtilization`이 100% 근처 | 커널이 실행될 컴퓨트 여유가 없음 | 재부팅으로 회복한 뒤에도 반복되면 CPU 요구량이 타입을 넘는 것이므로 더 큰 타입을 검토한다 |
| `Out of memory: kill process` | 메모리 고갈 | 메모리를 가장 많이 쓰는 프로세스를 멈추거나 더 큰 타입이나 메모리 최적화 타입으로 바꾼다. swap은 완화책이며 RAM을 대신하지 않는다 |
| `No space left on device` | 파일 시스템이나 루트 볼륨이 가득 참 | 불필요한 파일을 지우거나 볼륨 크기를 늘린 뒤 파일 시스템을 확장한다 |
| EBS IOPS나 처리량 지표가 같은 값에 오래 붙어 있음 | 볼륨 한도를 넘어 throttling됨 | 재부팅이나 Stop 후 Start는 임시 대응이다. 워크로드에 맞는 볼륨 유형과 크기로 바꾼다 — [[EBS#CloudWatch에서 평균 IOPS와 처리량 계산|EBS IOPS와 처리량 계산]] |
| `Device eth0 has different MAC address than expected` | AMI에 하드코딩된 MAC 주소 | 아래 네트워크 절 |

T 계열은 CPU 크레딧도 본다. standard 모드에서 크레딧이 바닥나면 CPU 사용률이 기준 성능 수준으로 점차 낮아지므로, `CPUUtilization`이 기준선에 붙어 있으면 `CPUCreditBalance`를 확인한다. 2026-10-14 문서 기준 T2는 standard, T3, T3a, T4g, T8i는 unlimited로 시작하는 것이 기본값이고, Dedicated Host의 T3는 standard로만 시작한다. 모드별 동작은 [[EC2-Compute#T 시리즈 CPU 크레딧 시스템|T 시리즈 CPU 크레딧]]을 따른다.

### Xen에서 Nitro로 바꾼 뒤의 마운트 실패

Nitro 인스턴스는 EBS 볼륨을 NVMe 블록 장치(`/dev/nvme0n1`, `/dev/nvme1n1` 등)로 노출한다. 블록 장치 매핑에 지정한 이름은 `/dev/nvme[0-26]n1` 형식으로 바뀌고, 드라이버가 매핑에 지정한 순서와 다른 순서로 이름을 붙일 수 있다. `/dev/xvdf` 같은 장치 이름을 `/etc/fstab`에 적어 둔 인스턴스는 타입 변경 뒤 마운트에 실패할 수 있다.

- `/etc/fstab`에는 장치 이름 대신 파일 시스템 UUID나 레이블을 쓴다. UUID는 파티션의 수명 동안 유지된다.
- 부팅에 꼭 필요하지 않은 볼륨에는 `nofail`을 붙여, 볼륨이 연결되지 않았거나 마운트 오류가 나도 부팅이 진행되게 한다.
- `/etc/fstab`의 오류는 시스템을 부팅 불가로 만들 수 있다. 편집 전에 백업하고, 편집 뒤 해당 볼륨을 해제한 다음 `sudo mount -a`로 오류가 없는지 확인한다.
- 필요한 ENA와 NVMe 드라이버가 없는 인스턴스를 Nitro 타입으로 바꾸면 인스턴스 검사가 실패한다. 타입 변경 전에 드라이버를 확인한다 — [[EC2-Network-Access#세대 변경 뒤에는 ENA 드라이버 호환성도 확인한다|ENA 드라이버 호환성]].

### OS 네트워크 구성 실패

부팅은 됐는데 인스턴스 검사가 실패하면 OS의 네트워크 구성을 본다.

- **cloud-init:** cloud-init 패키지가 없거나 시작할 때 cloud-init으로 네트워크 구성을 바꾸는 경우 네트워크 실패가 생길 수 있다. 패키지가 없으면 배포판 패키지 관리자로 설치한다.
- **하드코딩된 MAC 주소:** udev 규칙(`/etc/udev/rules.d/70-persistent-net.rules`, `80-net-name-slot.rules` 등)의 `ATTR{address}`가 인스턴스의 실제 하드웨어 주소와 다르면 네트워크 인터페이스가 올라오지 않는다. 해당 항목이나 파일을 비활성화한다. netplan의 `match: macaddress`는 설정을 적용할 인터페이스를 고르는 값이다. cloud-init이 새 인스턴스의 첫 부팅에서 네트워크 구성을 다시 만드는 기본 구성에서는 이 문제와 다르지만, cloud-init의 네트워크 구성을 끈 AMI라면 이전 MAC에 묶인 `match`가 새 인터페이스에 적용되지 않으므로 함께 확인한다.
- **하드코딩된 IP 주소:** 고정 IP로 구성한 인스턴스에서 만든 AMI는 그 설정을 물려받아, 새 인스턴스가 DHCP로 주소를 받지 않는다. AMI를 만들기 전에 모든 네트워크 인터페이스를 DHCP로 설정한다. 이미 만든 AMI는 수정할 수 없다.
- **인터페이스 이름:** predictable naming을 켜면 `eth0` 대신 `ens5` 같은 이름이 붙고, 재시작 뒤 이름 순서가 바뀔 수 있다. `ifcfg-eth0`과 `ifcfg-ens5`처럼 중복된 설정 파일이 있으면 인스턴스에 없는 인터페이스의 파일을 지운다. 이름 변경을 끄려면 ENA가 활성화됐는지 확인한 뒤 GRUB 커널 명령줄에 `net.ifnames=0`을 더하고 GRUB 설정을 다시 생성한다.
- 고친 뒤에는 배포판에 맞는 네트워크 서비스를 재시작하거나, 구조용 인스턴스를 썼다면 볼륨을 원래 인스턴스에 되돌려 Start한다.

## 운영과 면접 체크포인트

- 시스템 검사 실패는 호스트 쪽, 인스턴스 검사만 실패하면 OS 쪽 문제다. 자동 복구와 recover 동작은 시스템 검사 실패에만 대응한다.
- 재부팅은 같은 호스트에 남고 Stop 후 Start는 대개 새 호스트로 옮긴다. instance store 데이터와 공인 IPv4에 미치는 영향이 다르다.
- 상태 검사 통과는 애플리케이션 정상과 다르다. 애플리케이션 상태는 ELB 헬스 체크나 application status check로 따로 본다.
- `/etc/fstab`의 장치 이름 의존과 AMI에 남은 MAC, 고정 IP 설정은 인스턴스 타입 변경이나 새 인스턴스 시작 뒤에야 드러나는 잠복 결함이다.
- 이 문서는 문서 대조이며 실제 인스턴스에서 장애를 재현한 기록은 아니다.

## 출처

- [AWS 공식 문서, Status checks for Amazon EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-system-instance-status-check.html)
- [AWS 공식 문서, Troubleshoot Amazon EC2 Linux instances with failed status checks](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstances.html)
- [AWS 공식 문서, Automatic instance recovery](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recover.html)
- [AWS 공식 문서, Create alarms that stop, terminate, reboot, or recover an instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UsingAlarmActions.html)
- [AWS 공식 문서, About the health checks for your Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-checks-overview.html)
- [AWS 공식 문서, Temporarily remove instances from your Auto Scaling group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-enter-exit-standby.html)
- [AWS 공식 문서, Use instance scale-in protection to control instance termination](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-instance-protection.html)
- [AWS 공식 문서, Amazon EBS volumes and NVMe](https://docs.aws.amazon.com/ebs/latest/userguide/nvme-ebs-volumes.html)
- [AWS 공식 문서, Make an Amazon EBS volume available for use](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-using-volumes.html)
- [AWS 공식 문서, Standard mode for burstable performance instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-standard-mode.html)
- [AWS 공식 문서, Configure burstable performance instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-how-to.html)
- [How do I troubleshoot status check failures for my Amazon EC2 Linux instance? — AWS re:Post](https://repost.aws/knowledge-center/ec2-linux-status-check-failure)
- [How do I troubleshoot OS-level network configuration issues on my Amazon EC2 Linux instance? — AWS re:Post](https://repost.aws/knowledge-center/ec2-os-network-configuration-issues)
- [How do I troubleshoot an Amazon EC2 Linux instance that fails a status check because of resource over-usage? — AWS re:Post](https://repost.aws/knowledge-center/ec2-linux-resource-over-utilization)
- [Netplan documentation, YAML configuration](https://netplan.readthedocs.io/en/stable/netplan-yaml/)
- [cloud-init documentation, Network configuration](https://docs.cloud-init.io/en/latest/reference/network-config.html)
- [cloud-init documentation, Events and updates](https://docs.cloud-init.io/en/latest/explanation/events.html)
- [Why is my EC2 Linux instance unreachable and failing its status checks? — YouTube, Amazon Web Services](https://www.youtube.com/watch?v=YttXHhPiAo0)

## 관련 문서

- [[EC2|AWS EC2 (목차)]]
- [[EC2-Operations|운영과 수명주기]] — 커널과 initramfs 복구, 구조용 인스턴스
- [[EC2-Compute|컴퓨트 아키텍처]] — Nitro System, T 시리즈 CPU 크레딧
- [[EC2-Network-Access|네트워크와 접근]] — Elastic IP, ENA
- [[EBS|EBS]] — 볼륨 유형, IOPS와 처리량 지표
- [[Auto-Scaling|EC2 Auto Scaling]] — 헬스 체크와 비정상 인스턴스 교체
- [[CloudWatch-Metrics|CloudWatch 지표]] — EC2 기본 지표와 경보
- [[Linux-File-System|Linux 파일 시스템]] — `/etc/fstab`과 마운트
