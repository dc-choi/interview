type Language = 'JavaScript' | 'TypeScript' | 'Java' | 'C++' | 'C#';
interface GovernedLanguage {
    language: Language;
    organization: string;
}

const complain = (lang: GovernedLanguage) => {
    console.log(lang);
};

complain({ language: 'JavaScript', organization: 'Mozilla' });

const lang: GovernedLanguage = {
    language: 'JavaScript',
    organization: 'Mozilla',
};
complain(lang);

const lang2 = {
    language: 'TypeScript',
    organization: 'Microsoft',
} as const;
complain(lang2);