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
| **Glue** | 서버리스 ETL — Spark 배치와 스트리밍 작업, 클러스터 직접 관리 불필요 |
| **Athena** | S3 데이터의 서버리스 SQL 조회가 대표 용도 |
| **Redshift** | OLAP 데이터 웨어하우스 — 정형 분석 중심 |

### 실행 엔진 선택과 카탈로그 공유를 나눈다

부분 검증(2026-10-16): 이 비교와 카탈로그 연결 조건만 AWS 공식 문서로 대조했다. 다른 절의 검증일과 frontmatter 날짜는 유지한다.

- **스트리밍 여부만으로 EMR을 고르지 않는다.** Glue도 Kinesis Data Streams, Kafka와 MSK를 입력으로 하는 스트리밍 ETL을 지원한다. 처리 위치는 job bookmark가 아닌 checkpoint로 추적한다. 필요한 변환과 지연 요구를 지원 범위에 대조하는 것은 서비스 선택 시의 점검안이다.
- **EMR을 선택해도 Glue Data Catalog를 함께 쓸 수 있다.** EMR 5.8.0 이상에서 Spark의 Hive metastore로 구성해 클러스터 간 메타데이터를 공유할 수 있다. EMR on EC2의 instance profile에는 필요한 Glue 권한을 부여하고, 카탈로그 암호화 구성에 따른 KMS 권한도 확인한다.
- **카탈로그의 존속과 데이터의 존속은 다르다.** Hive 테이블 생성 시 `LOCATION`을 생략하면 기본 warehouse 위치인 HDFS에 데이터가 놓일 수 있다. 이 데이터는 클러스터 종료 시 사라진다. 공유하거나 보존할 테이블은 S3 `LOCATION` 또는 S3를 가리키는 `hive.metastore.warehouse.dir`을 명시하고 실제 저장 위치를 확인한다.

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

### 조인과 executor 설정을 함께 확인한다

부분 검증(2026-10-16): Spark 3.5.7 SQL 튜닝과 EMR Spark 설정 문서 기준이다. 과거 릴리스의 설정 예시를 현재 클러스터의 최적값으로 복사하지 않는다.

- `spark.sql.autoBroadcastJoinThreshold`는 자동 broadcast할 테이블의 **최대 크기**이며 Spark 3.5.7 기본값은 10,485,760바이트다. 큰 테이블을 이 값 이상이면 broadcast한다는 의미가 아니다. `BROADCAST` hint는 통계상 크기가 임계값을 넘어도 우선 고려되지만, 모든 조인 유형에서 적용을 보장하지 않는다.
- AQE는 실행 중 통계로 shuffle 파티션 병합, 조인 전략 변경과 skew 최적화를 수행한다. `spark.sql.adaptive.enabled`와 관련 하위 설정, 실제 실행 계획을 함께 확인한다. 노드를 늘렸다는 사실만으로 데이터 편향이 해결됐다고 판단하지 않는다.
- EMR의 `maximizeResourceAllocation`은 하드웨어를 기준으로 executor 설정을 계산한다. 크기가 다른 타입을 섞은 instance fleet에는 계산된 설정이 최적이 아닐 수 있어 별도 조정이 필요하다. HBase 같은 다른 분산 애플리케이션을 함께 실행하면 YARN 설정 충돌로 Spark 작업이 실패할 수 있어 AWS는 이 옵션을 사용하지 말라고 안내한다.

운영 점검 제안: EMR 기본 설정에서 기준값을 측정한 뒤 같은 입력과 결과 정확성을 유지하며 shuffle, spill, 태스크별 시간과 전체 비용을 비교한다. 실제 작업을 실행한 기록은 아니며 문서의 다른 절 검증일은 유지한다.

## Spark 클래스 누락과 의존성 배포

2026-10-13 Spark 3.5.7 공식 문서로 이 절을 대조했다. `java.lang.ClassNotFoundException`이 발생하면 먼저 누락된 클래스 이름과 실패한 프로세스(driver 또는 executor)를 확인하고, 해당 클래스를 포함한 JAR의 배포와 classpath를 점검한다. 적용할 EMR 릴리스의 Spark 버전도 함께 확인한다.

- `spark-submit --jars`의 쉼표로 구분한 JAR 목록은 클러스터에 전달되고 driver와 executor classpath에 포함된다. 이 옵션은 디렉터리 확장을 지원하지 않는다.
- `local:/` URI는 각 worker에 이미 존재하는 파일을 가리킨다. 경로를 적었다는 사실만으로 파일이 배포됐다고 판단하지 않는다.
- `spark.driver.extraClassPath`는 driver의 classpath 앞에 경로를 추가한다. client mode에서는 JVM이 이미 시작된 뒤 애플리케이션의 `SparkConf`로 바꾸지 말고 `--driver-class-path` 또는 기본 properties 파일에서 설정한다. executor용 설정과 driver용 설정을 혼동하지 않는다.
- assembly JAR를 만들 때 클러스터가 제공하는 Spark와 Hadoop은 `provided` 의존성으로 둔다. 기본 런타임 JAR까지 중복으로 묶어 누락 문제를 해결하려 하지 않는다. 적용 설정의 출처가 불분명하면 `spark-submit --verbose`로 확인한다.

검증 제안: 같은 입력으로 driver 시작과 executor 태스크 실행을 모두 확인한다. 기본 classpath를 통째로 바꾸기보다 누락된 사용자 의존성을 좁혀 추가한다. 특정 콘솔 화면의 입력 제한을 모든 EMR 6.x 이후 릴리스의 설정 불가로 일반화하지 않는다.

## 서비스 선택 포인트

- Hadoop/Spark/HBase 프레임워크가 필요하면 EMR을 검토한다.
- 중단을 견디는 처리 용량은 EMR Task 노드의 Spot 활용을 검토한다.
- 서버리스 ETL은 Glue와 EMR Serverless를 작업 특성에 따라 비교한다. 클러스터를 직접 관리하지 않는다는 조건만으로 EMR을 제외하지 않는다.

### Graviton 전환과 Spot 후보 확장

부분 검증(2026-10-15): EMR on EC2의 지원 인스턴스 표와 instance flexibility 지침을 대조했다. 특정 과거 사례의 절감률이나 최소 버전을 모든 리전과 인스턴스에 적용하지 않으며, 기존 절 전체의 검증일은 유지한다.

1. **지원 범위:** 대상 리전과 인스턴스 타입별 최소 EMR 릴리스를 확인한다. 지원되는 타입이어도 선택한 AZ의 용량에 따라 생성이 지연되거나 실패할 수 있다.
2. **실행 자원:** EC2 사양만 비교하지 말고 YARN 할당량과 Spark executor가 들어갈 수 있는 최소 CPU, 메모리를 확인한다. EMR 콘솔의 인스턴스 선택에 표시되는 vCPU 값은 EC2 vCPU 수가 아니라 YARN vcore 수다.
3. **후보 구성:** 작업의 최소 executor 크기를 수용하는 타입으로 후보를 넓힌다. 크기, 세대와 Graviton 후보의 다양화는 사용 가능한 용량 풀을 늘릴 수 있지만, CPU와 메모리 비율이 달라지면 자원을 덜 활용할 수 있다.
4. **AZ 의미:** instance fleet 생성 시 여러 AZ의 subnet을 후보로 줄 수 있다. EMR이 그중 배치할 곳을 고르는 것이며 하나의 클러스터가 여러 AZ에 분산되는 것은 아니다.

검증 제안: 같은 입력과 결과 정확성을 기준으로 작업 시간, executor 배치, spill, 재시도와 전체 작업 비용을 비교한다. Spot 할인율 하나나 인스턴스 단가만으로 전환 효과를 확정하지 않는다. 실제 클러스터에서 측정한 성능 결과는 아니다.

## EMR Serverless의 실행과 용량 경계

부분 검증(2026-10-13): EMR Serverless의 application 설정, 자동 시작과 중지, 사전 초기화 용량을 공식 문서로 대조했다. 앞선 EMR on EC2의 노드 유형이나 YARN 운영 절차와 구분한다.

Application은 Spark 또는 Hive 작업을 실행할 환경과 용량 설정을 관리한다. 생성됐다는 사실과 실행 자원이 준비됐다는 사실은 다르다. `CREATED`는 생성 후 아직 용량을 provision하지 않은 상태이고, `STARTED`는 작업을 받을 준비가 된 상태다. 작업 제출 시 자동 시작은 기본 활성화되지만 끌 수 있다.

| 설정 | 의미와 운영상 확인할 점 |
|---|---|
| `initialCapacity` | 미리 준비할 worker 수와 자원을 정한다. 빠른 시작에 유리하지만 application이 유휴 상태여도 준비된 worker에는 비용이 발생한다. |
| 최대 용량 | application이 확장할 CPU, 메모리와 디스크 상한이다. worker 크기와 개수에 맞춰 구성한다. 사전 초기화 용량과 같은 개념이 아니다. |
| 자동 중지 | 기본 유휴 시간은 15분이다. 중지되면 사전 초기화 용량도 해제된다. 대기 시간을 바꾸거나 자동 중지를 끌 수 있으므로 실제 설정을 확인한다. |
| Spark worker 크기 | driver/executor 메모리에 overhead까지 더해 worker 메모리에 맞춘다. 사전 초기화 worker가 필요 이상으로 크면 작업에 쓰지 않는 용량이 생긴다. |

사전 초기화 자원을 다른 작업이 쓰고 있거나 작업 요구량이 더 크면 application은 설정한 최대 용량까지 추가 worker를 요청한다. 작업 종료 후 추가 자원은 해제하지만 application이 시작 상태인 동안 사전 초기화 용량은 유지한다.

운영 비교에서는 작업 실행 시간뿐 아니라 제출 후 시작 대기, 유휴 시간과 전체 비용을 함께 측정한다. 시작 지연을 줄일 필요가 있는 작업에 사전 초기화를 적용할지 판단한다. 서버리스라는 이유만으로 모든 작업이 즉시 시작하거나 유휴 비용이 없다고 가정하지 않는다. 이는 설정을 비교하는 점검안이며 특정 환경에서 측정한 성능 결과는 아니다.

## EMR on EKS의 실행 환경과 격리 경계

부분 검증(2026-10-13): 이 절은 EMR on EKS와 Kubernetes 공식 문서로 대조했다. 앞선 EMR on EC2의 노드 구성과 YARN 진단을 그대로 적용하지 않는다.

EMR on EKS는 기존 EKS 클러스터에서 분석 워크로드를 컨테이너로 실행하는 배포 방식이다. 서로 다른 프레임워크 버전의 작업과 다른 컨테이너 애플리케이션이 공통 자원을 사용할 수 있다. 기존 EKS 운영 기반이 있는 팀에서 검토할 선택지이며, 컨테이너화만으로 비용 절감이나 성능 향상을 보장하지 않는다.

| 구성 | 역할 | 혼동하면 안 되는 경계 |
|---|---|---|
| Virtual cluster | EMR에 등록한 EKS의 Kubernetes namespace 하나를 가리킨다 | 별도 물리 compute나 storage를 관리하지 않는다. 등록 자체에 추가 자원이 들지 않는다는 뜻이지 EKS와 작업 실행 비용이 없다는 뜻이 아니다 |
| Custom image | 작업별 의존성과 실행 환경을 패키징하고 기존 빌드, 테스트, 이미지 검사 절차에 연결한다 | 이미지가 같아도 외부 데이터 권한과 클러스터 설정까지 같아지는 것은 아니다 |
| Job template | `StartJobRun`에서 반복하는 driver/executor 용량, 실행 역할과 이미지 설정 등을 재사용한다 | 템플릿 사용을 강제하려면 IAM 조건이 필요하며 템플릿 등록만으로 권한이 제한되지 않는다 |

실행 역할 ARN을 템플릿 파라미터로 받으면 호출자가 다른 역할 값을 줄 수 있다. 승인한 템플릿을 쓰는 조건과 허용된 실행 역할을 쓰는 조건을 함께 확인한다.

### 공용 클러스터에서 따로 확인할 것

- **접근:** namespace별 RBAC와 데이터 접근용 IAM 역할의 범위를 나눈다.
- **자원:** namespace quota와 컨테이너 requests/limits를 설정한다. quota만으로 네트워크 같은 모든 공유 자원의 경합을 막을 수는 없다.
- **통신:** namespace 생성만으로 Pod 간 통신이 차단되지 않는다. NetworkPolicy와 이를 구현하는 네트워크 플러그인의 지원을 확인한다.
- **검증:** 같은 입력으로 작업 대기 시간, 실행 시간, 실패율과 전체 실행 비용을 비교한다. 이는 도입 시 사용할 점검안이며 특정 환경에서 측정한 결과가 아니다.

## EMR on EC2 서비스 상태와 지표 누락

부분 검증(2026-10-13): AWS Knowledge Center의 서비스 감시 스크립트와 CloudWatch 누락 데이터 규칙을 대조했다. 이 절의 application은 노드에 설치한 HiveServer2와 YARN 서비스이며, EMR Serverless application 상태와 다르다. 기존 절 전체를 다시 검증한 것은 아니므로 frontmatter 날짜는 유지한다.

- 예제의 선행 조건은 EMR 5.30.0 이상과 `cloudwatch:PutMetricData` 권한이다. 실제 배포에서는 노드 역할, 설치된 서비스와 S3 스크립트 접근 권한도 확인한다.
- bootstrap action으로 감시 스크립트를 노드에 배포하고 주기적으로 실행한다. primary의 ResourceManager/HiveServer2와 core/task의 NodeManager처럼 노드별 감시 대상을 나눈다.
- 공식 예제는 `disabled` 서비스를 건너뛰고, 검사한 서비스가 `active`가 아닐 때만 `EMR/ServiceStatus`의 `ServiceStatus=1`을 전송한다. 정상 상태의 `0`을 매번 전송하는 heartbeat가 아니다.
- `ClusterId`, `InstanceId`, `NodeServiceName`, `NodeType` dimension과 전송 리전을 맞춘다. 값 `1`을 정상 가동으로 읽거나 다른 노드의 시계열을 섞지 않는다.

오류 때만 보내는 지표에는 누락을 `notBreaching`으로 다루는 선택지가 있다. 다만 무데이터는 정상 상태뿐 아니라 감시 프로세스 중단이나 전송 실패에서도 생길 수 있다. `notBreaching` 설정만으로 서비스 복구나 감시 경로의 정상 동작을 증명할 수 없다.

운영 검증 제안: 서비스 중단, 복구와 감시 스크립트 자체 중단을 따로 재현하고 알람 상태를 확인한다. 정상값도 주기적으로 보내도록 바꾼다면 누락 데이터 정책도 그 계약에 맞춰 다시 정한다. 서비스 오류 지표와 감시 경로의 생존 확인을 분리한다.

## 관련 문서

- [[Athena]], [[Redshift]]
- [[EKS|Amazon EKS]]

## 출처

- [AWS, Streaming ETL jobs in AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/add-job-streaming.html)
- [AWS, Use AWS Glue Data Catalog with Spark on Amazon EMR](https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-glue.html)
- [Apache Spark 3.5.7, Performance Tuning](https://spark.apache.org/docs/3.5.7/sql-performance-tuning.html)
- [AWS, Configure Spark](https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-configure.html)
- [AWS, Supported instance types with Amazon EMR](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-supported-instance-types.html)
- [AWS, Availability Zone flexibility for an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-flexibility.html)
- [How do I publish and monitor an Amazon EMR application status with CloudWatch integration? — AWS re:Post](https://repost.aws/knowledge-center/emr-publish-monitor-service-status)
- [AWS, Configuring how CloudWatch alarms treat missing data](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html)
- [AWS, Interact with and configure an EMR Serverless application](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/applications.html)
- [AWS, Understanding application behavior in EMR Serverless](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/app-behavior.html)
- [AWS, Pre-initialized capacity for working with an application in EMR Serverless](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/pre-init-capacity.html)
- [Apache Spark 3.5.7, Submitting Applications](https://spark.apache.org/docs/3.5.7/submitting-applications.html)
- [AWS, What is Amazon EMR on EKS?](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/emr-eks.html)
- [AWS, Managing virtual clusters](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/virtual-cluster.html)
- [AWS, Customizing Docker images for Amazon EMR on EKS](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/docker-custom-images.html)
- [AWS, Using job templates](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/job-templates.html)
- [AWS, Controlling access to job templates](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/iam-job-template.html)
- [Kubernetes, Multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)
- [데이터 처리도 이제는 컨테이너로, 우아한형제들의 데이터플랫폼 혁신 — Amazon Web Services Korea](https://www.youtube.com/watch?v=T2mtIkQ1vbA)
- [How do I resolve the error Failed to start the job flow due to an internal error in Amazon EMR? — AWS re:Post](https://repost.aws/knowledge-center/emr-failed-job-internal-error)
- [AWS, Set up a VPC to host Amazon EMR clusters](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-vpc-host-job-flows.html)
- [AWS, What is Amazon EMR?](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-what-is-emr.html)
- [AWS, Understanding how to create and work with Amazon EMR clusters](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-overview.html)
- [AWS, What is Amazon EMR Serverless?](https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/emr-serverless.html)
- [Apache Spark 3.5.7, Configuration](https://spark.apache.org/docs/3.5.7/configuration.html)
- [Apache Spark 3.5.7, Tuning](https://spark.apache.org/docs/3.5.7/tuning.html)
- [GNU Bash, Exit Status](https://www.gnu.org/s/bash/manual/html_node/Exit-Status.html)
- [How do I resolve Container killed on request. Exit code is 137 in Spark on Amazon EMR? — Amazon Web Services](https://www.youtube.com/watch?v=kgBQ_G6HDTw)
