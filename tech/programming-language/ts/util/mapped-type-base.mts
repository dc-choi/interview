/**
 * Partial<T>
 *
 * 특정 객체 타입의 모든 프로퍼티를 선택적으로 만드는 유틸리티 타입
 */

interface Post {
    title: string;
    tags: string[];
    content: string;
    thumbnail?: string;
}

type MyPartial<Type> = {
    [Key in keyof Type]?: Type[Key];
};

const draft: MyPartial<Post> = {
    title: "Draft Title",
    tags: ["draft", "typescript"],
};

/**
 * Required<T>
 *
 * 특정 객체 타입의 모든 프로퍼티를 필수로 만드는 유틸리티 타입
 */

type MyRequired<Type> = {
    [Key in keyof Type]-?: Type[Key];
};

const complete: MyRequired<Post> = {
    title: "Complete Post",
    tags: ["complete", "typescript"],
    content: "This is a complete post.",
    thumbnail: "thumbnail.png",
};

/**
 * Readonly<T>
 *
 * 특정 객체 타입의 모든 프로퍼티를 읽기 전용으로 만드는 유틸리티 타입
 */

type MyReadonly<Type> = {
    readonly [Key in keyof Type]: Type[Key];
};

const readOnly: MyReadonly<Post> = {
    title: "Read Only Post",
    tags: ["readonly", "typescript"],
    content: "This post is read-only.",
};

// readOnly.title = "New Title"; // Error: Cannot assign to 'title' because it is a read-only property.

/**
 * Pick<T, K>
 *
 * 특정 객체 타입에서 일부 프로퍼티만 선택하여 새로운 타입을 만드는 유틸리티 타입
 */

type MyPick<Type, Keys extends keyof Type> = {
    [Key in Keys]: Type[Key];
};

const legacyPost: MyPick<Post, "title" | "content"> = {
    title: "Legacy Post",
    content: "This is a legacy post.",
};

/**
 * Omit<T, K>
 *
 * 특정 객체 타입에서 일부 프로퍼티를 제외한 나머지 프로퍼티로 새로운 타입을 만드는 유틸리티 타입
 */

type MyOmit<Type, Keys extends keyof Type> = MyPick<Type, Exclude<keyof Type, Keys>>;

const noTitlePost: MyOmit<Post, "title"> = {
    content: "",
    tags: [],
    thumbnail: "",
};

/**
 * Record<K, T>
 *
 * 특정 키 집합 K와 값 타입 T를 사용하여 객체 타입을 만드는 유틸리티 타입
 */

type MyRecord<Keys extends string | number | symbol, Value> = {
    [Key in Keys]: Value;
};

type Thumbnail = MyRecord<"large" | "medium" | "small" | "watch", { url: string }>;