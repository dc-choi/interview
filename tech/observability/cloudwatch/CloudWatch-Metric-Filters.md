---
tags: [observability, aws, cloudwatch, logs, metrics]
status: done
verified_at: 2026-10-14
category: "Observability"
aliases: ["CloudWatch Metric Filter", "Metric Filter", "지표 필터", "로그 기반 지표"]
---

# CloudWatch Logs 지표 필터

지표 필터(metric filter)는 로그 그룹에 붙여 CloudWatch Logs로 들어오는 로그 이벤트를 CloudWatch 지표로 바꾸는 규칙이다. 패턴에 맞는 이벤트 수를 세거나 이벤트 안의 숫자를 꺼내 게시하고, 그 지표로 대시보드를 그리거나 알람을 건다. 로그 그룹에 붙인 필터는 그 그룹의 모든 로그 스트림에 적용된다.

이미 수집 중인 로그에 규칙만 더하므로 로그를 남기는 코드를 바꾸지 않아도 된다. EMF(Embedded Metric Format)는 로그 자체가 명세에 맞춘 JSON 구조로 지표 정의를 담아야 한다는 점이 다르다([[CloudWatch-Metrics|CloudWatch Metrics]]).

## 쓰는 경우

- ERROR 레벨 로그처럼 특정 단어나 필드 값이 나타난 횟수
- 특정 업무 흐름이나 조건을 지난 횟수. 그 지점에 로그를 남기고 있어야 한다
- 연결과 리소스 초기화에 걸린 시간, 스레드 풀 상태처럼 애플리케이션이 로그로만 남기는 수치
- CloudTrail 이벤트를 CloudWatch Logs로 보낸 뒤 보안 그룹 변경 API 호출과 콘솔 로그인 실패 같은 이벤트 세기([[CloudTrail-Config|CloudTrail]])

서비스가 이미 게시하는 지표와 겹치는지 먼저 확인한다. Lambda 이벤트 함수(Event Functions, 기존 Lambda 함수 유형)의 텍스트 형식 로그에는 호출마다 Duration, Billed Duration, Max Memory Used 등을 담은 `REPORT` 줄이 남는다. 그러나 실행 시간은 `AWS/Lambda` 네임스페이스의 `Duration` 지표로 추가 요금 없이 1분 간격으로 게시되고 백분위 통계도 지원한다. 지표 필터로 만든 지표는 커스텀 지표로 과금되므로 같은 값을 다시 추출할 이유가 적다. `REPORT` 줄을 직접 파싱해야 하면 실제 로그 줄로 패턴을 시험한다. 공식 문서의 예시에는 필드 사이를 탭으로 구분한 줄도 있다.

## 구성 요소

| 요소 | 의미 |
|---|---|
| 필터 패턴 | 각 로그 이벤트에서 찾을 단어, JSON 속성 조건이나 공백 구분 필드 조건 |
| 지표 값 | 일치한 이벤트마다 더할 값. 건수는 `1`, 로그 안의 숫자는 `$size`, `$.latency` 같은 토큰 |
| 기본값 | 로그는 들어왔지만 일치한 이벤트가 없던 1분에 보고할 값 |
| 네임스페이스, 지표 이름 | 게시할 커스텀 지표의 위치와 이름 |
| 단위 | 생략하면 `None`. 나중에 바꾸면 반영되지 않을 수 있어 만들 때 정한다 |
| dimension | JSON과 공백 구분 패턴에서만 쓸 수 있고 필터당 최대 3개 |

CloudWatch는 지표 값을 1분마다 집계해 보고한다. 지표 값 1, 기본값 0인 필터에서 어떤 1분 동안 두 이벤트가 일치하면 그 분의 값은 2이고, 로그는 들어왔지만 일치한 이벤트가 없으면 0이다.

- 기본값이 없으면 일치한 이벤트가 없던 분에는 데이터가 없다. 0이라도 기본값을 두면 그런 분이 0으로 채워져 지표가 띄엄띄엄 끊기지 않는다.
- 기본값을 두어도 그 1분 동안 로그가 하나도 들어오지 않으면 값이 보고되지 않는다.
- dimension을 붙인 지표에는 기본값을 지정할 수 없다.

데이터가 없는 구간은 알람에서 missing data가 되므로 [[CloudWatch-Logs-Alarms#Static Threshold|알람의 missing data 기준]]을 함께 정한다. 로그 그룹의 Metric filters 탭에서 필터를 골라 바로 알람을 만들 수 있다.

## 필터 패턴

필터 패턴 문법은 지표 필터, 구독 필터, 로그 이벤트 검색과 Live Tail이 함께 쓰며 Logs Insights 쿼리 문법과는 다르다. 모든 패턴은 대소문자를 구분한다. 콘솔의 Test pattern에 한 줄에 하나씩 로그 이벤트를 넣어 미리 확인하며, 일치 결과 미리보기는 처음 50줄까지 보여 준다.

### 비정형 텍스트

| 패턴 | 일치하는 이벤트 |
|---|---|
| `ERROR` | ERROR가 들어간 이벤트 |
| `ERROR ARGUMENTS` | 두 단어가 모두 들어간 이벤트 |
| `?ERROR ?WARN` | 둘 중 하나라도 들어간 이벤트 |
| `ERROR -ARGUMENTS` | ERROR는 있고 ARGUMENTS는 없는 이벤트 |
| `"INTERNAL SERVER ERROR"` | 그 구절이 그대로 들어간 이벤트 |
| `" "` | 모든 이벤트 |

`?` 단어를 다른 포함, 제외 단어와 섞으면 `?` 단어는 무시된다. 영숫자가 아닌 문자가 든 단어도 큰따옴표로 감싼다.

### JSON

중괄호 안에서 `$.`로 속성을 고른다.

```
{ $.latency > 50 }
{ ($.eventName = ConsoleLogin) && ($.errorMessage = "Failed authentication") }
{ $.SomeObject IS NULL }
{ $.SomeOtherObject NOT EXISTS }
```

`=`, `!=`, 크기 비교, `&&`, `||`, 괄호, `*` 와일드카드와 `IS NULL`, `IS TRUE`, `IS FALSE`, `NOT EXISTS`를 쓸 수 있다. `IS NOT`과 `EXISTS`는 지원하지 않는다. 고른 속성이 배열이나 객체 자체를 가리키면 일치하지 않으므로 값이 든 노드까지 내려가 고른다.

### 공백 구분

대괄호 안에 필드 이름을 쉼표로 나열한다. 로그에서 대괄호나 큰따옴표로 묶인 부분은 한 필드로 보므로 아래 접근 로그는 7개 필드로 나뉜다.

```
127.0.0.1 Prod frank [10/Oct/2000:13:25:15 -0700] "GET /index.html HTTP/1.0" 404 1534
```

- `[ip, user, username, timestamp, request, status_code = 4*, bytes]`: 7개 필드에 이름을 붙이고 상태 코드가 4로 시작하는 이벤트만 고른다.
- `[..., request =*.html*, status_code = 4*, bytes]`: 앞쪽의 이름 없는 필드를 `...`로 생략한다.
- `[w1=ERROR || w1=WARNING, w2]`: 첫 단어가 ERROR나 WARNING인 이벤트만 고른다. 순서 표시자를 쓸 때는 지정한 단어 뒤에 빈 표시자(`w2`)를 하나 둔다.

필드 조건에는 `=`, `!=`, 크기 비교, `*` 와일드카드, 정규식, `&&`, `||`를 쓴다. 지표 값과 dimension에는 `$bytes`, `$status_code`처럼 필드 이름을 쓴다.

### 정규식

`%AUTHORIZED%`처럼 `%`로 감싸며 단독 패턴이나 JSON, 공백 구분 패턴의 조건으로 쓴다. 이 예는 부분 문자열로 일치하므로 UNAUTHORIZED가 든 이벤트도 고른다. 괄호로 묶는 하위 패턴과 한글 같은 멀티바이트 문자는 지원하지 않고, 쓸 수 있는 기호도 정해져 있다. JSON이나 공백 구분 패턴 하나에는 정규식을 2개까지, 정규식을 담은 지표 필터와 구독 필터 패턴은 로그 그룹당 5개까지 둘 수 있다.

## 만드는 예

```bash
# ERROR가 들어간 이벤트 수. 로그는 들어왔지만 일치가 없던 분은 0
aws logs put-metric-filter \
  --log-group-name MyApp/message.log \
  --filter-name MyAppErrorCount \
  --filter-pattern 'ERROR' \
  --metric-transformations \
      metricName=ErrorCount,metricNamespace=MyNamespace,metricValue=1,defaultValue=0

# 전송 바이트 수를 게시하고 상태 코드를 dimension으로 둔다. 이때 기본값은 둘 수 없다
aws logs put-metric-filter \
  --log-group-name MyApp/access.log \
  --filter-name BytesTransferred \
  --filter-pattern '[ip, id, user, timestamp, request, status_code, size]' \
  --metric-transformations \
      metricName=BytesTransferred,metricNamespace=MyNamespace,metricValue='$size',unit=Bytes,dimensions='{StatusCode=$status_code}'
```

## 통계 선택

- 건수 지표(값 1)는 `Sum`으로 본다. 기간 안에 일치한 이벤트 수가 된다. CloudTrail 보안 알람 예시도 `Sum`, 5분 기간, 임계값 이상 조건을 쓴다.
- 지연 시간처럼 이벤트마다의 크기를 추출한 수치는 `Average`, `Maximum`과 p95, p99 같은 백분위로 본다. 값에 음수가 섞이면 백분위 통계를 쓸 수 없다. 평균과 백분위의 해석은 [[CloudWatch-Metrics#평균과 백분위의 질문을 구분한다|CloudWatch Metrics]]를 따른다.
- 전송 바이트처럼 더해야 의미가 있는 수치는 `Sum`으로 기간 합계를 본다.

## 비용과 운영 함정

- 추출한 지표는 커스텀 지표로 과금되고 dimension 값의 조합마다 별도 지표가 된다. IP 주소나 요청 ID 같은 고카디널리티 필드는 dimension으로 쓰지 않는다. dimension 이름/값 쌍이 일정 시간(PutMetricFilter API 문서 기준 1시간) 안에 1,000개 생기면 필터가 비활성화될 수 있다([[Cardinality|카디널리티]]).
- 필터는 소급하지 않는다. 만든 뒤 들어온 이벤트만 지표가 되므로 그 전 구간은 Logs Insights로 집계한다.
- 데이터포인트가 생기기 전에는 콘솔에서 지표가 보이지 않는다.
- Standard 로그 클래스의 로그 그룹에서만 쓸 수 있다.
- 최소 한 번 전달이라 가끔 중복 값이 들어갈 수 있다. 정산처럼 정확한 개수가 필요한 집계의 정본으로 쓰지 않는다.
- 로그 그룹당 지표 필터는 100개까지다.
- 로그 변환기(transformer)가 있는 로그 그룹에서 `applyOnTransformedLogs`를 true로 지정하면 원래 수집된 이벤트 대신 변환된 이벤트에 패턴을 적용한다.
- 로그 메시지나 필드 이름이 바뀌면 패턴이 일치하지 않게 되어 지표가 0이나 빈 구간으로 보일 수 있다. 로그 형식을 바꾸는 배포에서는 지표 필터도 함께 확인한다.

## 다른 방법과 비교

| 방법 | 집계 시점과 방식 | 맞는 경우 |
|---|---|---|
| 지표 필터 | 수집 시점에 로그 그룹의 패턴으로 지표 생성 | 이미 남기는 로그, 코드를 바꾸기 어려운 로그, CloudTrail 같은 서비스 로그 |
| EMF | 수집 시점에 로그 안의 지표 정의로 지표 생성 | 애플리케이션에서 지표 이름과 dimension을 직접 설계할 때 |
| Logs Insights | 쿼리 시점에 저장된 로그를 스캔해 집계 | 필터를 만들기 전 구간, 일회성 조사 |

## 점검 질문

- 이 값을 서비스 기본 지표나 EMF로 이미 얻고 있지 않은가
- 일치가 없던 분과 로그가 아예 없던 분을 알람이 어떻게 해석하는가
- dimension 값의 종류가 몇 개까지 늘어날 수 있는가
- 필터를 만들기 전 구간이나 로그 형식이 바뀐 뒤의 구간을 같은 지표로 비교하려 하지 않는가
- 중복 전달로 생긴 오차를 허용할 수 있는 집계인가

## 출처

- [Amazon CloudWatch Logs, Creating metrics from log events using filters](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html)
- [Amazon CloudWatch Logs, Filter pattern syntax for metric filters, subscription filters, filter log events, and Live Tail](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html)
- [Amazon CloudWatch Logs, Filter pattern syntax for metric filters](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntaxForMetricFilters.html)
- [Amazon CloudWatch Logs, Create a metric filter for a log group](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CreateMetricFilterProcedure.html)
- [Amazon CloudWatch Logs, Example: Count occurrences of a term](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CountOccurrencesExample.html)
- [Amazon CloudWatch Logs, Example: Extract fields from an Apache log and assign dimensions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/ExtractBytesExample.html)
- [Amazon CloudWatch Logs API Reference, PutMetricFilter](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutMetricFilter.html)
- [Amazon CloudWatch Logs API Reference, MetricTransformation](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_MetricTransformation.html)
- [Amazon CloudWatch, CloudWatch statistics definitions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Statistics-definitions.html)
- [Amazon CloudWatch, Embedding metrics within logs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html)
- [AWS CloudTrail, Creating CloudWatch alarms for CloudTrail events: examples](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudwatch-alarms-for-cloudtrail.html)
- [AWS Lambda, AWS Lambda Event Functions (formerly Lambda functions)](https://docs.aws.amazon.com/lambda/latest/dg/lambda-functions-chapter.html)
- [AWS Lambda, Using CloudWatch metrics with Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html)
- [AWS Lambda, Types of metrics for Lambda Event Functions](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html)
- [AWS Lambda, Viewing metrics for Lambda Event Functions](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html)
- [AWS Lambda, Log and monitor Python Lambda Event Functions](https://docs.aws.amazon.com/lambda/latest/dg/python-logging.html)
- [다양한 로그 데이터를 통해 Amazon CloudWatch Metric 만들기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=f2b3QdNEOwI)

## 관련 문서

- [[CloudWatch|CloudWatch 인덱스]]
- [[CloudWatch-Logs-Alarms|CloudWatch Logs와 Alarms]]
- [[CloudWatch-Metrics|CloudWatch Metrics와 EMF]]
- [[CloudWatch-Operations|CloudWatch 운영과 비용 함정]]
- [[Logs-vs-Metrics|로그 vs 메트릭]]
- [[Structured-Logging|구조화 로깅]]
- [[Cardinality|카디널리티 관리]]
- [[CloudTrail-Config|CloudTrail과 Config]]
- [[AWS-Lambda|Lambda]]
