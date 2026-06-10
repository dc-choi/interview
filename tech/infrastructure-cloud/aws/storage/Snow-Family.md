---
tags: [aws, snow-family, snowball, snowcone, snowmobile, edge-computing, data-migration]
status: done
category: "Infrastructure - AWS"
aliases: ["AWS Snow Family", "Snowball Edge", "Snowcone", "Snowmobile"]
---

# AWS Snow Family · 오프라인 대용량 데이터 이전

AWS Snow Family는 **페타바이트~엑사바이트급 데이터를 물리 디바이스에 담아 오프라인으로 AWS에 옮기는** 휴대형 장비 세트. 인터넷 회선으로 옮기기엔 너무 크거나, 회선 자체가 부실/단절된 환경(원격 현장·해상·재난지역)을 메우기 위한 서비스. 데이터 이송과 별개로 **엣지 컴퓨팅 모드**가 있어 현장에서 EC2/Lambda를 돌릴 수도 있다.

## 구성 디바이스

| 디바이스 | 폼팩터 | 용량 (대략) | 주 용도 |
|---|---|---|---|
| **Snowcone** | 한 손으로 드는 소형 (드론 배송 가능) | 8TB HDD / 14TB SSD | 소규모·휴대용·엣지, DataSync 온라인 전송 가능 |
| **Snowball Edge** | 여행 가방 크기 | 수십 TB ~ 80TB+ | 페타바이트 이송, 엣지 컴퓨팅 |
| **Snowmobile** | 45ft 컨테이너 트럭 | 최대 100PB / 한 번 운행 시 엑사바이트급 | 데이터센터 통째 이전, S3·Glacier 적재 |

## Snowball Edge 세부 유형

- **Storage Optimized** — 대용량 스토리지 + 적당한 컴퓨팅. 대규모 데이터 이송이나 큰 스토리지가 필요한 로컬 작업용
- **Compute Optimized** — GPU 포함 고성능 컴퓨팅. ML 추론·영상 분석·엣지 처리 등 현장 연산이 핵심일 때

두 모델 모두 EC2 인스턴스·Lambda 함수를 디바이스 내부에서 실행하는 **엣지 컴퓨팅**을 지원한다.

## 동작 흐름

1. AWS 콘솔에서 디바이스(작업) 주문 → AWS가 배송
2. 현장에서 디바이스 연결, **AWS OpsHub** 또는 CLI로 데이터 적재 (S3 어댑터 또는 NFS)
3. 디바이스 봉인 → 배송 라벨로 AWS 반송
4. AWS 입고 → 지정 리전의 **S3** (Snowmobile은 S3 또는 **Glacier**)에 자동 업로드
5. 데이터 검증 후 디바이스의 데이터는 안전 삭제(NIST 800-88)

## 보안 특징

- **하드웨어 암호화** — AES-256, KMS 키로 관리. 디바이스 분실/탈취 시 데이터 접근 불가
- **TPM 기반 변조 감지** — 봉인이 뜯기면 검증 단계에서 작업 실패
- **물리 봉인 + 추적** — 운송 중 위치 추적, E-Ink 라벨로 자동 반송 처리

## 엣지 컴퓨팅 모드

- 네트워크가 단절된 환경(선박·유전·전장·재난 현장)에서도 **EC2 AMI와 Lambda 함수**를 디바이스 위에서 실행
- 현장에서 데이터 전처리·필터링 → 핵심 데이터만 S3로 회수
- 클러스터링 가능 (Snowball Edge 여러 대로 가용성/용량 확장)

## 언제 Snow Family를 쓰는가 (결정 기준)

대용량 이전 시 회선/디바이스 선택 가이드:

| 데이터 양 / 환경 | 권장 수단 |
|---|---|
| ~수십 GB | 인터넷 직접 업로드 (S3 multipart) |
| ~수 TB, 회선 양호 | **DataSync** (지속 동기화) 또는 **Storage Gateway** |
| 수 TB ~ 페타바이트, 회선 부실 | **Snowball Edge** |
| 페타바이트 이하·소형/엣지 | **Snowcone** |
| 수십~수백 PB, 엑사바이트급 | **Snowmobile** |
| 지속적 하이브리드 연계 | **Direct Connect + Storage Gateway/DataSync** |

흔히 **"100TB를 인터넷으로 옮기는 데 걸리는 시간 vs Snowball 배송 시간(며칠)"** 비교가 시험 단골. 1Gbps 회선으로도 100TB는 10일 이상이라 Snowball이 빠르다.

## Snow Family vs Storage Gateway vs DataSync

- **Snow Family** — **일회성 오프라인 대량 이전**. 디바이스 배송이 본질
- **DataSync** — **온라인 일괄/주기 동기화**. 온프레미스 NAS↔S3/EFS/FSx 자동 마이그레이션 (회선 필요)
- **Storage Gateway** — **지속적인 하이브리드 마운트**. 온프레미스에서 S3/EBS/Tape처럼 보이게 함

Snow는 "옮기고 끝", DataSync는 "주기적으로 옮김", Storage Gateway는 "마운트해서 계속 씀"으로 구분.

## 시험 체크포인트

- Snow Family 세 디바이스의 폼팩터·용량·주 용도 구분
- Snowball Edge **Storage Optimized vs Compute Optimized** 차이 (GPU 유무, 워크로드)
- **Snowcone은 DataSync로 온라인 전송도 가능** — 다른 디바이스와 구분되는 포인트
- Snowmobile 적재 대상은 **S3 또는 Glacier**
- **엣지 컴퓨팅**(EC2·Lambda) 지원 — 네트워크 단절 환경 시나리오
- **암호화는 KMS 기반**, 변조 감지·자동 삭제로 분실 대응
- Snow vs DataSync vs Storage Gateway 결정 기준 (회선 양호/부실, 일회성/지속)
- 대용량 이전 시간 계산 시 인터넷 대비 Snow가 빠른 임계점

## 출처
- AWS SAA C03 학습 자료 (로컬)
- [AWS Snow Family 공식 문서](https://aws.amazon.com/snow/)

## 관련 문서
- [[S3|Amazon S3]]
- [[Storage-Gateway-DataSync|Storage Gateway · DataSync]]
- [[EFS|Amazon EFS]]
- [[AWS|AWS]]
