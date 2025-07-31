/**
 * 문자열을 남발하여 선언된 코드를 피하자.
 * 모든 문자열을 할당할 수 있는 string 타입보다 더 구체적인 타입 명시
 *
 * 변수의 범위를 보다 정확하게 표현하고 싶다면 string 타입보다는 문자열 리터럴을 사용하자.
 *
 * 객체의 속성 이름을 함수 매개변수로 받을 때는 string 보다 keyof을 사용하자.
 */
import { map } from 'es-toolkit/compat';

type RecordingType = 'live' | 'studio';

interface Album {
    title: string;
    artist: string;
    releaseDate: Date;
    recordingType: RecordingType;
}

const pluck = <T, K extends keyof T>(records: T[], key: K): T[K][] => {
    return records.map(o => o[key]);
};

const albums: Album[] = [
    { title: 'Album 1', artist: 'Artist 1', releaseDate: new Date(), recordingType: 'live' },
    { title: 'Album 2', artist: 'Artist 2', releaseDate: new Date(), recordingType: 'studio' },
    { title: 'Album 4', artist: 'Artist 4', releaseDate: new Date(), recordingType: 'live' },
    { title: 'Album 5', artist: 'Artist 5', releaseDate: new Date(), recordingType: 'studio' },
];

console.time('pluck');
const albumTitles = pluck(albums, 'title');
// TS2345: Argument of type "title2" is not assignable to parameter of type keyof Album
// const albumTitles2 = pluck(albums, 'title2');
const artistNames = pluck(albums, 'artist');
const releaseDates = pluck(albums, 'releaseDate');
const recordingTypes = pluck(albums, 'recordingType');
console.timeEnd('pluck');

console.time('map');
const albumTitle2 = map(albums, 'title');
const artistName2 = map(albums, 'artist');
const releaseDate2 = map(albums, 'releaseDate');
const recordingType2 = map(albums, 'recordingType');
console.timeEnd('map');

console.log(albumTitles);
console.log(artistNames);
console.log(releaseDates);
console.log(recordingTypes);

console.log(albumTitle2);
console.log(artistName2);
console.log(releaseDate2);
console.log(recordingType2);
