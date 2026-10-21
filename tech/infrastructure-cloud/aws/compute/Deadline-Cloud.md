---
tags: [aws, deadline-cloud, rendering, fleet, batch]
status: done
verified_at: 2026-10-22
category: "Infrastructure - AWS"
aliases: ["AWS Deadline Cloud", "클라우드 렌더팜"]
---

# AWS Deadline Cloud

Deadline Cloud는 렌더링 등 작업을 queue에 제출하고 연결된 fleet의 worker에서 실행하도록 관리한다. farm 안에서 작업과 실행 자원을 구성하며, 클라우드 또는 온프레미스 worker를 사용하는 방식을 선택할 수 있다.

## Fleet의 운영 책임

| 유형 | 관리 범위 | 선택할 때 확인할 것 |
| --- | --- | --- |
| Service-managed fleet(SMF) | Deadline Cloud가 worker와 확장을 관리 | 필요한 소프트웨어, OS와 자원 구성을 지원하는지 |
| Customer-managed fleet(CMF) | 사용자가 worker의 네트워크와 소프트웨어, 운영을 관리 | 기존 장비와 도구의 통제 이점이 운영 부담보다 큰지 |

CMF의 worker는 EC2, 온프레미스 또는 공동 배치 시설에 둘 수 있다. worker agent와 Deadline Cloud endpoint 접근이 필요하다. 네트워크가 완전히 끊긴 로컬 렌더팜을 같은 방식으로 관리한다고 가정하지 않는다.

2026-10-22 지원 문서 기준, 기본 제공 목록에 없는 애플리케이션이나 플러그인이라고 CMF가 반드시 필요한 것은 아니다. SMF에서도 직접 구성한 conda channel의 패키지를 설치할 수 있다. submitter, worker용 패키지와 usage-based licensing 지원은 각각 확인한다.

## Job attachments의 저장 방식

Job attachments는 작업에 필요한 데이터를 S3로 전달한다. 파일 내용을 해시한 주소로 저장하고 원래 경로와 디렉터리 구조는 manifest로 연결한다. 같은 내용은 이름이나 위치가 달라도 같은 해시를 가지므로 이미 저장된 파일의 재업로드를 피할 수 있다.

S3 객체 이름이 해시라는 사실과 암호화는 다른 개념이다. 객체를 원래 파일 경로로 복원하는 과정도 암호 해독과 같지 않다. 결과물을 후처리할 때는 manifest와 원래 파일명, 작업 및 실행 결과의 대응을 먼저 확인한다.

다음은 파이프라인 설계 제안이다. 렌더링 완료 결과를 검토용 영상으로 변환한다면 성공한 출력만 선택하고, 같은 완료 신호가 반복돼도 변환 결과가 중복 등록되지 않도록 한다. worker와 제출 PC의 OS가 다르면 경로, 플러그인과 색상 설정을 포함한 동일 장면으로 비교한다.

## 예산과 처리량 제어

Deadline Cloud의 budget과 usage explorer는 추정치를 표시한다. 실제 청구의 정본은 AWS 청구서다. queue의 budget은 누적 추정 지출을 관리하고 fleet의 최대 worker 수는 동시 컴퓨트 사용량을 제한한다.

예산 임계값에 도달했을 때의 동작은 설정한 limit action에 달려 있다. 새 task 스케줄링을 멈추는 것과 실행 중 task까지 취소하는 것을 구분한다. 예산을 만들었다는 사실만으로 모든 실행과 연관 서비스의 과금이 즉시 멈춘다고 판단하지 않는다.

## 도입 검증 제안

1. 동일 장면과 도구 버전으로 기존 렌더팜과 비교한다. 렌더 시간뿐 아니라 업로드, 준비, 결과 다운로드와 검수까지 측정한다.
2. worker 수를 늘릴 때 저장소 처리량과 라이선스 수가 함께 버티는지 확인한다. 작업 하나의 빨라진 시간과 전체 비용 절감은 별도 결과다.
3. 중단된 task를 재실행해 부분 출력이 완성본으로 게시되지 않는지 확인한다.
4. 마감 시각과 남은 예산을 기준으로 자원을 조정하고, 행사나 프로젝트가 끝난 뒤 확장 설정을 되돌린다.

2026-10-22 공식 문서와 2024년 구축 발표를 대조했다. 발표의 특정 인스턴스 성능과 절감률, 현재 모든 DCC 버전의 호환성은 재현하지 않았다.

## 출처

- [AWS, Deadline Cloud fleets](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/manage-fleets.html)
- [AWS, Create and use Deadline Cloud customer-managed fleets](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/manage-cmf.html)
- [AWS, Supported Software](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/supported-software.html)
- [AWS, Submit jobs with job attachments in Deadline Cloud](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/run-jobs-job-attachments.html)
- [AWS, How Deadline Cloud uploads files to Amazon S3](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/what-job-attachments-uploads-to-amazon-s3.html)
- [AWS, Manage costs and usage for Deadline Cloud farms](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/manage-costs.html)
- [로드원오원의 AWS Deadline Cloud를 이용한 클라우드 랜더팜 구축 사례 — AWS Korea](https://www.youtube.com/watch?v=nL0PW7504qo) — AWS Industry Week 2024 발표, 2025-01-10 공개

## 관련 문서

- [[compute|AWS 컴퓨팅 서비스]]
- [[AWS-Media-Services|AWS 미디어 서비스]]
- [[S3|Amazon S3]]
- [[FSx|Amazon FSx]]
