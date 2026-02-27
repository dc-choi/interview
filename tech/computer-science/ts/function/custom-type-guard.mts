/**
 * 사용자 정의 타입 가드
 *
 * 설정하면 특정 타입이 어떤 타입인지 좁혀주는 역할을 한다.
 */

type Dog = {
    name: string;
    isBark: boolean;
};

type Cat = {
    name: string;
    isMeow: boolean;
};

type Animal = Dog | Cat;

const isDog = (animal: Animal): animal is Dog => {
    return (animal as Dog).isBark !== undefined;
};

const isCat = (animal: Animal): animal is Cat => {
    return (animal as Cat).isMeow !== undefined;
};

const warning = (animal: Animal) => {
    if (isDog(animal)) {
        console.log(`멍멍! ${animal.name}가 짖습니다.`);
    } else if (isCat(animal)) {
        console.log(`야옹! ${animal.name}가 웁니다.`);
    }
};
