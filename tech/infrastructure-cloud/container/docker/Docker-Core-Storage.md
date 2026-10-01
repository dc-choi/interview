---
tags: [infrastructure, docker, container, volume, storage, database]
status: done
category: "Infrastructure - Container"
aliases: ["Docker 데이터 영속성", "Docker Storage", "Docker volume과 bind mount"]
verified_at: 2026-09-30
---

# Docker 데이터 영속성 — volume, bind mount와 DB image

container를 지우거나 새 image로 교체해도 남아야 하는 data는 container 밖에 둔다. named volume과 bind mount의 정의, mount가 image 파일을 가리거나 복사하는 규칙은 [[Docker-Core#Port와 storage|Docker 기본]]에 있다. 이 문서는 data가 사라진 것처럼 보이는 경로, mount 문법의 함정과 공식 DB image를 올바르게 띄우는 계약을 다룬다.

## data가 쓰이는 위치

| 위치 | 생기는 경우 | 수명 |
|---|---|---|
| writable layer | `VOLUME`도 mount도 아닌 경로에 쓴 파일 | `docker stop`에는 남고 `docker rm`에 사라진다 |
| anonymous volume | image가 `VOLUME`으로 선언한 경로에 아무것도 mount하지 않았을 때, `-v /path`처럼 이름 없이 줄 때 | container를 지워도 남지만 이름이 없어 새 container에 다시 붙지 않는다 |
| named volume | `-v 이름:/path`, Compose의 named volume | `docker volume rm`이나 prune으로 지울 때까지 남는다 |
| bind mount | `-v /host/path:/path`, `--mount type=bind` | host 파일이라 container 수명과 무관하다 |

stop과 rm의 차이를 포함한 container 상태 전이는 [[Docker-Core#실행 수명주기와 CLI|실행 수명주기]]를 본다.

### DB data가 사라진 것처럼 보이는 이유

공식 DB image는 data 경로를 Dockerfile의 `VOLUME`으로 선언한다. 그래서 `-v` 없이 띄운 DB도 data는 writable layer가 아니라 Docker가 만든 anonymous volume에 쓰인다. 이 container를 `docker rm`(`-f` 포함)으로 지우고 같은 명령으로 다시 띄우면 만들어 둔 database가 보이지 않는다. data가 삭제된 것이 아니라 이전 anonymous volume에 남은 채, 새 container가 새 anonymous volume을 받았기 때문이다. 남은 volume은 어떤 container도 참조하지 않는 dangling volume으로 disk를 차지한다(`docker volume ls -f dangling=true`).

- `docker rm -v`와 `docker run --rm`은 이름 없는 volume만 함께 지우고 named volume은 남긴다.
- `docker compose down`도 anonymous volume을 지우지 않지만 이름이 없어 다음 `up`에 자동으로 붙지 않는다. `down -v`는 Compose 파일에 선언된 named volume과 anonymous volume을 함께 지운다.
- 남아야 하는 data는 명시적인 named volume이나 bind mount에 두고, anonymous volume을 영속 수단으로 기대하지 않는다.

## Named volume 수명주기

```bash
docker volume create app-data
docker volume ls
docker volume inspect app-data     # Mountpoint: Docker가 data를 두는 실제 경로
docker run --rm -v app-data:/data alpine sh -c 'echo hi > /data/a.txt'
docker run --rm -v app-data:/data alpine cat /data/a.txt   # 새 container에서도 보인다
docker volume rm app-data          # 지운 volume의 data는 복구할 수 없다
```

- `-v`에 없는 volume 이름을 주면 빈 volume을 자동으로 만든다. 이름 오타가 새 빈 volume을 붙여 data가 없어진 것처럼 보일 수 있으므로 운영에서는 `docker volume ls`로 이름을 대조한다.
- 여러 container가 같은 volume을 공유할 수 있지만 동시 쓰기를 조정해 주지는 않는다. 쓰기 조정은 application 책임이고 DB data directory는 한 server process만 쓰게 둔다.
- `docker volume prune`은 API 1.42 이상에서 기본적으로 어떤 container도 쓰지 않는 anonymous volume만 지우고, named volume까지 지우려면 `-a`가 필요하다. 멈춰 둔 DB container를 지운 뒤 `-a`를 습관처럼 붙이면 그 named volume도 사라진다. `docker system prune --volumes`도 anonymous volume만 대상이다. `compose down -v`와 함께 삭제 위험 명령으로 묶어 관리한다.
- Docker Desktop의 `Mountpoint`는 내부 Linux VM 경로라 host에서 열 수 없다. data는 그 volume을 mount한 container로 확인한다([[Docker-Core#Docker Desktop의 Linux VM 경계|Desktop VM 경계]]).

## Bind mount 문법과 함정

| 항목 | `-v` | `--mount type=bind` |
|---|---|---|
| 형식 | `-v /host/path:/container/path[:ro]` | `--mount type=bind,src=/host/path,dst=/container/path[,readonly]` |
| source 해석 | `/`나 `.`으로 시작하면 host 경로(상대 경로는 Engine 23 이상), 그 밖의 이름은 named volume | `src`에 절대 또는 상대 경로 |
| source가 없을 때 | host에 빈 디렉터리를 만들어 붙인다. 파일을 기대한 경로도 디렉터리로 만든다 | 오류. `bind-create-src` 옵션을 줄 때만 만든다 |

- `-v data:/var/lib/mysql`은 host의 `data` 디렉터리가 아니라 `data`라는 named volume이다. host 디렉터리는 `./data`나 절대 경로로 쓴다.
- `-v`의 자동 생성 때문에 경로 오타가 빈 디렉터리로 조용히 붙어 container 안 설정 파일이 사라진 것처럼 보일 수 있다. 반드시 있어야 하는 경로에는 오류를 내는 `--mount`가 안전하고, Docker 문서도 더 명시적이고 모든 옵션을 지원하는 `--mount`를 일반적으로 권한다.
- bind mount는 기본적으로 container가 host 파일을 만들고 고치고 지울 수 있다. 설정 파일이나 정적 web 파일처럼 container가 바꾸면 안 되는 것은 `:ro` 또는 `readonly`로 붙이며, 쓰기를 시도하면 `Read-only file system` 오류가 난다.
- 권한: Linux에서 user namespace remap을 쓰지 않는 기본 구성이면 host 파일의 numeric UID, GID가 그대로 보이고 container process의 UID로 접근을 판정한다. non-root user로 도는 image가 host 디렉터리에 쓰지 못하면 소유권과 mode를 맞춘다. Docker Desktop에서 되던 bind mount가 Linux 서버에서 `permission denied`로 실패하면 이것부터 본다.
- host 경로는 장비마다 다르다. 팀 작업에서는 Compose의 `./` 상대 경로로 compose 파일 기준을 맞춘다([[Docker-Compose#docker run 옵션과의 대응|Compose volumes]]).
- 용도는 bind mount가 source code와 설정 파일 공유, named volume이 DB data와 log 같은 영속 data다.

`docker cp SRC DEST`는 host와 container 사이의 1회 복사이고 실행 중이거나 중지된 container 모두에 쓸 수 있다. mount가 아닌 경로로 복사한 파일은 writable layer에 들어가 container를 지우면 함께 사라지고, 원본을 고칠 때마다 다시 복사해야 한다. container 쪽 파일은 root 소유로 만들어지며 `-a`를 주면 원본 소유권을 유지한다. 지속 동기화는 bind mount, 영속 data는 volume을 쓴다.

## 공식 DB image 실행 계약

env, data 경로, port와 초기화 조건은 외우지 말고 쓰는 tag의 image 문서(Docker Hub의 How to use this image, Environment Variables)에서 확인한다. 아래는 2026-09-30 docker-library의 Dockerfile과 image 문서 기준이다.

| image | 초기화 env | data 경로 | port | CLI |
|---|---|---|---|---|
| `mysql` | `MYSQL_ROOT_PASSWORD`, `MYSQL_ALLOW_EMPTY_PASSWORD`, `MYSQL_RANDOM_ROOT_PASSWORD` 중 하나 필수. `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`는 선택 | `VOLUME /var/lib/mysql` | 3306, 33060 | `mysql` |
| `postgres` 17 이하 | `POSTGRES_PASSWORD` 필수(기본 superuser `postgres`). `POSTGRES_USER`, `POSTGRES_DB`는 선택 | `PGDATA`와 `VOLUME` 모두 `/var/lib/postgresql/data` | 5432 | `psql` |
| `postgres` 18 이상 | 17 이하와 같다 | `PGDATA=/var/lib/postgresql/<major>/docker`, `VOLUME /var/lib/postgresql` | 5432 | `psql` |
| `mongo` | `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`(admin DB에 root 사용자 생성) | `VOLUME /data/db /data/configdb` | 27017 | `mongosh`(4.x는 `mongo`) |

- mysql과 postgres는 빈 data directory로 처음 시작할 때 password env가 없으면 `Database is uninitialized and ... not specified` 계열 오류를 남기고 바로 종료한다. container가 곧바로 `Exited`면 `docker logs`부터 본다.
- `MYSQL_USER`는 `MYSQL_DATABASE`에 대한 superuser 권한(`GRANT ALL`에 해당)을 받는다. app 계정 권한을 좁혀야 하면 init script나 migration에서 따로 만든다.
- 비밀번호를 image에 굽지 않고 env로 넣으면 image에 secret이 남지 않고 값이 바뀌어도 rebuild하지 않는다. 다만 env는 `docker inspect` 권한이 있으면 보이므로 secret 관리는 [[Docker-Compose#환경변수 관리|Compose 환경변수 관리]]를 따른다.

### 초기화는 빈 data directory에서 한 번만 일어난다

세 image 모두 data directory에 이미 database가 있으면 초기화 env와 `/docker-entrypoint-initdb.d`의 script를 적용하지 않고 기존 database를 그대로 둔다. mysql entrypoint는 `mysql` 하위 디렉터리, postgres는 `PG_VERSION` 파일로 기존 database를 판단한다.

- 기존 volume을 붙인 채 `MYSQL_ROOT_PASSWORD`나 `POSTGRES_PASSWORD`만 바꿔 새 container를 띄워도 비밀번호는 바뀌지 않고 새 `MYSQL_DATABASE`도 생기지 않는다. credential 변경은 DB의 계정 관리 SQL로 하고 env는 초기값으로만 취급한다. data를 지우고 다시 초기화하는 방법은 운영에서는 전체 data 삭제와 같다.
- mysql과 postgres는 처음 초기화하는 동안 외부 연결을 받지 않는다. mysql image는 init script를 network를 끈 임시 server에서 실행한 뒤 최종 server를 다시 띄운다. Compose에서 app이 먼저 붙는 문제와 healthcheck 주의는 [[Docker-Compose-Startup#의존 서비스 healthcheck|의존 서비스 healthcheck]].
- 같은 원리가 OpenSearch의 초기 admin 비밀번호에도 적용된다([[OpenSearch-Local-Quickstart]]).

### 미리 만든 host 디렉터리 함정

host에 data용 디렉터리를 미리 만들고 아무 파일이나 둔 채 `-v <host 경로>:/var/lib/mysql`로 띄우면 MySQL container가 기동 직후 종료된다. entrypoint는 `mysql` 하위 디렉터리가 없으니 초기화를 시작하지만 `mysqld --initialize`가 비어 있지 않은 data directory를 거부하기 때문이다. MySQL 8.4 server log 문구는 `--initialize specified but the data directory has files in it. Aborting.`이고, 이름이 `.`으로 시작하는 항목만 있으면 허용된다.

없는 경로나 빈 디렉터리를 주면 정상 기동해 data 파일이 생긴다. 이 파일을 만든 주체는 DB image entrypoint의 초기화(mysql은 `mysqld --initialize-insecure`, postgres는 `initdb`)다. Docker가 image 내용을 host로 복사한 것이 아니며 bind mount는 host 쪽이 비어 있어도 복사하지 않는다. 기동 뒤에는 host와 container가 같은 파일을 보므로 한쪽에서 만든 파일이 다른 쪽에도 보인다.

### PostgreSQL 18의 경로 변경

18부터 `PGDATA`가 major version별 경로(`/var/lib/postgresql/18/docker`)로 바뀌고 image가 선언한 `VOLUME`도 `/var/lib/postgresql`로 옮겨졌다. image 문서는 mount를 이 상위 경로에 걸라고 권하며, major upgrade 때 `pg_upgrade --link`를 쓸 수 있게 하려는 구조다.

- 17 이하는 반대로 `/var/lib/postgresql/data`에 mount한다. `/var/lib/postgresql`에 붙이면 image가 선언한 `/var/lib/postgresql/data`에 별도 anonymous volume이 생겨 data가 그쪽에 쓰이고, container를 다시 만들 때 남지 않는다.
- 18 이상 entrypoint는 옛 위치에서 이전 형식의 data를 발견하면 새 cluster를 만들지 않고 오류로 멈춘다. major version이 다른 data는 경로를 맞춰도 그대로 쓸 수 없고 `pg_upgrade`나 dump와 restore가 필요하다.
- tag 없는 `postgres`는 새 major가 나오면 경로 계약이 바뀌므로 major tag를 고정한다. 2026-09-30 기준 `latest`는 18이고 19는 beta tag만 있다.

## DB port 공개 범위

backend와 DB를 같은 user-defined network에 두면 DB는 publish하지 않아도 이름과 container port로 접속된다. 외부 접근이 필요 없으면 `-p`를 빼고, host의 DB 도구만 쓰면 `-p 127.0.0.1:5432:5432`처럼 loopback에 bind한다. 외부에 열어야 하면 source IP 제한이 필요한데, publish된 port는 host의 INPUT이 아니라 FORWARD 경로를 지나 host 방화벽 front-end 규칙을 거치지 않을 수 있다. 제한 위치는 [[Docker-Bridge-Networking#publish 보안 경계|publish 보안 경계]]를 따른다.

## 면접 포인트

Q. DB container를 지우고 같은 명령으로 다시 띄웠더니 data가 없다. 왜인가?
- image가 data 경로를 `VOLUME`으로 선언해 이전 data는 anonymous volume에 남았고, 새 container는 새 anonymous volume을 받았다. named volume이나 bind mount로 경로를 명시한다

Q. volume을 유지한 채 `MYSQL_ROOT_PASSWORD`를 바꿨는데 반영되지 않는 이유는?
- 초기화 env는 빈 data directory의 첫 초기화에만 적용된다. 변경은 SQL로 한다

Q. `-v`와 `--mount`는 무엇이 다른가?
- 없는 source를 `-v`는 빈 디렉터리로 만들고 `--mount`는 오류를 낸다. `-v`에 이름만 주면 named volume으로 해석한다

## 출처

- [Docker Docs, Volumes](https://docs.docker.com/engine/storage/volumes/)
- [Docker Docs, Bind mounts](https://docs.docker.com/engine/storage/bind-mounts/)
- [Docker Docs, docker container run](https://docs.docker.com/reference/cli/docker/container/run/)
- [Docker Docs, docker container rm](https://docs.docker.com/reference/cli/docker/container/rm/)
- [Docker Docs, docker container cp](https://docs.docker.com/reference/cli/docker/container/cp/)
- [Docker Docs, docker volume ls](https://docs.docker.com/reference/cli/docker/volume/ls/)
- [Docker Docs, docker volume prune](https://docs.docker.com/reference/cli/docker/volume/prune/)
- [Docker Docs, docker system prune](https://docs.docker.com/reference/cli/docker/system/prune/)
- [Docker Docs, docker compose down](https://docs.docker.com/reference/cli/docker/compose/down/)
- [Docker Hub, mysql Official Image](https://hub.docker.com/_/mysql)
- [Docker Hub, postgres Official Image](https://hub.docker.com/_/postgres)
- [Docker Hub, mongo Official Image](https://hub.docker.com/_/mongo)
- [MySQL 8.4 Reference Manual, Initializing the Data Directory](https://dev.mysql.com/doc/refman/8.4/en/data-directory-initialization.html)
- [mysql 8.4 Dockerfile과 docker-entrypoint.sh — docker-library/mysql](https://github.com/docker-library/mysql/tree/master/8.4)
- [postgres Dockerfile과 docker-entrypoint.sh — docker-library/postgres](https://github.com/docker-library/postgres)
- [mongo Dockerfile — docker-library/mongo](https://github.com/docker-library/mongo)
- [server error message 정의 — mysql/mysql-server 8.4](https://github.com/mysql/mysql-server/blob/8.4/share/messages_to_error_log.txt)
- [인프런, JSCODE 박재성, Docker Volume(도커 볼륨)](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227904)
- [인프런, JSCODE 박재성, Docker로 MySQL 실행시켜보기 1](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227905)
- [인프런, JSCODE 박재성, Docker로 MySQL 실행시켜보기 2](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227906)
- [인프런, JSCODE 박재성, Docker로 MySQL 실행시켜보기 3](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227907)
- [인프런, JSCODE 박재성, Docker로 MySQL 실행시켜보기 4](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=228057)
- [인프런, JSCODE 박재성, Docker로 PostgreSQL 실행시켜보기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227908)
- [인프런, JSCODE 박재성, 보충 자료: Docker로 PostgreSQL 실행시켜보기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=356819)
- [인프런, JSCODE 박재성, Docker로 MongoDB 실행시켜보기](https://www.inflearn.com/courses/lecture?courseId=334085&unitId=227909)
- [인프런, Hong, Docker Container만이 가지고 있는 레이어 구조의 데이터 영속성 문제](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416100)
- [인프런, Hong, Container의 데이터 영속성을 위한 Volume Mount 패턴](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416101)
- [인프런, Hong, 외부 저장소를 활용한 데이터 영속성 관리 Named Volume 패턴](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416102)
- [인프런, Hong, 컨테이너 환경 변수 전달 패턴 및 MySQL 실행 및 프롬프트 접속하기](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416099)
- [인프런, Hong, Docker Container와의 상호작용을 위한 필수 명령어](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=414210)
- [인프런, Hong, Container 포트 연결을 위한 포트 매핑 및 통신 실습](https://www.inflearn.com/courses/lecture?courseId=340962&unitId=416098)
- [인프런, 널널한 개발자, PostgreSQL 이미지와 도커 볼륨](https://www.inflearn.com/courses/lecture?courseId=343428&unitId=477029)

## 관련 문서

- [[Docker-Core|Docker 기본]]
- [[Docker-Compose|Docker Compose]]
- [[Docker-Bridge-Networking|Docker bridge networking]]
- [[Container-Linux-Internals#OverlayFS와 writable layer|OverlayFS와 writable layer]]
- [[OpenSearch-Local-Quickstart|OpenSearch local quickstart]]
