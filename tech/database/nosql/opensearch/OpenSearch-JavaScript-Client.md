---
tags: [database, search, opensearch, javascript, nodejs, client]
status: done
verified_at: 2026-07-27
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch JavaScript Client", "opensearch-js", "OpenSearch JS 클라이언트"]
---

# OpenSearch JavaScript 클라이언트

`@opensearch-project/opensearch`는 OpenSearch의 공식 JavaScript/TypeScript 클라이언트다. HTTP transport 위에 `client.search`, `client.index`, `client.indices.create` 같은 메서드를 노출하고, 결과는 `response.body`로 돌려준다. 검색 API 계층이 OpenSearch를 호출할 때 실제로 잡는 라이브러리이며, 계약과 폴백 설계는 [[OpenSearch-Search-API-Layer|검색 API 서비스 계층]]이 정본이다.

## 연결 구성

Client 생성자에 `node` endpoint와 인증을 준다. Security plugin이 켜진 cluster는 HTTPS와 자격 증명이 필요하고, self-signed 인증서 환경은 `ssl` 옵션으로 CA를 지정한다.

```javascript
const { Client } = require("@opensearch-project/opensearch");
const fs = require("fs");

const client = new Client({
  node: "https://admin:<password>@localhost:9200",
  ssl: {
    ca: fs.readFileSync("/path/to/root-ca.pem"),
  },
});
```

- URL에 자격 증명을 넣는 방식은 로그와 설정 파일에 비밀이 새기 쉬우므로 운영에서는 환경 변수나 secret 관리로 조립한다.
- `ssl.rejectUnauthorized: false`는 인증서 검증을 끄는 것이므로 로컬 개발 밖에서 쓰지 않는다. mTLS가 필요하면 `ssl.cert`와 `ssl.key`를 함께 지정한다.
- Client 인스턴스는 connection pool을 유지하므로 요청마다 만들지 말고 프로세스에서 싱글턴으로 재사용한다.

## AWS SigV4 서명

Amazon OpenSearch Service domain이나 Serverless collection에 IAM으로 붙을 때는 `AwsSigv4Signer`로 요청을 서명한다.

```javascript
const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { Client } = require("@opensearch-project/opensearch");
const { AwsSigv4Signer } = require("@opensearch-project/opensearch/aws");

const client = new Client({
  ...AwsSigv4Signer({
    region: "us-east-1",
    service: "es", // Serverless collection은 "aoss"
    getCredentials: () => {
      const credentialsProvider = defaultProvider();
      return credentialsProvider();
    },
  }),
  node: "https://search-xxx.region.es.amazonaws.com",
});
```

- `service`는 Provisioned domain이 `es`, Serverless collection이 `aoss`다. Serverless 쪽 규칙은 [[OpenSearch-Service-Security-Observability#보안 경계|Service 보안 경계]]에서도 다룬다.
- 자격 증명은 AWS SDK credential provider에서 가져온다. SDK v3는 `defaultProvider`, v2는 `AWS.config.getCredentials`를 Promise로 감싼다.
- Lambda에서는 handler 밖에서 client를 초기화해 invocation 간 연결을 재사용한다. Handler 안에서 만들면 호출마다 연결을 새로 맺어 file descriptor 고갈(`ConnectionError: getaddrinfo EMFILE`)로 이어질 수 있다. 연결 재사용의 운영 주의점은 [[AWS-Lambda-Operations-Exam|Lambda 운영]]이 정본이다.

## 기본 호출 흐름

문서 CRUD와 index 관리 메서드는 대응하는 REST API를 감싼다.

```javascript
await client.indices.create({
  index: "contents",
  body: { settings: { index: { number_of_shards: 1, number_of_replicas: 2 } } },
});

await client.index({
  index: "contents",
  id: "1",
  body: { title: "여름 신작 특집", status: "published" },
});

const result = await client.search({
  index: "contents",
  body: { query: { match: { title: { query: "신작" } } } },
});
// result.body.hits에 검색 결과

await client.update({
  index: "contents",
  id: "1",
  body: { doc: { status: "archived" } },
});

await client.delete({ index: "contents", id: "1" });
await client.indices.delete({ index: "contents" });
```

- 색인 직후 read-after-write 가시성이 필요하면 반복적인 `refresh: true`보다 `refresh: "wait_for"`를 우선 검토한다. 근거와 가시성 규칙은 [[OpenSearch-Indexing-Internals#Refresh|Refresh]]가 정본이다.
- `update`는 `body.doc`에 바꿀 field만 담는 partial update다.
- 응답 판단은 HTTP 성공만 보지 말고 `body._shards.failed` 같은 부분 실패 신호를 함께 본다. 기준은 [[OpenSearch-Search-Features#검색 실행 제어|검색 실행 제어]]를 따른다.

## Memory circuit breaker

`memoryCircuitBreaker`는 응답 payload가 client 프로세스의 heap을 넘치게 하는 것을 막는 클라이언트 옵션이다. 기본은 비활성이다.

```javascript
const client = new Client({
  memoryCircuitBreaker: { enabled: true, maxPercentage: 0.8 },
});
```

- `maxPercentage`는 0과 1 사이의 heap 사용 임계 비율이고, 범위를 벗어난 값은 1.0으로 보정된다. `80` 같은 퍼센트 표기를 쓰면 임계가 heap 한도의 100%로 올라가 보호가 무력해지므로 소수로 지정한다.
- 이 옵션은 client heap만 지킨다. OpenSearch 엔진에는 parent, fielddata, request 같은 별도의 circuit breaker가 있고([[OpenSearch-Performance-Troubleshooting|성능 진단]] 참조), 연속 실패 시 호출을 차단하는 검색 API 계층의 circuit breaker는 [[OpenSearch-Search-API-Layer|검색 API 서비스 계층]]에서 다룬다.

## 운영 체크포인트

- Client는 싱글턴으로 재사용하고 있는가. 요청마다 생성하면 connection과 handshake 비용이 반복된다.
- Serverless collection은 indexing, search, metadata operation의 subset만 지원하므로 사용하는 메서드가 동작하는지 검증했는가.
- 대량 색인 경로에 `refresh: true`가 남아 있지 않은가.
- 큰 응답(광범위한 aggregation, 큰 `size`)에 대해 memory circuit breaker나 응답 크기 제한을 뒀는가.
- Client version이 cluster의 engine version과 호환되는지 [[OpenSearch-Service-Engine-Upgrade|engine upgrade]] 계획에 포함했는가.

## 관련 문서

- [[OpenSearch-Search-API-Layer|검색 API 서비스 계층]]
- [[OpenSearch-Service|Amazon OpenSearch Service]]
- [[OpenSearch-Indexing-Internals|색인 내부 동작과 가시성]]
- [[OpenSearch-Performance-Troubleshooting|성능 진단과 circuit breaker]]

## 출처

- [JavaScript client - OpenSearch Documentation](https://docs.opensearch.org/latest/clients/javascript/index/)
- [Index document API - OpenSearch Documentation](https://docs.opensearch.org/latest/api-reference/document-apis/index-document/)
- [Circuit breaker settings - OpenSearch Documentation](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/circuit-breaker/)
- [Supported operations in OpenSearch Serverless - AWS Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-genref.html)
- [Compatibility with OpenSearch - opensearch-js GitHub](https://github.com/opensearch-project/opensearch-js/blob/main/COMPATIBILITY.md)
