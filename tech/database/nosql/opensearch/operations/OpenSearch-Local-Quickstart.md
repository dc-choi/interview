---
tags: [database, search, opensearch, docker, local-development, quickstart]
status: done
verified_at: 2026-08-08
category: "Data & Storage - NoSQL"
aliases: ["OpenSearch Local Quickstart", "OpenSearch 로컬 설치", "OpenSearch Docker 시작"]
---

# OpenSearch 로컬 Docker Quickstart

로컬 학습 환경에서 OpenSearch를 실행하고 REST API 응답을 확인한 뒤 [[OpenSearch-Basics|기초 실습]]으로 넘어가기 위한 최소 Runbook이다. Docker 예시는 개념 확인과 개발용이며 프로덕션 배포 기준이 아니다.

## 실행 경로 선택

| 경로 | 적합한 목적 | 보안과 데이터 경계 |
|---|---|---|
| 단일 container, Security plugin 비활성화 | 몇 분 안에 API와 Query DSL 체험 | localhost 전용, container 종료 시 데이터 제거 |
| 개발용 Docker Compose, 보안 비활성화 | 여러 node와 Dashboards 동작 확인 | 외부 공개 금지, volume 수명주기 명시 |
| Demo security Docker Compose | TLS와 인증이 있는 로컬 흐름 확인 | Demo certificate와 `-k`는 프로덕션에 사용 금지 |

처음에는 단일 container로 요청과 응답을 익히고, node 배치나 Dashboards가 학습 목표일 때만 Compose로 확장한다.

## 시작 전 확인

```bash
docker version
docker compose version
```

- Docker Desktop은 OpenSearch에 사용할 메모리를 최소 4GB로 설정한다.
- REST API는 `9200`, Performance Analyzer는 `9600`, Dashboards는 `5601`, node transport는 `9300`을 사용한다. 이미 사용 중인 host port가 있는지 확인한다.
- Linux와 Windows WSL에서 bootstrap check가 실패하면 host의 `vm.max_map_count`를 확인한다.

```bash
cat /proc/sys/vm/max_map_count
```

공식 Linux 기준은 최소 `262144`다. Host kernel 설정 변경은 시스템 전체에 영향을 주므로 현재 값과 실행 환경을 확인한 뒤 공식 설치 문서의 절차를 따른다. macOS host에 Linux 명령을 그대로 실행하지 않는다.

## 가장 빠른 경로: 단일 node와 보안 비활성화

이 경로는 Security plugin을 끈다. Port를 loopback에만 bind하고 신뢰할 수 없는 network나 운영 환경에서는 사용하지 않는다.

```bash
docker pull opensearchproject/opensearch:latest

docker run --name opensearch-local --rm -it \
  -p 127.0.0.1:9200:9200 \
  -p 127.0.0.1:9600:9600 \
  -e "discovery.type=single-node" \
  -e "DISABLE_SECURITY_PLUGIN=true" \
  opensearchproject/opensearch:latest
```

- `discovery.type=single-node`는 단일 node bootstrap에 사용한다.
- `--rm`은 container 종료 후 container filesystem을 제거한다. 별도 volume이 없으므로 색인 데이터도 보존하지 않는다.
- `latest`는 일회성 체험에만 사용한다. 재현 가능한 실습과 팀 환경에서는 확인한 구체 version tag로 고정한다.
- Foreground 실행을 끝내려면 `Ctrl+C`를 누른다.

다른 terminal에서 root endpoint와 cluster health를 확인한다.

```bash
curl http://127.0.0.1:9200
curl "http://127.0.0.1:9200/_cluster/health?pretty"
```

Root 응답의 `version.distribution`이 `opensearch`인지 확인한다. 단일 node에서 index를 만든 뒤 health가 yellow라면 primary는 할당됐지만 기본 replica가 같은 node에 배치되지 못한 상태일 수 있다. Red는 같은 의미가 아니므로 원인을 별도로 진단한다.

## 반복 가능한 경로: Docker Compose

공식 Docker 문서의 현재 Compose 예시를 복사한 뒤 다음을 먼저 결정한다.

1. OpenSearch와 Dashboards image tag를 같은 구체 version으로 고정한다.
2. 보안을 끈 개발용 구성인지, demo security 구성인지 명시한다.
3. Data volume을 보존할지 실습 종료 때 삭제할지 정한다.
4. Local host port는 loopback에만 bind한다. 특히 보안을 끈 구성에서는 외부 interface에 노출하지 않는다.

### 보안을 끈 개발 구성

OpenSearch node에는 `DISABLE_INSTALL_DEMO_CONFIG=true`와 `DISABLE_SECURITY_PLUGIN=true`, Dashboards에는 `DISABLE_SECURITY_DASHBOARDS_PLUGIN=true`가 필요하다. 이 구성의 API와 Dashboards는 HTTP를 사용한다.

```yaml
# OpenSearch service
ports: ["127.0.0.1:9200:9200", "127.0.0.1:9600:9600"]
# Dashboards service
ports: ["127.0.0.1:5601:5601"]
```

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=200

curl http://127.0.0.1:9200
```

Dashboards는 `http://127.0.0.1:5601`에서 확인한다. 보안이 꺼진 port를 외부 interface에 공개하지 않는다.

### Demo security 구성

OpenSearch 2.12 이상에서 demo security를 초기화하려면 충분히 강한 admin password가 필요하다. Compose 파일과 같은 directory의 `.env`에 값을 두고 repository에는 commit하지 않는다.

```dotenv
OPENSEARCH_INITIAL_ADMIN_PASSWORD=<replace-with-a-strong-local-password>
```

```gitignore
.env
```

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=200

curl -k -u admin https://127.0.0.1:9200
```

`curl` prompt에 admin password를 입력한다. `-k`는 trust chain과 hostname을 포함한 server certificate 검증 전체를 생략하는 로컬 체험용 옵션이다. 운영에서는 자체 CA와 server certificate를 배포하고 검증을 끄지 않는다. 이 비밀번호는 초기 bootstrap 입력이다. 기존 named volume을 재사용하면서 `.env` 값만 바꿔도 기존 security index의 비밀번호가 자동으로 바뀌지는 않는다.

OpenSearch REST API의 TLS와 Dashboards web server의 TLS는 별도 설정이다. 공식 Quickstart 본문은 보안 구성의 Dashboards를 HTTPS로 안내하지만, 현재 sample Compose와 Docker 설치 문서는 browser endpoint를 HTTP로 노출한다. Sample을 그대로 사용했다면 `http://127.0.0.1:5601`로 접속하고, `server.ssl.enabled`를 직접 활성화한 경우에만 HTTPS를 사용한다.

### 종료와 데이터 수명주기

```bash
docker compose down
```

`docker compose down`은 container와 network를 내리지만 named volume은 남긴다. `docker compose down -v`는 volume과 색인 데이터를 삭제하므로 실습 데이터를 버려도 되는지 확인한 경우에만 사용한다.

## 실행 후 확인 순서

```bash
curl "http://127.0.0.1:9200/_cluster/health?pretty"
curl "http://127.0.0.1:9200/_cat/nodes?v"
curl "http://127.0.0.1:9200/_cat/shards?v"
```

Demo security 구성이라면 URL을 HTTPS로 바꾸고 CA 검증과 인증 정보를 제공한다. 확인 순서는 다음과 같다.

1. Root endpoint에서 distribution과 version을 확인한다.
2. Cluster health에서 primary와 replica allocation 상태를 구분한다.
3. Nodes와 shards API로 실제 배치를 확인한다.
4. [[OpenSearch-Basics#인덱스 생성부터 검색까지|인덱스 생성, 문서 색인, GET과 Search]]를 실행한다.
5. 실습을 끝낸 뒤 container와 volume의 보존 여부를 확인한다.

## 자주 막히는 지점

| 증상 | 먼저 확인할 것 |
|---|---|
| Container가 바로 종료됨 | 단일 container는 foreground 출력 확인, `--rm`으로 제거됐다면 옵션 없이 재실행, Compose는 service log 확인 |
| `vm.max_map_count` 오류 | Linux 또는 WSL host 값이 최소 기준보다 낮은지 확인 |
| `address already in use` | `9200`, `9600`, `5601` host port 충돌 |
| HTTP 요청이 실패하거나 TLS 오류 발생 | 보안 비활성화는 HTTP, demo security는 HTTPS인지 확인 |
| Dashboards가 backend에 연결되지 않음 | OpenSearch와 Dashboards의 Security plugin 활성 상태, backend URL과 image version 일치 여부 확인 |
| Compose 파일을 찾지 못함 | 지원 파일명과 실행 directory를 확인하거나 `docker compose -f <path> ...` 사용 |
| Single-node index의 health가 yellow | Primary는 할당되고 replica만 unassigned인지 `_cat/shards`로 확인 |
| Dashboards에 접속할 수 없음 | 단일 container 경로는 Dashboards를 실행하지 않음 |
| Container name 충돌 | `docker container ls -a`에서 이전 `opensearch-local` 확인 |

## 프로덕션으로 가져가면 안 되는 것

- Security plugin 비활성화와 외부 공개 port
- Demo certificate, demo user와 `curl -k`
- `latest` image tag와 서로 다른 OpenSearch/Dashboards version
- 단일 node, 임시 container filesystem과 backup 없는 volume
- 기본 heap, shard, replica와 OS 설정을 workload 검증 없이 사용

프로덕션에서는 인증과 권한, 자체 TLS, secret rotation, version pinning, persistent storage, snapshot, failure domain, monitoring과 capacity 검증을 별도로 설계한다.

## 통과 기준

- [ ] `9200`, `9600`, `5601`, `9300`의 역할을 설명한다.
- [ ] 보안 비활성화 구성의 HTTP와 demo security 구성의 HTTPS를 구분한다.
- [ ] Single-node에서 replica가 unassigned일 수 있는 이유를 설명한다.
- [ ] Container를 종료한 뒤 데이터가 남는 조건과 사라지는 조건을 설명한다.
- [ ] [[OpenSearch-Basics|다음 실습]]의 네 요청을 직접 실행한다.

## 관련 문서

- [[OpenSearch|OpenSearch 학습 지도]], [[OpenSearch-Basics|다음: 요청과 응답의 실물]]
- [[OpenSearch-Architecture|분산 실행 모델]], [[OpenSearch-Cluster-Reliability|Cluster 신뢰성]]
- [[OpenSearch-Security-Production|보안과 프로덕션 체크리스트]]
- [[OpenSearch-JavaScript-Client|JavaScript client 연결]]

## 출처

- [OpenSearch Documentation, Installation quickstart](https://docs.opensearch.org/latest/getting-started/quickstart/)
- [OpenSearch Documentation, Docker installation](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/docker/)
- [OpenSearch Documentation, Installing OpenSearch](https://docs.opensearch.org/latest/install-and-configure/install-opensearch/index/)
- [OpenSearch Documentation, Communicate with OpenSearch](https://docs.opensearch.org/latest/getting-started/communicate/)
- [OpenSearch Documentation, Best practices for OpenSearch security](https://docs.opensearch.org/latest/security/configuration/best-practices/)
