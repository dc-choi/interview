/**
 * 인터페이스와 클래스
 */

// 무조건 public
interface Character {
    readonly name: string;
    readonly moveSpeed: number;
    move(): void;
}

class CharacterImpl implements Character {
    constructor(
        readonly name: string,
        readonly moveSpeed: number
    ) {}

    move() {
        console.log(`${this.name}이(가) ${this.moveSpeed}의 속도로 이동합니다.`);
    }
}

const hero = new CharacterImpl('Hero', 10);
hero.move();
