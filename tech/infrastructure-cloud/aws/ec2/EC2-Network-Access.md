---
tags: [infrastructure, aws, ec2, compute]
status: done
category: "Infrastructure - AWS"
aliases: ["EC2 네트워크와 접근", "IMDS, EIP, ENA, Key Pair"]
verified_at: 2026-08-28
---

# AWS EC2 — 네트워크와 접근

## IMDS — Instance Metadata Service

`http://169.254.169.254/latest/meta-data/` 에서 인스턴스 정보, IAM 임시 자격증명 조회. SSRF 공격으로 자격증명 탈취 사례가 다수 발생해 **IMDSv2** 도입:

| 측면 | IMDSv1 | IMDSv2 |
|------|--------|--------|
| 인증 | 없음 (GET 한 번) | **PUT으로 토큰 발급 → 토큰으로 GET** |
| 요청 제어 | `HttpTokens=optional`일 때 사용 가능 | `HttpTokens=required`로 v2만 허용 가능 |
| 위험 완화 | 요청 위조 시 메타데이터가 노출될 수 있음 | 세션 토큰과 PUT 응답 hop limit으로 일부 SSRF, 프록시 오용 위험을 줄임 |

IMDSv2의 `HttpPutResponseHopLimit`은 1부터 64 사이에서 구성하며 계정 기본값, AMI의 `ImdsSupport`, launch 설정에 따라 실제 값이 달라진다. 컨테이너 환경에서 hop limit 1이면 토큰 응답이 컨테이너까지 도달하지 않을 수 있다. `HttpTokens=optional`이고 클라이언트가 IMDSv1 요청을 하면 v1은 동작할 수 있지만, `HttpTokens=required`이면 v1 fallback은 허용되지 않아 metadata 요청이 실패한다. AWS는 컨테이너 호스트에 hop limit 2를 안내한다. 신규 인스턴스는 IMDSv2 강제(`HttpTokens=required`)를 우선하고, hop limit만 보안 경계로 의존하지 않는다.

## Elastic IP (EIP)

EC2 네트워크 인터페이스에 부여하는 **정적 공인 IP**. 기본 Public IP는 Stop/Start 시 변경되지만, EIP는 명시적 해제 전까지 고정.

- 계정, 리전당 **기본 5개까지** 보유 가능 (요청으로 증가)
- **요금 기준 변경**: 2024년 2월 1일부터 AWS가 제공하는 공인 IPv4 주소는 연결 여부와 관계없이 시간당 과금된다. EC2 Free Tier의 무료 사용 시간과 BYOIP는 별도 조건이며 예전의 실행 중 인스턴스 연결 1개 무료 규칙으로 판단하면 안 된다.
- 과금 대상에는 EIP의 연결 여부와 관계없는 AWS 제공 공인 IPv4, 자동 할당 공인 IPv4가 포함된다. BYOIP와 Free Tier는 별도 조건을 확인한다
- EIP는 ENI의 private IPv4에 연결할 수 있다. detach 가능한 **secondary ENI**는 같은 Availability Zone의 다른 인스턴스에 재부착할 수 있지만 primary ENI는 detach할 수 없고 AZ 경계를 넘겨 이동할 수도 없다. 따라서 ENI 이동은 같은 AZ의 제한된 복구 패턴이며, Multi-AZ 전환에는 EIP 재연결 가능 범위, load balancer, Global Accelerator 또는 DNS 경로를 별도로 설계

권장 패턴: 고정 공인 IPv4가 실제로 필요한지 먼저 확인하고 웹 서비스는 요구에 따라 ALB, NLB, Global Accelerator, CloudFront나 NAT 설계와 비교한다. Bastion도 Session Manager나 EC2 Instance Connect Endpoint로 대체 가능한지 검토한다.

## Primary private IPv4 변경과 인스턴스 교체

이 절은 2026-10-08 AWS 공식 문서 기준이다. 기본 사설 IPv4는 시작할 때 지정하거나 서브넷에서 자동 할당받으며, 시작한 인스턴스에서 직접 바꿀 수 없다. Stop/Start로도 유지된다. EIP 재연결은 공인 주소를 바꾸는 작업이므로 이 제한을 해결하지 않는다.

| 목적 | 처리 방식과 경계 |
|---|---|
| 다른 기본 사설 IPv4 사용 | 기존 인스턴스의 AMI로 새 인스턴스를 시작하면서 선택한 서브넷의 사용 가능한 주소를 지정 |
| 기존 기본 사설 IPv4를 새 인스턴스에 유지 | 원본 primary ENI의 `Delete on termination`을 끄고 AMI를 만든다. AMI 상태가 `available`인지 확인한 뒤 원본을 종료하고, 같은 VPC와 서브넷에서 새 인스턴스를 시작하며 보존한 ENI를 선택 |
| 서비스용 사설 주소를 옮길 필요 | 재할당 가능한 secondary private IPv4를 검토한다. Primary ENI를 실행 중인 원본에서 분리하는 방식과 구분 |

원본 종료가 필요한 경로는 중단과 복구 계획을 먼저 확정한다. EBS 기반 AMI를 생성할 때 기본 재부팅은 볼륨의 일관된 스냅샷을 위한 절차다. 재부팅을 생략하면 파일시스템 무결성이 보장되지 않으며, instance store의 데이터는 AMI로 복원되지 않는다.

애플리케이션 검증에서는 AMI 생성 뒤의 추가 쓰기, 외부 데이터 저장소, IAM 역할, 보안 그룹과 접속 경로를 별도로 확인한다. 주소가 같다는 사실만으로 서비스 상태까지 복구됐다고 판단하지 않는다.

## 재부팅 뒤에도 유지되는 DNS 서버 설정

부분 검증(2026-10-15): AWS re:Post의 배포판별 DNS 설정 안내를 대조했다. DHCP로 관리되는 `/etc/resolv.conf`만 직접 수정하면 재부팅 때 변경이 사라질 수 있다. DNS 서버 주소의 고정과 EC2 자체 IP 주소의 고정은 별개다.

- **변경 전:** AMI 또는 EBS snapshot으로 복구 지점을 확보한다. 네트워크 설정 변경으로 접속이 끊길 수 있으므로 복구 경로도 확인한다.
- **Amazon Linux 2023:** `systemd-resolved`의 `/etc/systemd/resolved.conf` 또는 `/etc/systemd/resolved.conf.d/` 아래 drop-in에서 `DNS`와 `Domains`를 설정한다. `Domains=~.`은 일반 질의의 라우팅에 영향을 주지만, 더 구체적인 per-link 도메인과 일치하는 질의까지 같은 DNS로 보내는 설정은 아니다.
- **Ubuntu:** 배포판 버전에 맞는 Netplan 설정과 적용 절차를 사용한다. 공식 안내의 Ubuntu 18.04 확인 명령은 `systemd-resolve --status`, 20.04와 22.04는 `resolvectl status`다. 다른 버전으로 그대로 확대하지 않는다.
- **변경 후:** 재부팅 뒤 실제 resolver 상태와 이름 해석 결과를 확인한다. `/etc/resolv.conf`에 로컬 stub 주소가 보이는 것만으로 사용자 지정 upstream DNS가 적용되지 않았다고 판단하지 않는다.

실무 점검 제안: 공개 도메인과 내부 도메인을 각각 조회해 변경 영향을 나눈다. 이 절은 문서 대조 결과이며 실제 인스턴스의 설정 변경과 재부팅 시험은 수행하지 않았다. 기존 절 전체의 검증일은 유지한다.

## ENA (Elastic Network Adapter)

**SR-IOV (Single Root I/O Virtualization)** 기반 고성능 네트워크 인터페이스.

- 대역폭은 인스턴스 타입, 네트워크 카드 수, ENI 배치에 따라 다르다. 일부 최신 인스턴스는 여러 네트워크 카드와 ENI를 사용해 합산 **600 Gbps**까지 지원하며 단일 ENI 한도는 별도로 확인해야 한다
- 인스턴스 간 **저지연**, 높은 PPS (Packets Per Second)
- 많은 현행 Nitro 기반 인스턴스 타입이 ENA를 사용하며 실제 지원 여부와 baseline, burst 대역폭은 타입별 네트워크 사양에서 확인
- 클러스터 컴퓨팅, 실시간 분석, 고성능 DB 통신에서 중요한 선택 요소지만 필요한 대역폭, PPS와 EFA 지원 여부를 워크로드별로 확인

### ENA Express의 SRD 경로와 설정 수명

부분 검증(2026-10-13): ENA Express 공식 문서 기준, SRD는 한 flow의 패킷을 여러 AWS 네트워크 경로로 분산하고 혼잡에 따라 경로를 조정하며 수신 측에서 순서를 복원한다. ENA를 사용한다는 사실만으로 SRD 전송까지 활성화된 것은 아니다.

- 송수신 양쪽의 인스턴스 타입 지원과 ENA Express 설정을 확인한다. 한쪽만 UDP용 ENA Express를 켜면 UDP는 일반 ENA 경로를 사용한다.
- 설정은 ENI 자체가 아니라 인스턴스와 ENI의 **attachment**에 적용된다. ENI를 분리하거나 인스턴스를 종료하면 그 attachment의 설정은 사라지므로 재부착 뒤 다시 확인한다.
- 혼잡 시 꼬리 지연 개선과 평상시 지연은 구분한다. 트래픽이 적을 때는 패킷 지연의 중앙값이 약간 늘 수 있어, 모든 부하에서 지연이 감소한다고 가정하지 않는다.

검증 제안: 지원 조건을 만족하는 같은 AZ의 두 인스턴스로 TCP와 UDP, 단일 flow와 병렬 flow를 나누어 비교한다. 설정값뿐 아니라 ENA Express 지표로 SRD 사용 여부를 확인한다. 실제 네트워크 시험은 수행하지 않았으며 기존 절 전체의 검증일은 유지한다.

### 세대 변경 뒤에는 ENA 드라이버 호환성도 확인한다

부분 검증(2026-10-14): AWS의 6세대 이후 인스턴스 이전 가이드를 대조했다. 오래된 ENA 드라이버는 처리량과 PPS 저하뿐 아니라 인스턴스 시작, ENI 연결과 장치 초기화 실패의 원인이 될 수 있다. 해당 가이드는 C6g, M6g, R6g를 드라이버 갱신 요구의 예외로 명시하므로 세대 숫자만으로 일괄 판단하지 않는다.

- Amazon Linux나 GitHub에서 설치한 ENA는 `modinfo ena`로 버전을 확인한다. 다른 Linux 배포판은 OS와 실행 중인 커널 버전을 해당 배포판의 요구 표와 대조한다.
- 가이드의 최소 기준은 GitHub Linux ENA `2.2.9g`, FreeBSD ENA `2.3.1`, DPDK `20.11`, Windows ENA `2.2.3`이다. 배포판 내장 드라이버에는 배포판별 커널 기준을 적용하며, 이 값을 최신 권장 버전으로 해석하지 않는다.
- 지원되는 OS와 커널 또는 새 AMI로 갱신한 뒤 같은 경로와 부하에서 처리량, PPS와 지연을 다시 비교한다. 드라이버 호환성과 앞 절의 대역폭, PPS 한도 진단은 별개다.

운영 적용 제안: 변경 전 복구 경로를 확보하고 검증용 인스턴스에서 먼저 확인한다. 이 절은 문서 대조 결과이며 실제 드라이버 갱신이나 성능 시험 결과는 아니다.

## 인스턴스 간 처리량을 측정하는 기준

이 절은 2026-10-09 AWS와 ESnet 공식 문서 기준이다. 같은 VPC라도 인스턴스 타입, 배치, 트래픽 경로와 연결 수가 다르면 결과가 달라진다. **단일 연결 처리량과 병렬 연결의 합산 처리량을 따로 측정**한다. 인스턴스의 최대 대역폭을 단일 TCP 연결의 보장값으로 읽지 않는다. [EC2 대역폭](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)

두 Linux 테스트 인스턴스의 타입, AZ, placement group, ENA 지원과 드라이버 상태를 기록하고 사설 IP로 연결한다. ENA가 켜져 있다는 사실만으로 ENA Express가 동작한다고 판단하지 않는다. ENA Express는 양쪽 network interface attachment의 설정과 지원 조건을 별도로 확인한다. [ENA Express](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ena-express.html)

다음은 양쪽에 iperf3가 설치된 상태에서 쓰는 비교 예시다. `SERVER_PRIVATE_IP`는 서버의 사설 IP로 바꾼다. 서버의 TCP 5201 접근을 테스트 상대에만 허용하고, UDP 시험에는 UDP 5201도 허용한다. UDP 시험에도 TCP 제어 연결이 필요하다. [iperf3 매뉴얼](https://software.es.net/iperf/invoking.html)

```bash
# 서버 인스턴스에서 실행
iperf3 -s -p 5201

# 클라이언트 인스턴스에서 각각 실행
iperf3 -c SERVER_PRIVATE_IP -p 5201 -t 10
iperf3 -c SERVER_PRIVATE_IP -p 5201 -t 10 -P 4
iperf3 -c SERVER_PRIVATE_IP -p 5201 -t 10 -P 4 -R
iperf3 -c SERVER_PRIVATE_IP -p 5201 -t 10 -u -b 100M
```

- `-P 4`는 병렬 스트림 4개의 합산 결과를 만든다. 한 연결의 성능과 분리해 해석한다. `-R`은 데이터 전송 방향을 바꾼다.
- UDP의 `-b 100M`은 송신 목표값이다. 달성 가능한 대역폭을 보장하지 않으므로 수신 결과, 손실률과 jitter를 함께 본다.
- 위의 10초는 명령 예시다. Burst 가능한 인스턴스는 네트워크 크레딧 소진 뒤 baseline으로 돌아갈 수 있으므로 짧은 최고값을 지속 처리량으로 간주하지 않는다.
- 네트워크 한도 초과는 ENA 지표도 확인한다. 짧은 microburst는 CloudWatch의 분 단위 인스턴스 지표에 드러나지 않을 수 있다.

시험 뒤 서버 프로세스를 종료하고 임시 보안 그룹 규칙을 제거한다. 이 결과는 테스트 경로의 네트워크 기준선이며, DB 처리나 애플리케이션 응답 시간까지 측정한 결과는 아니다.

### 평균 사용률이 낮아도 한도를 넘는 경우

부분 검증(2026-10-13): ENA 지표의 의미와 CloudWatch 수집 방식을 공식 문서와 대조했다. 짧은 트래픽 집중은 긴 구간의 평균에서 희석될 수 있으므로, 평균 대역폭이 낮다는 이유만으로 한도 초과를 배제하지 않는다.

| ENA 지표 | 구분할 한도와 영향 |
|---|---|
| `bw_in_allowance_exceeded`, `bw_out_allowance_exceeded` | 인바운드, 아웃바운드 대역폭 초과로 대기하거나 버린 패킷 |
| `pps_allowance_exceeded` | 양방향 PPS 한도 초과로 대기하거나 버린 패킷 |
| `conntrack_allowance_exceeded` | 연결 추적 한도 초과로 새 연결을 만들지 못해 버린 패킷 |
| `linklocal_allowance_exceeded` | Amazon DNS, IMDS, Time Sync 등 로컬 프록시 서비스의 PPS 한도 초과로 버린 패킷 |

Linux에서는 실제 인터페이스 이름으로 `ethtool -S <interface>`를 실행해 지표를 확인한다. 위 초과 카운터는 드라이버가 재설정된 뒤 누적된 값이므로, 진단 시 구간별 증가량과 재설정 여부를 함께 본다. 누적값 자체를 현재 초당 손실률로 읽지 않는다.

바이트 지표인 `NetworkIn`, `NetworkOut`은 기본 모니터링에서 5분, 상세 모니터링에서 1분 간격으로 제공된다. 패킷 수 지표인 `NetworkPacketsIn`, `NetworkPacketsOut`은 5분 간격만 제공되므로 상세 모니터링을 켜도 1분 지표가 되지 않는다. 상세 모니터링을 켜도 ENA 지표가 자동으로 수집되지는 않는다. Linux에서 CloudWatch로 보낼 ENA 지표는 agent 설정의 `metrics_collected.ethtool`에 따로 지정한다. 1분 지표도 그보다 짧은 피크를 그대로 보여 주는 것은 아니다.

진단 제안: 지연이나 손실이 발생한 시간대의 초과 카운터를 먼저 확인하고, 대역폭, PPS와 연결 추적 중 어떤 한도인지 나눈 뒤 송신 평준화나 인스턴스 크기와 분산을 검토한다. 카운터 증가만으로 트래픽 집중의 발생 주체까지 확정하지 않는다.

## 메일 발송과 포트 25 제한

이 절은 2026-10-09 AWS 공식 문서 기준이다. EC2에서 공인 주소로 SMTP 연결이 timeout이면 보안 그룹뿐 아니라 AWS의 포트 25 제한도 확인한다. 기본적으로 공인 IPv4와 IPv6 목적지로 향하는 포트 25 트래픽을 제한하지만, 출발 ENI가 속한 VPC의 primary CIDR과 RFC 1918, RFC 6598, RFC 4193 주소 범위에는 예외가 있다. 모든 사설망 SMTP 통신까지 차단된다고 일반화하지 않는다.

- **SES를 쓰는 경우:** SMTP endpoint는 TLS를 요구한다. 클라이언트가 지원하면 STARTTLS 587 또는 TLS Wrapper 465처럼 포트 25 이외의 경로를 검토한다. 포트와 TLS 연결 방식은 함께 맞춘다.
- **포트 25가 필요한 경우:** AWS에 이메일 발송 제한 해제를 요청한다. 사용 목적, 원치 않는 메일 발송 방지 대책과 대상 리전을 설명하며, 여러 리전이면 리전별로 요청한다. 신청 자체를 승인으로 간주하지 않는다.
- **Lambda에서 해제 요청하는 경우:** 먼저 함수에 VPC를 연결한다. 인터넷 IPv4 발송 경로는 private subnet에서 NAT gateway를 거치도록 구성한다. Public subnet에 함수를 연결하는 것만으로 인터넷 접근이 생기지는 않는다.

진단은 네트워크 연결, SMTP 인증과 TLS, 수신 측의 배달 결과를 나누어 진행한다. 제한 해제만으로 보안 그룹, 라우팅 또는 수신 측 스팸 차단까지 해결됐다고 판단하지 않는다.

## Key Pair

EC2 SSH 접속 시 사용하는 **공개키/개인키 쌍**. AWS가 공개키를 인스턴스에 저장, 사용자가 개인키(`*.pem`)를 보유.

- SSH 접속 시 공개키 인증에 사용한다. 세션 트래픽 암호화는 SSH가 별도로 협상한 세션 키가 담당한다
- **개인키 분실 시 해당 키로는 접속 불가** — Key Pair의 개인키를 AWS에서 복구할 수는 없다. 다만 사전 구성에 따라 Session Manager, EC2 Instance Connect, user data, EBS 분리 후 `authorized_keys` 수정 등 다른 복구 경로가 있을 수 있다
- OS별 기본 Username 상이:
  - Amazon Linux: `ec2-user`
  - Ubuntu: `ubuntu`
  - CentOS: `centos`
  - Debian: `admin`
- **보관 원칙**: 개인키 외부 유출 금지, Git 커밋 금지, 권한 `chmod 400`

현업 권장: SSH Key Pair 의존을 줄이고 **AWS Systems Manager Session Manager**로 대체 (IAM 권한 기반, 포트 22 개방 불필요, 세션 로깅).

### EC2 Instance Connect Endpoint — 연결 경로와 SSH 인증 분리

2026-10-13 EC2 공식 문서 대조 기준이다. EC2 Instance Connect Endpoint(EICE)는 IAM으로 접근을 제어하는 TCP 프록시다. 인스턴스의 공인 IP, bastion host와 VPC의 직접 인터넷 연결 없이 관리 접속 경로를 제공하지만, Linux SSH 인증 준비까지 없애지는 않는다.

- **자체 키 페어 사용:** Linux AMI에서 기존 SSH 키로 인증할 수 있다. EICE는 사설 연결 경로를 제공한다.
- **자체 키 페어를 사용하지 않음:** 대상에 EC2 Instance Connect가 설치되어 있어야 한다. SSM Agent가 필요 없다는 설명을 게스트 측 준비가 전혀 없다는 뜻으로 확대하지 않는다.
- **네트워크 권한:** endpoint 보안 그룹은 대상 인스턴스의 SSH 포트로 나가는 트래픽을 허용하고, 인스턴스 보안 그룹은 endpoint에서 오는 SSH 트래픽을 허용한다. Endpoint 보안 그룹의 인바운드 규칙과 무관하게 서비스 트래픽이 들어오므로, 누가 터널을 사용할지는 IAM으로 제한한다.
- **소스 주소:** 인스턴스 인바운드 규칙에 endpoint 보안 그룹을 참조할 수 있다. IPv4 CIDR로 제한한다면 client IP preservation이 꺼졌을 때는 endpoint ENI 주소, 켜졌을 때는 클라이언트 주소를 기준으로 한다.

접속 실패는 터널 사용 권한, endpoint에서 대상까지의 경로와 보안 그룹, OS 사용자와 SSH 인증 순서로 나누어 확인한다. EICE는 관리 트래픽용이며 대용량 데이터 전송의 기본 경로로 쓰지 않는다.

### AWSSupport-ResetAccess로 접근 복구

2026-10-09 Systems Manager Automation 공식 문서 기준이다. `AWSSupport-ResetAccess`는 EC2Rescue로 Linux에 새 SSH 키를 생성해 추가하거나 Windows의 암호 해독을 다시 활성화한다. Windows 키 페어를 분실한 경우에는 생성된 password-enabled AMI에서 보유한 키 페어로 새 인스턴스를 시작하는 경로도 제공한다. 잃어버린 개인키 자체를 복원하는 기능은 아니다.

실행 전에 다음 조건을 확인한다.

- **중단과 데이터 영향:** 대상 인스턴스를 중지하고 작업 전 AMI를 만든다. Instance store 데이터는 사라지고, EIP가 없으면 공인 IP가 바뀐다. 백업 AMI가 instance store까지 보존한다고 가정하지 않는다.
- **복구 경로:** 지정할 구조용 서브넷은 대상과 같은 AZ에 있어야 하며 SSM endpoint에 접근할 수 있어야 한다. 하위 `AWSSupport-StartEC2RescueWorkflow`는 Marketplace AMI로 만든 인스턴스를 지원하지 않는다.
- **루트 볼륨:** 하위 워크플로의 문서화된 단계는 루트 볼륨이 EBS이고 암호화되지 않았는지 검사한다. 암호화된 루트 볼륨에도 이 절차를 그대로 적용할 수 있다고 가정하지 않는다.
- **실행 권한:** `AutomationAssumeRole`을 생략하면 실행한 사용자의 권한을 쓴다. 자동화 시작과 출력 조회 권한뿐 아니라 하위 워크플로의 EC2, IAM 등 필요한 권한도 확인한다.

Linux 결과에는 백업 AMI와 새 SSH 키를 담은 SSM 파라미터의 이름이 나온다. 키를 보고서나 공유 로그에 복사하지 않고 접근을 제한한다. 완료 후 실제 접속과 서비스 상태를 확인하고, 남은 백업 AMI의 접근 권한과 보존 여부를 정한다. 이 절은 문서 기반 복구 절차이며 실제 인스턴스에서 실행한 기록은 아니다.

## 출처

- [How do I assign a static DNS server to an EC2 instance that persists when I reboot? — AWS re:Post](https://repost.aws/knowledge-center/ec2-static-dns-ubuntu-debian)
- [How do I resolve network performance issues with sixth generation and later Amazon EC2 instances? — AWS re:Post](https://repost.aws/knowledge-center/migrate-to-gen6-ec2-instance)
- [AWS 공식 문서, CloudWatch metrics that are available for your instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html)
- [AWS 공식 문서, Monitor network performance for ENA settings on your EC2 instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-network-performance-ena.html)
- [AWS 공식 문서, Manage detailed monitoring for your EC2 instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html)
- [AWS 공식 문서, Collect network performance metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-network-performance.html)
- [AWS 공식 문서, Connect to your instances using a private IP address and EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-with-ec2-instance-connect-endpoint.html)
- [AWS 공식 문서, Security groups for EC2 Instance Connect Endpoint](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/eice-security-groups.html)
- [AWS 공식 문서, AWSSupport-ResetAccess](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-awssupport-resetaccess.html)
- [AWS 공식 문서, AWSSupport-StartEC2RescueWorkflow](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-awssupport-startec2rescueworkflow.html)
- [AWS 공식 문서, Amazon EC2 service quotas — Restriction on email sent using port 25](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html#port-25-throttle)
- [Remove port 25 restrictions for instances and functions — AWS re:Post](https://repost.aws/knowledge-center/ec2-port-25-throttle)
- [AWS 공식 문서, Connecting to an Amazon SES SMTP endpoint](https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html)
- [AWS 공식 문서, Enable internet access for VPC-connected Lambda functions](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html)
- [ESnet, Invoking iperf3](https://software.es.net/iperf/invoking.html)
- [AWS 공식 문서, Improve network performance between EC2 instances with ENA Express](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ena-express.html)
- [Change the primary private IP address of an EC2 instance — AWS re:Post](https://repost.aws/knowledge-center/ec2-change-primary-ip)
- [AWS 공식 문서, Amazon EC2 instance IP addressing](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-instance-addressing.html)
- [AWS 공식 문서, Create an Amazon EBS-backed AMI](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html)
- [Amazon VPC 공식 문서, AWS charges for all public IPv4 addresses](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html)
- [EC2 instance metadata options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html)
- [IMDSv2 작동 방식](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html)
- [EC2, Configure instance metadata options for new instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-new-instances.html)
- [New AWS Public IPv4 Address Charge — AWS News Blog](https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/)
- [AWS 공식 문서, Amazon EC2 instance network bandwidth](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html)
- [AWS 공식 문서, General purpose instance network specifications](https://docs.aws.amazon.com/ec2/latest/instancetypes/gp.html)
- [AWS 공식 문서, Amazon EC2 key pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [EC2 연결 옵션](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect.html)
- [EC2 network interface 생성과 이동 제한](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-network-interface.html)
- [AWS 공식 문서, EC2 인스턴스의 기본 사용자 이름](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs-general.html)

## 관련 문서

- [[EC2|EC2 개요]]
- [[EC2-Operations|EC2 운영과 AMI]]
