---
tags: [nestjs, typeorm, database, custom-provider, repository]
status: done
category: "OS & Runtime - NestJS"
aliases: ["NestJS TypeORM Manual Wiring", "TypeORM 수동 배선", "SQL TypeORM Recipe"]
---

# NestJS + TypeORM 수동 배선 — 커스텀 프로바이더로 DataSource 직접 구성

`@nestjs/typeorm` 패키지 없이 **커스텀 프로바이더 메커니즘만으로 TypeORM을 배선**하는 방식. 전용 패키지가 감춰주는 오버헤드를 전부 직접 지지만, 그만큼 Nest DI가 비동기 리소스를 다루는 계약(async provider가 앱 시작을 지연시키는 구조)이 그대로 드러난다 — [[NestJS-Database|@nestjs/typeorm 배선]]의 하부 원리에 해당한다.

## 1. DataSource를 async provider로

연결은 `new DataSource(옵션).initialize()`로 수립하고, `initialize()`가 Promise를 반환하므로 **async provider**(useFactory)로 만든다. 커스텀 프로바이더는 `*.providers.ts` 파일로 분리하는 것이 컨벤션.

```ts
// database.providers.ts
import { DataSource } from 'typeorm';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'root',
        database: 'test',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
      });

      return dataSource.initialize();
    },
  },
];
```

- `synchronize: true`는 **운영 금지** — 스키마를 엔티티에 맞춰 바꾸며 운영 데이터를 잃을 수 있다.
- 이를 담는 DatabaseModule은 providers에 등록하고 **exports로 재공개**해야 다른 모듈이 쓸 수 있다:

```ts
// database.module.ts
@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
```

`DATA_SOURCE`에 의존하는 모든 클래스는 **Promise가 resolve될 때까지 인스턴스화가 대기**한다 — DB 연결이 서기 전에 앱이 요청을 받지 않게 되는 구조가 여기서 나온다.

## 2. Repository provider

TypeORM은 리포지토리 패턴을 지원한다 — 엔티티마다 Repository가 있고, 연결(DataSource)에서 얻는다.

```ts
// photo.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 500 })
  name: string;

  @Column('text')
  description: string;

  @Column()
  filename: string;

  @Column('int')
  views: number;

  @Column()
  isPublished: boolean;
}
```

Repository도 커스텀 프로바이더로 — DataSource를 inject 받아 `getRepository()`:

```ts
// photo.providers.ts
export const photoProviders = [
  {
    provide: 'PHOTO_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Photo),
    inject: ['DATA_SOURCE'],
  },
];
```

**매직 스트링 금지** — 실전에서는 `PHOTO_REPOSITORY`, `DATA_SOURCE` 같은 토큰을 별도 `constants.ts`에 모은다 (문자열 오타는 컴파일러가 못 잡는다).

## 3. Service에서 주입

```ts
// photo.service.ts
@Injectable()
export class PhotoService {
  constructor(
    @Inject('PHOTO_REPOSITORY')
    private photoRepository: Repository<Photo>,
  ) {}

  async findAll(): Promise<Photo[]> {
    return this.photoRepository.find();
  }
}
```

연결은 비동기지만 사용자 코드에는 완전히 보이지 않는다 — Repository가 DB 연결을 기다리고, Service는 Repository가 준비될 때까지 지연되며, 모든 클래스가 인스턴스화된 뒤에야 앱 전체가 시작된다.

```ts
// photo.module.ts — 조립
@Module({
  imports: [DatabaseModule],
  providers: [...photoProviders, PhotoService],
})
export class PhotoModule {}
```

PhotoModule을 루트 AppModule에 import하는 것까지가 배선.

## 수동 배선 vs @nestjs/typeorm

| | 수동 배선 (이 문서) | [[NestJS-Database\|@nestjs/typeorm]] |
|---|---|---|
| DataSource | useFactory + initialize() 직접 | `TypeOrmModule.forRoot()` (재시도 옵션 내장) |
| Repository | getRepository() 프로바이더 직접 작성 | `forFeature([Photo])` + `@InjectRepository` |
| 토큰 | 문자열/Symbol 직접 관리 | `getRepositoryToken()` 제공 |
| 적합 | DI 원리 학습, 특수한 초기화 제어 | 일반 프로덕션 (공식 권장) |

## 면접 체크포인트

- async provider(useFactory가 Promise 반환)가 의존 클래스의 인스턴스화를 지연시키는 계약 — DB 연결 전 요청 수신 방지
- Repository를 DataSource에서 파생시키는 inject 체인 (`DATA_SOURCE` → `getRepository`)
- 문자열 토큰의 위험(매직 스트링)과 constants 분리, [[Custom-Provider|인터페이스는 토큰이 될 수 없다]]와 같은 축
- synchronize: true 운영 금지 이유
- 전용 패키지(@nestjs/typeorm)가 대신해 주는 것이 무엇인지 설명할 수 있는가

## 관련 문서

- [[NestJS-Database|NestJS Database (@nestjs/typeorm — 프로덕션 표준 경로)]]
- [[Custom-Provider|Custom Provider (useFactory, async provider 계약)]]
- [[ORM|ORM (Sequelize, TypeORM, Prisma 비교)]]

## 출처
- [NestJS — SQL (TypeORM) recipe](https://docs.nestjs.com/recipes/sql-typeorm)
