---
tags: [storage, infrastructure, das, nas, san]
status: done
verified_at: 2026-11-14
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Storage Access Models", "DAS NAS SAN", "블록 파일 객체 스토리지", "Software-Defined Storage", "소프트웨어 정의 스토리지"]
---

# 저장장치 연결과 데이터 접근 방식

저장장치를 비교할 때는 서버와 연결하는 방식, 애플리케이션에 제공하는 접근 단위, 여러 서버가 함께 쓰는 조건을 나눈다. HDD나 SSD라는 매체 이름만으로 이 세 가지를 알 수는 없다.

## DAS, NAS와 SAN

| 구분 | 서버가 사용하는 방식 | 확인할 경계 |
|---|---|---|
| DAS, Direct Attached Storage | 서버에 직접 연결된 저장장치를 사용 | 서버별로 묶인 용량과 장애 시 데이터 접근 경로 |
| NAS, Network Attached Storage | 네트워크의 파일 서비스를 통해 이름과 경로로 접근 | NFS, SMB 같은 파일 프로토콜, 권한과 공유 조건 |
| SAN, Storage Area Network | 저장장치 접근을 위한 네트워크를 사용. 대표적인 구성은 원격 블록 장치 제공 | 연결 프로토콜, 장치 접근 권한과 동시 쓰기 조정 |

SNIA의 SAN 정의는 Fibre Channel에 한정되지 않으며, 저장장치 접근이 주목적인 Ethernet 기반 망도 포함한다. SAN은 보통 블록 I/O와 연결해 설명하지만 정의상 모든 SAN을 블록 전용으로 제한하지 않는다. 따라서 SAN을 특정 케이블이나 스위치 제품과 같은 뜻으로 쓰지 않는다.

SCSI에서 **logical unit**은 I/O 명령을 처리하는 논리적 대상이고, **LUN(Logical Unit Number)**은 target 안에서 그 대상을 식별하는 번호다. 운영 대화에서 LUN을 할당된 디스크처럼 표현하더라도 번호와 실제 논리 장치를 구분한다.

## 블록, 파일과 객체

| 접근 단위 | 애플리케이션 관점 | 예시 |
|---|---|---|
| 블록 | 주소가 있는 블록을 읽고 쓴다. 파일시스템을 사용한다면 그 위에 구성한다 | 서버의 디스크, 원격 블록 볼륨 |
| 파일 | 디렉터리와 파일 경로를 사용하며 파일 서비스의 의미를 따른다 | 공유 문서 폴더, NFS 파일시스템 |
| 객체 | 객체 식별자와 API로 데이터 및 메타데이터에 접근한다 | 이미지와 백업 객체 보관 |

예를 들어 Amazon S3의 객체에는 사용자가 부여한 key, 데이터와 메타데이터가 있다. 버전 관리를 사용하면 key와 version ID를 함께 본다. 객체 저장을 파일시스템의 경로, 부분 갱신과 잠금 동작이 그대로 제공되는 것으로 가정하지 않고 API 계약을 확인한다.

블록 저장장치 위에 파일시스템을 만들고 파일 서버가 이를 공유할 수 있다. 따라서 내부 매체가 블록 장치라는 사실과 클라이언트가 파일로 접근한다는 사실은 충돌하지 않는다. 애플리케이션이 보는 인터페이스를 기준으로 구분한다.

## 공유 연결과 안전한 동시 쓰기는 다르다

같은 블록 장치를 여러 서버에 연결했다고 일반 파일시스템을 동시에 쓰기 마운트해도 되는 것은 아니다. AWS의 EBS Multi-Attach 안내도 XFS와 EXT4를 여러 서버의 동시 접근용으로 설계된 파일시스템으로 보지 않으며, 클러스터 파일시스템 사용과 애플리케이션의 쓰기 순서 조정을 요구한다.

적용할 때는 장치의 다중 연결 지원, 파일시스템의 공유 지원, 쓰기 순서와 fencing을 각각 확인한다. fencing은 공유 환경에서 쓰기 접근을 통제하는 수단이다. 파일 공유 서비스가 동시 접근을 지원해도 애플리케이션 수준의 덮어쓰기 충돌까지 자동으로 해결한다고 가정하지 않는다.

## 소프트웨어 정의 스토리지

소프트웨어 정의 스토리지(SDS, Software-Defined Storage)는 저장 기능을 전용 하드웨어에서 분리해 소프트웨어로 제어하는 구성을 부르는 업계 용어다. 흔한 형태는 여러 서버의 디스크를 하나의 저장 풀로 묶고, 데이터 배치와 복제, 복구를 소프트웨어가 맡으며, 노드를 더해 용량을 늘리는 것이다. 이 정의와 형태는 입문 영상의 설명이며, 아래 두 예가 이 형태라는 점은 각 제품 문서로 확인했다. 표준 기관(SNIA)의 정의는 이 문서에서 대조하지 못했으므로 제품마다 무엇을 소프트웨어가 맡는지 따로 확인한다.

- **Ceph:** 데이터를 여러 서버에 중복 저장하는 소프트웨어다. 하나의 객체 저장소 RADOS 위에 파일(CephFS), 블록(RBD)과 객체(RGW) 인터페이스를 둔다. 각 객체는 placement group(PG)에, 각 PG는 여러 OSD에 매핑된다. OSD 데몬이 데이터를 객체로 저장하고, 데이터 위치는 CRUSH 알고리즘으로 계산한다. 공식 입문 문서는 권장대로 구성한 클러스터라면 디스크나 서버 하나를 잃어도 데이터를 잃지 않는다고 설명한다. 이는 복제나 erasure coding 같은 풀의 데이터 보호 설정과 권장 구성을 전제로 한 설명이며, 입문 문서는 권장 구성의 세부를 정의하지 않는다.
- **VMware vSAN:** VMware Cloud Foundation과 vSphere Foundation의 통합 스토리지로 소개되는 분산 scale-out 스토리지다. 기술 문서는 vSAN을 software-defined 스토리지로 분류하고, 각 ESX host의 로컬 또는 직접 연결 용량 장치를 모아 클러스터의 모든 host가 공유하는 단일 저장 풀을 만든다고 설명한다. 제품 안내 기준 클러스터당 최대 64노드까지 확장하며, 일반 안내는 3노드, Edge 구성은 2노드부터 시작할 수 있다고 설명한다.

전용 장비 대비 비용 절감, 노드 추가만으로 늘리는 확장과 벤더 종속 완화는 SDS의 흔한 도입 논리다. 다만 다음을 함께 비교해야 실제 비용이 나온다(적용 제안).

- 복제나 erasure coding에 쓰이는 원시 용량과 사용 가능한 용량의 차이
- 노드 사이 복제와 복구 트래픽을 감당할 네트워크
- 디스크나 노드 장애 뒤 데이터 재배치가 서비스 지연에 주는 영향
- 클러스터를 운영할 인력과 업그레이드 절차

범용 서버를 쓴다고 장비를 아무것이나 섞어도 된다는 뜻은 아니다. 지원하는 하드웨어 조건은 각 제품의 문서로 확인한다.

## 선택 전 점검

다음은 연결 및 접근 방식의 차이를 설계에 적용하는 점검 질문이다. 특정 제품의 성능 순위나 최저 비용을 보장하는 기준은 아니다.

1. 프로그램이 블록 장치, 공유 파일 경로와 객체 API 중 무엇을 요구하는가?
2. 여러 서버가 같은 데이터를 읽기만 하는가, 동시에 수정하는가?
3. 실제 요청 크기, 읽기/쓰기 비중과 동시성에서 지연과 처리량은 충분한가?
4. 서버, 네트워크나 저장장치가 중단되면 어느 경로로 복구하며 누가 운영하는가?
5. 장비 비용뿐 아니라 네트워크, 용량 확장과 운영 시간을 포함했는가?

공유 저장장치 선택과 백업 및 복구 검증은 별도 결정이다. 여러 서버에서 접근할 수 있다는 사실을 손상이나 삭제에 대한 복구 보장으로 해석하지 않는다.

## 출처

- [SNIA, SNIA Dictionary](https://www.snia.org/sites/default/files/dictionary/SNIADictionary.pdf) — 2026-04-28 판의 DAS, NAS, SAN, logical unit과 LUN 정의를 2026-10-24 대조.
- [Block vs File vs Object Storage — AWS](https://aws.amazon.com/compare/the-difference-between-block-file-object-storage/) — 접근 단위와 파일 공유 용도 확인. 성능과 확장성의 포괄적 홍보 표현은 제품별 보장으로 사용하지 않는다.
- [AWS, Amazon S3 objects overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html) — key, version ID, 데이터와 메타데이터 구성.
- [AWS, Attach an EBS volume to multiple EC2 instances using Multi-Attach](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html) — 동시 파일시스템 접근, 쓰기 순서와 fencing의 경계.
- [Ceph Documentation, Beginner's Guide](https://docs.ceph.com/en/latest/start/beginners-guide/) — 2026-11-14 개발 버전(latest) 문서 기준. 다중 서버 중복 저장, RADOS 위의 CephFS, RBD와 RGW, 객체에서 PG와 OSD로의 매핑 대조.
- [Ceph Documentation, Storage Cluster](https://docs.ceph.com/en/latest/architecture/storage-cluster/) — 2026-11-14 개발 버전 문서 기준. OSD 데몬의 객체 저장과 CRUSH 알고리즘의 위치 계산 대조.
- [VMware vSAN — Broadcom](https://www.vmware.com/products/cloud-infrastructure/vsan) — 2026-11-14 제품 안내의 통합 대상, 분산 scale-out 구조, 클러스터당 최대 64노드와 3노드(Edge는 2노드) 시작 안내 확인.
- [Broadcom TechDocs, What is vSAN](https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-9-0-and-later/9-1/vsan-deployment-administration-and-monitoring/vsan-planning-and-deployment/what-is-vsan.html) — 2026-11-14 software-defined 분류와 host 로컬 용량의 단일 풀 구성 확인(2차 검증자 대조).
- [#NW 0020 - 스토리지 비용을 확 줄이는 마법? SDS 90초 완벽 정리 — 길리랩](https://www.youtube.com/watch?v=3WrR7t3iThg) — SDS의 정의, 자원 풀, scale-out과 도입 효과의 설명. 공식 출처로 대조하지 않은 일반 설명이다.

## 관련 문서

- [[Storage-and-FileSystem-Devices|저장 매체와 통신 규격]]
- [[Storage-and-FileSystem-Performance|디스크 I/O와 RAID]]
- [[EBS|AWS 블록 스토리지]]
- [[EFS|AWS 공유 파일 스토리지]]
