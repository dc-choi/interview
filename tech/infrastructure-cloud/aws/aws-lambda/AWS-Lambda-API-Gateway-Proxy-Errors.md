---
tags: [aws, lambda, api-gateway, troubleshooting, serverless, http]
status: done
verified_at: 2026-10-14
category: "Infrastructure - AWS"
aliases: ["API Gateway Lambda 프록시 502", "Lambda 프록시 응답 형식", "API Gateway 500 502 Lambda"]
---

# API Gateway Lambda 프록시 통합 오류 — 응답 형식 계약과 500, 502 구분

> 상위 문서: [[AWS-Lambda|AWS Lambda]]

REST API의 Lambda 프록시 통합은 클라이언트 요청 전체를 이벤트로 함수에 넘기고, 함수의 반환값으로 HTTP 응답을 만든다. 게이트웨이가 중간에서 응답을 변환하지 않으므로 함수가 정해진 응답 형식을 지키지 않으면 API Gateway가 오류를 돌려준다. 이 문서는 2026-10-14 API Gateway와 Lambda 개발자 가이드 기준이다.

## 응답 형식 계약

프록시 통합의 함수는 다음 형식의 JSON을 반환해야 한다. 형식이 다르면 API Gateway는 502 Bad Gateway를 돌려준다.

```json
{
  "isBase64Encoded": false,
  "statusCode": 200,
  "headers": { "Content-Type": "application/json" },
  "multiValueHeaders": { "X-Custom-Header": ["value1", "value2"] },
  "body": "{\"ok\": true}"
}
```

- `body`는 문자열이다. JSON 객체를 돌려줄 때는 `JSON.stringify`(Python은 `json.dumps`)로 직렬화해 넣는다.
- `headers`는 값이 하나인 헤더만 담고, `multiValueHeaders`는 값이 여러 개인 헤더와 하나인 헤더를 모두 담는다. 둘을 함께 쓰면 하나의 목록으로 합쳐지고, 같은 키-값 쌍은 `multiValueHeaders`의 값만 남는다. 추가 응답 헤더가 없으면 둘 다 생략할 수 있다.
- 바이너리 본문은 Base64 문자열로 넣고 `isBase64Encoded`를 `true`로 두며, API의 Binary Media Types에 `*/*`를 설정한다. 바이너리가 아니면 `false`로 두거나 생략한다.
- 프록시 통합에서 CORS를 허용하려면 함수가 응답 `headers`에 `Access-Control-Allow-Origin`을 직접 넣는다.
- 필수 파라미터 누락 같은 클라이언트 오류는 예외를 던지지 말고 `{"statusCode": 400, "body": "..."}`처럼 형식에 맞춰 반환한다. 오류 응답을 원하는 상태 코드와 본문으로 바꾸려면 코드에서 예외를 잡아 이 형식으로 변환한다.
- 이 형식은 REST API 기준이다. HTTP API는 간소화된 이벤트 형식(version 2.0)을 지원하므로 HTTP API의 Lambda 통합 문서를 따로 확인한다.

## 500과 502를 먼저 가른다

API Gateway는 Lambda 호출 오류와 함수 오류를 모두 내부 오류로 다룬다. 두 경우 모두 클라이언트가 받는 본문은 `{"message": "Internal server error"}`로 같으므로 본문이 아니라 상태 코드와 로그로 구분한다.

| 상태 코드 | 의미 | 먼저 볼 곳 |
|---|---|---|
| 500 | Lambda API가 호출 요청을 거부함(호출 권한 오류, 동시성 한도 초과 등) | 호출 권한 설정, Lambda `Throttles` 지표 |
| 502 | 함수가 실행됐지만 오류를 반환했거나 형식이 다른 응답을 반환함 | 콘솔 method 테스트 결과(응답과 로그), 함수의 CloudWatch Logs |

- API Gateway는 Lambda 호출을 재시도하지 않는다. Lambda가 오류를 돌려주면 그대로 클라이언트 오류 응답이 된다.
- 통합에 IAM 역할(`credentials`)을 지정하지 않으면 API Gateway의 함수 호출 권한은 함수의 리소스 기반 정책에서 온다. `apigateway.amazonaws.com`에 `lambda:InvokeFunction`을 허용하고, source ARN으로 API 전체나 특정 stage, resource, method만 허용할 수 있다. 콘솔이나 AWS SAM으로 API를 연결하면 정책이 자동으로 갱신되지만, 좁힌 source ARN에 포함되지 않는 stage나 method에서 호출하면 허용되지 않는다. 함수와 API의 리전이 다르면 source ARN의 리전은 API가 아니라 함수의 리전과 맞춘다. 통합에 `credentials` 역할을 지정했다면 그 역할의 정책이 `lambda:InvokeFunction`을 허용하고 신뢰 정책이 API Gateway를 신뢰 주체로 두어야 한다.
- 클라이언트의 API 접근, API Gateway의 함수 호출, 함수의 AWS 자원 접근은 서로 다른 권한이다. 경계별 설정은 [[AWS-Lambda-Operations-Exam#웹 API의 세 가지 권한 경계|웹 API의 세 가지 권한 경계]]에서 나눠 본다.

## 진단 순서

1. stage 대시보드나 CloudWatch `5XXError` 지표로 오류가 늘어난 시점과 stage를 확인한다. method와 resource 단위로 보려면 stage의 상세 지표(detailed metrics)를 켜야 하며 추가 요금이 든다.
2. 콘솔에서 해당 method를 테스트한다. 결과에 상태 코드, 응답 본문과 헤더, 지연 시간, 그리고 같은 호출이 외부에서 들어왔다면 남았을 실행 로그(시뮬레이션)가 나온다. 로그는 시뮬레이션이지만 호출 결과는 실제이므로 데이터를 바꾸는 method는 되돌릴 수 없는 변경을 만든다.
3. stage의 실행 로그를 켠다. `loggingLevel`을 `ERROR`나 `INFO`로 두면 API Gateway가 `API-Gateway-Execution-Logs_{rest-api-id}/{stage_name}` 로그 그룹을 만들어 관리하므로 API ID로 찾는다. CloudWatch Logs delivery를 설정한 stage는 이 그룹 대신 지정한 대상(로그 그룹, S3, Firehose)으로 실행 로그를 보낸다. 계정의 `cloudWatchRoleArn`을 리전마다 설정해야 하고, 표준 실행 로그의 이벤트는 1KB에서 잘린다. 요청과 응답 전체를 남기는 Data tracing은 민감 정보가 기록될 수 있어 운영 API에는 쓰지 않는다.
4. 502면 함수의 반환값이 위 형식인지, 처리되지 않은 예외나 timeout이 함수 로그에 있는지 확인한다.
5. 함수 설정의 handler가 코드의 파일이나 함수 이름과 같은지 확인한다. 다르면 `Cannot find module 'function'`이나 `Handler 'handler' missing on module 'function'` 같은 오류로 호출이 실패한다.
6. 500이면 Lambda가 호출을 거부한 이유를 가른다. 권한 문제면 리소스 기반 정책이 이 API, stage, method에서의 호출을 허용하는지(`credentials` 역할을 쓰면 그 역할의 권한과 신뢰 정책) 확인한다. 동시성이 부족하면 Lambda가 `TooManyRequestsException`으로 호출을 거부하고 `Throttles` 지표가 오르므로 계정 동시성 한도와 함수의 reserved concurrency를 확인한다.

## ALB 대상과의 차이

ALB가 Lambda를 대상으로 호출할 때는 함수 응답 형식 오류가 access log에 상태 코드 502와 `error_reason`의 `LambdaInvalidResponse`로 남고, `LambdaUserError` 지표에 더해진다. ALB 쪽 진단은 [[ELB-5XX-Troubleshooting|ALB 5XX 진단]].

## 출처

- [Amazon API Gateway Developer Guide, Lambda proxy integrations in API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html)
- [AWS Lambda Developer Guide, Handling Lambda errors with an API Gateway API](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway-errors.html)
- [AWS Lambda Developer Guide, Invoking a Lambda function using an Amazon API Gateway endpoint](https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html)
- [Amazon API Gateway Developer Guide, Basic tasks of an API integration request](https://docs.aws.amazon.com/apigateway/latest/developerguide/integration-request-basic-setup.html)
- [AWS Lambda API Reference, Invoke](https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html)
- [AWS Lambda Developer Guide, Types of metrics for Lambda Event Functions](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html)
- [Amazon API Gateway Developer Guide, Execution logging for REST APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-execution-logging.html)
- [Amazon API Gateway Developer Guide, Use the API Gateway console to test a REST API method](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-test-method.html)
- [Amazon API Gateway Developer Guide, Amazon API Gateway dimensions and metrics](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html)
- [AWS Lambda Developer Guide, Troubleshoot deployment issues in Lambda](https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-deployment.html)
- [Elastic Load Balancing, Access logs for your Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html)
- [How do I resolve HTTP 502 errors from API Gateway REST APIs with Lambda proxy integration? — YouTube, Amazon Web Services](https://www.youtube.com/watch?v=KL1F2IE4rBs) — 영상은 함수 권한 오류도 502로 설명하지만 Lambda 개발자 가이드는 Lambda API가 호출을 거부한 경우를 500으로 구분하므로 본문은 공식 문서를 따랐다

## 관련 문서

- [[AWS-Lambda|AWS Lambda]]
- [[API-Gateway|API Gateway]]
- [[AWS-Lambda-Operations-Exam|Lambda 실무 (웹 API의 세 가지 권한 경계)]]
- [[ELB-5XX-Troubleshooting|ALB 5XX 진단]]
- [[HTTP-Status-Code|HTTP 상태 코드]]
