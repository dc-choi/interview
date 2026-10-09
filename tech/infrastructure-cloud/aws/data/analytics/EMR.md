---
tags: [infrastructure, aws, emr, hadoop, spark, bigdata]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["EMR", "Amazon EMR", "Elastic MapReduce"]
---

# Amazon EMR (Elastic MapReduce)

AWS에서 Hadoop, Spark 같은 빅데이터 프레임워크를 실행하는 관리형 서비스다. 아래 노드 구성과 YARN 진단은 **EMR on EC2** 기준이다. EMR Serverless는 Spark와 Hive 애플리케이션을 클러스터 직접 관리 없이 실행하는 별도 배포 선택지다.

## 핵심

- 빅데이터 분석/처리용 매니지드 클러스터
- 지원 프레임워크: **Hadoop, Spark, HBase, Presto, Flink, Hive**
- EC2 클러스터 위에서 작동 — Spot 인스턴스로 비용 절감 가능

## 노드 유형

| 노드 | 역할 |
|------|------|
| **Primary 노드** | 클러스터 관리, 다른 노드 상태 조정 |
| **Core 노드** | 태스크 실행 + 데이터 저장 (HDFS, 장기 실행) |
| **Task 노드** | 태스크만 실행 — Spot 인스턴스 활용 (선택, 단기 OK) |

## 사용 사례

- 머신러닝 (Spark ML)
- 웹 인덱싱
- 빅데이터 ETL — Hadoop/Spark 기반
- 로그 분석

## EMR vs 다른 분석 서비스

| 서비스 | 성격 |
|--------|------|
| **EMR** | Hadoop/Spark 등 빅데이터 프레임워크 매니지드 — 코드 직접 작성 |
| **Glue** | 서버리스 ETL — Spark 기반이지만 인프라 관리 없음 |
| **Athena** | S3 데이터의 서버리스 SQL 조회가 대표 용도 |
| **Redshift** | OLAP 데이터 웨어하우스 — 정형 분석 중심 |

## 클러스터 시작의 internal error 진단

2026-10-09 AWS 공식 자료 기준이다. `Failed to start the job flow due to an internal error`는 시작 실패 메시지이며, 이 문구만으로 원인을 하나로 확정하지 않는다. 새로 시작해도 반복되면 다음 경계를 나눠 확인한다.

1. **IAM과 KMS:** EMR 서비스 역할과 EC2 인스턴스 프로파일 역할의 필요한 권한을 확인한다. 디스크 암호화 설정을 쓰면 서비스 역할이 지정한 KMS 키를 사용할 수 있는지도 확인한다. 오류를 없애기 위해 모든 자원에 관리자 권한을 부여하지 않는다.
2. **실패한 노드의 증거:** 연결 timeout이 있다면 종료된 EC2 노드의 system log로 실패 지점을 확인한다. 종료 노드는 콘솔에 계속 남지 않으므로 확인 가능한 동안 로그를 확보한다.
3. **VPC 경로와 보안 그룹:** 데이터 소스에 도달하는 서브넷 경로와 primary, core, task 노드의 보안 그룹을 확인한다. DNS hostnames와 DNS resolution 설정도 점검한다. Private subnet의 NAT gateway는 인터넷 통신이 필요한 경우의 선택지이며 모든 구성에 필수라고 단정하지 않는다.

설정을 수정한 뒤 새 클러스터의 시작을 확인한다. 생성 성공과 실제 데이터 접근, 작업 성공은 별도로 검증한다. Spark 태스크가 실행된 뒤 발생하는 메모리 부족은 아래의 런타임 진단으로 분리한다.

## Spark 컨테이너 종료와 메모리 진단

`Container killed on request. Exit code is 137`만으로 메모리 부족을 확정하지 않는다. Bash의 신호 종료 상태는 `128 + 신호 번호`이며, Linux의 SIGKILL은 9다. 종료 주체와 이유는 YARN 진단, driver/executor 로그와 노드의 OOM 기록을 함께 확인한다.

메모리 부족이 확인됐다면 다음 순서로 범위를 좁힌다. 설정 설명은 Spark 3.5.7 공식 문서 기준이며, 적용할 EMR 릴리스의 Spark 버전과 실제 설정을 다시 확인한다.

1. **어느 프로세스가 부족한지 구분한다.** driver에 결과를 모으는 작업과 executor의 태스크 실행은 다른 메모리를 사용한다. `collect()` 결과가 크다면 driver 메모리를 늘리기 전에 결과 수집 범위와 `spark.driver.maxResultSize`를 확인한다.
2. **힙과 컨테이너 예산을 구분한다.** executor 컨테이너의 예산에는 `spark.executor.memory`, `spark.executor.memoryOverhead`, 활성화한 off-heap 메모리와 별도 설정한 `spark.executor.pyspark.memory`가 포함된다. PySpark 메모리를 별도 설정하지 않았다면 Python 프로세스도 overhead 공간을 함께 쓴다. 힙만 늘려 해결된다고 가정하지 않는다.
3. **태스크 하나의 입력을 줄인다.** shuffle 중 한 태스크의 작업 집합이 너무 크면 파티션을 늘리는 방법을 검토한다. SQL shuffle은 `spark.sql.shuffle.partitions`를 확인한다. 입력 분포와 실제 태스크 크기를 측정해 효과를 판단한다.
4. **동시 실행량과 노드 여유를 확인한다.** executor core 수를 줄이면 동시에 실행하는 태스크 수를 줄일 수 있지만 처리량도 달라진다. 노드 전체가 부족하면 인스턴스 메모리와 YARN 할당량을 함께 검토한다.

변경 뒤에는 같은 입력에서 실패 재현 여부, 최대 메모리, spill과 수행 시간을 비교한다. 종료 코드 해석과 JVM 힙 밖 메모리의 일반 원리는 [[JVM-Container-Memory|JVM 컨테이너 메모리]]와 연결한다.

## 서비스 선택 포인트

- Hadoop/Spark/HBase 프레임워크가 필요하면 EMR을 검토한다.
- 중단을 견디는 처리 용량은 EMR Task 노드의 Spot 활용을 검토한다.
- 서버리스 ETL은 Glue와 EMR Serverless를 작업 특성에 따라 비교한다. 클러스터를 직접 관리하지 않는다는 조건만으로 EMR을 제외하지 않는다.

## 관련 문서

- [[Athena]], [[Redshift]]

## 출처

- [How do I resolve the error Failed to start the job flow due to an internal error in Amazon EMR? — AWS re:Post](https://repost.aws/knowledge-center/emr-failed-job-internal-error)
- [AWS, Set up a VPC to host Amazon EMR clusters](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-vpc-host-job-flows.html)
- [AWS, What is Amazon EMR?](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-what-is-emr.html)
- [AWS, Understanding how to create and work with Amazon EMR clusters](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-overview.html)
- [AWS, What is Amazon EMR Serverless?](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/emr-serverless.html)
- [Apache Spark 3.5.7, Configuration](https://spark.apache.org/docs/3.5.7/configuration.html)
- [Apache Spark 3.5.7, Tuning](https://spark.apache.org/docs/3.5.7/tuning.html)
- [GNU Bash, Exit Status](https://www.gnu.org/s/bash/manual/html_node/Exit-Status.html)
- [How do I resolve Container killed on request. Exit code is 137 in Spark on Amazon EMR? — Amazon Web Services](https://www.youtube.com/watch?v=kgBQ_G6HDTw)
