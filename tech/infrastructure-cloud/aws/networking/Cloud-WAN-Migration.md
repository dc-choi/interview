---
tags: [aws, cloud-wan, transit-gateway, migration, networking]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Cloud WAN 마이그레이션", "Cloud WAN 정책과 단계적 전환"]
---

# Cloud WAN의 정책과 단계적 네트워크 전환

AWS Cloud WAN은 core network policy로 네트워크 segment와 attachment 연결 규칙을 관리한다. 기존 Transit Gateway(TGW) 환경을 옮길 때는 정책 생성, 경로 변경과 실제 통신 검증을 나누어 다룬다.

## 정책이 제어하는 것

| 구성 | 역할과 확인점 |
|---|---|
| `segments` | 별도 라우팅 도메인을 정의한다. 기본적으로 attachment는 같은 segment 안에서 통신하며, segment 간 공유는 별도 정책으로 정한다 |
| `segment-actions` | segment 간 경로 공유와 경로 설정 등의 동작을 정의한다 |
| `attachment-policies` | 조건에 따라 attachment를 segment에 연결한다. 태그 조건은 원본 VPC의 태그가 아니라 attachment 자체의 태그를 평가한다 |
| TGW route table attachment | TGW의 특정 route table을 core network에 연결한다. 생성 시 사용할 TGW peering과 route table을 선택한다 |

따라서 TGW를 한 번에 없애는 방식만 가능한 것은 아니다. TGW route table attachment를 이용한 공존 구성을 검토할 수 있다. 실제로 어떤 경로를 공유할지는 각 route table과 segment 정책을 대조한다.

## 정책 생성과 적용은 별도다

새 policy version은 자동 배포되지 않는다. change set에서 기존 LIVE 정책과 새 정책의 차이를 확인하고 적용한다. 이전 정책 버전을 다시 현재 버전으로 복원하는 기능도 제공한다.

정책 복원만으로 VPC route table 변경, 삭제한 attachment와 다른 서비스의 설정까지 모두 되돌아간다고 가정하지 않는다. 정책 버전 복구와 전체 네트워크 롤백을 구분한다.

## 전환 계획의 검증 순서

다음은 정책과 attachment 동작에서 도출한 운영 체크포인트다. 모든 환경에서 무중단을 보장하는 절차는 아니다.

1. 현재 VPC/TGW route table, propagation과 association, 보안 규칙을 수집하고 출발지부터 목적지까지 왕복 경로를 기록한다.
2. 새 segment와 attachment 매핑을 정한 뒤 TGW와의 공존 경로를 검토한다. 기존 정적 경로와 새 경로의 우선순위, 중복 CIDR, 우회와 blackhole 가능성을 확인한다.
3. 영향이 작은 연결부터 전환하고 실제 애플리케이션 요청, DNS, 지연과 오류를 변경 전 기준과 비교한다.
4. 각 단계의 되돌릴 경로, 정책 버전과 중단 조건을 남긴다. 새 경로와 롤백 검증이 끝나기 전에 기존 연결을 삭제하지 않는다.

AI로 경로 목록이나 변경안을 만들더라도 원본 조회 결과와 change set에 대조한다. 구성도나 분석 보고서 생성은 실제 패킷 전달과 서비스 연속성의 증거가 아니다.

## 출처

- [AWS Network Manager, Core network policy version parameters](https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policies-json.html)
- [AWS Network Manager, Create a transit gateway route table attachment](https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-tgw-attachment-add.html)
- [AWS Network Manager, Core network policy versions](https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-create-policy-version.html)
- [AWS Network Manager, View a core network policy change set](https://docs.aws.amazon.com/network-manager/latest/cloudwan/cloudwan-policy-version-view.html)

## 관련 문서

- [[Transit-Gateway|Transit Gateway 연결과 라우팅]]
- [[VPC-Connectivity|VPC 연결 방식]]
- [[Cloud-Migration-Strategies|클라우드 마이그레이션 전략]]
