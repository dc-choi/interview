const isDefined = <T extends unknown>(value: T | undefined | null): value is T => {
    return value !== null && value !== undefined;
}

const members = ['Alice', 'Bob', 'Charlie', 'Dave', null, undefined].filter(isDefined);
console.log(`Members: ${members}`);