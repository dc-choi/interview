---
tags: [palantir, foundry, data-connection, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# sync 실패, schema와 부분 결과의 진단

동일 dataset/branch의 sync 두 개는 동시에 실행할 수 없다. scheduled build가 안 보이면 이전 running sync, paused schedule과 disabled agent를 확인한다. Job tracker와 원본 query 상태를 함께 조사한다.

## fetching, upload와 파일 transaction

fetching 지연은 원본 자체의 응답을 Foundry 밖에서도 확인한다. 원본이 바쁘면 작은 sync, incremental과 한가한 시간대를 검토한다. agent heap/동시 quota 부족은 별도 문제이며 무조건 heap만 늘리지 않는다.

FTP/SFTP/Directory crawl은 변경 중인 파일을 피하기 위해 기본 두 번 전체 순회할 수 있다. subfolder를 좁히고 regex는 source root 기준 상대 경로라는 점을 확인한다. HTTP proxy는 active FTP를 지원하지 않으며 load-balancing proxy의 IP 변화는 stateful FTP에서 간헐 실패를 낼 수 있다.

파일 sync는 transactional이다. 마지막 한 파일 전송이 실패해도 그 run의 transaction이 abort되고 앞서 보낸 파일도 dataset view에 commit되지 않는다. APPEND와 file-limit filter로 run을 나누면 실패한 현재 batch만 다시 시도할 수 있다.

`REQUEST_ENTITY_TOO_LARGE`는 data-proxy upload destination의 개별 파일 기본 100GB 한도를 확인한다. 원본 connector가 파일 크기 제한이 없다고 설명해도 upload 경로의 별도 한도가 있다. 한도 override는 문서상 임시 workaround이며 더 작은 파일로 나누는 방향을 우선한다.

## 원본별 오류

S3 403은 region, S3/STS egress, assume-role credential과 proxy/VPC 경로를 나눠 확인한다. region과 signing region을 함께 지정해 list가 실패하는 경우 문서는 signing region만 두는 해결을 제시한다. 모든 region 설정에 일반화하지 않는다.

Response421은 unsupported protocol/port 조합을 확인한다. sync 진단 문서의 implicit FTPS 991 예시는 native FTPS connector의 implicit 990/default explicit21과 구별하고 실제 server 설정을 확인한다.

BadPaddingException은 agent의 source-encryption key 불일치가 원인일 수 있다. 수동 업그레이드 때 var/data가 빠졌는지 확인하고 credential을 재입력한다. API password 오류와 동일하게 취급하지 않는다.

## 형식 손실

JDBC TIMESTAMP가 LONG으로 보이는 backward-compatible 경로는 실제 단위를 확인해 timestamp로 cast한다. source 예제는 millisecond를 1,000으로 나눈다. DECIMAL precision이 달라지면 원본 cast 또는 VARCHAR로 옮겨 Foundry 재cast를 검토한다.

일부 JDBC TIME은 자정 이후 millisecond를 INTEGER로 표현하지만 second 아래를 내린다. 05:00:00.000/.200/.800이 모두 18000000이 될 수 있다. sub-second를 보존하려면 원본 SQL에서 string으로 cast하는 방식과 후속 parse를 확인한다.

## schema 변화

APPEND 사이 schema가 달라지면 schedule을 멈추고 기존/새 schema를 구분한다. 파일은 schema inference를 다시 해도 같은 schema가 되지 않으면 새 dataset으로 분리한다. JDBC는 version이 드러나는 새 dataset/sync로 적재하고 필요하면 명시적으로 union한다.

이미 잘못된 transaction이 commit된 경우 원문은 Palantir Support의 revert 경로를 안내한다. 원본 sync 삭제는 이전 설정 투명성을 잃을 수 있으므로 새 sync가 올바른지 확인한 뒤 판단한다. 삭제한 job spec을 재추가할 때 권한 오류면 같은 dataset으로 새 sync/job spec을 만드는 해결을 확인한다.

## 출처

- [Palantir, syncs-troubleshooting](https://www.palantir.com/docs/foundry/data-connection/syncs-troubleshooting)
- [Palantir, faq](https://www.palantir.com/docs/foundry/data-connection/faq)

## 관련 문서

- [[Palantir-Connection-Operations]]
- [[Palantir-JDBC-Sync-Optimization]]
- [[Palantir-Agent-Recovery]]
