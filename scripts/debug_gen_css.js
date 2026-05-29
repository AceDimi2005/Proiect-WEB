const fs = require('fs');
const path = require('path');
const sass = require('sass');

const CALE_JSON = path.join(__dirname, '..', 'resurse', 'json', 'galerie-statica.json');
const CALE_SCSS = path.join(__dirname, '..', 'resurse', 'scss', 'galerie-animata.scss');

function formateazaNumarProcent(numar) {
    const limitat = Math.min(100, Math.max(0, numar));
    return Number(limitat.toFixed(4)).toString();
}

function calculeazaDeplasareProcentuala(pozitie, numarRanduri) {
    return {
        x: pozitie.coloana * (100 / 3),
        y: pozitie.rand * (100 / numarRanduri)
    };
}

function calculeazaOrigineProcentuala(pozitie, numarRanduri) {
    return {
        x: (pozitie.coloana + 0.5) * (100 / 3),
        y: (pozitie.rand + 0.5) * (100 / numarRanduri)
    };
}

function estePozitiePeMargine(pozitie, numarRanduri) {
    return pozitie.rand === 0 ||
        pozitie.rand === numarRanduri - 1 ||
        pozitie.coloana === 0 ||
        pozitie.coloana === 2;
}

function construiesteTraseu(numarImagini) {
    const numarRanduri = numarImagini / 3;
    const traseu = [
        { rand: 0, coloana: 0 },
        { rand: 1, coloana: 0 },
        { rand: 1, coloana: 2 },
        { rand: 1, coloana: 1 },
        { rand: 0, coloana: 1 },
        { rand: 0, coloana: 2 },
        { rand: 2, coloana: 2 },
        { rand: 2, coloana: 0 },
        { rand: 2, coloana: 1 }
    ];

    for (let rand = 3; rand < numarRanduri; rand++) {
        const ordineColoane = (rand - 3) % 2 === 0 ? [1, 0, 2] : [2, 0, 1];
        ordineColoane.forEach(function(coloana) {
            traseu.push({ rand, coloana });
        });
    }

    return traseu.slice(0, numarImagini);
}

function genereazaCadreCheie(traseu) {
    const numarImagini = traseu.length;
    const numarRanduri = numarImagini / 3;
    const pas = 100 / numarImagini;
    const cadre = [];
    let unghiBaza = 0;

    for (let indexImagine = 0; indexImagine < numarImagini; indexImagine++) {
        const pozitieCurenta = traseu[indexImagine];
        const pozitieUrmatoare = indexImagine < numarImagini - 1 ? traseu[indexImagine + 1] : pozitieCurenta;
        const estePeMargine = estePozitiePeMargine(pozitieCurenta, numarRanduri);
        const start = indexImagine * pas;
        const finalPas = (indexImagine + 1) * pas;

        if (estePeMargine) {
            const unghiFinal = unghiBaza + 360;

            cadre.push({ procent: start, pozitie: pozitieCurenta, unghi: unghiBaza });
            cadre.push({ procent: start + pas * 0.22, pozitie: pozitieCurenta, unghi: unghiBaza + 120 });
            cadre.push({ procent: start + pas * 0.44, pozitie: pozitieCurenta, unghi: unghiBaza + 240 });
            cadre.push({ procent: start + pas * 0.66, pozitie: pozitieCurenta, unghi: unghiFinal });
            cadre.push({ procent: finalPas, pozitie: pozitieUrmatoare, unghi: unghiFinal });
            unghiBaza = unghiFinal;
        } else {
            cadre.push({ procent: start, pozitie: pozitieCurenta, unghi: unghiBaza });
            cadre.push({ procent: start + pas * 0.34, pozitie: pozitieCurenta, unghi: unghiBaza + 8 });
            cadre.push({ procent: start + pas * 0.58, pozitie: pozitieCurenta, unghi: unghiBaza - 8 });
            cadre.push({ procent: start + pas * 0.78, pozitie: pozitieCurenta, unghi: unghiBaza });
            cadre.push({ procent: finalPas, pozitie: pozitieUrmatoare, unghi: unghiBaza });
        }
    }

    const cadreUnice = new Map();
    cadre
        .sort(function(a, b) { return a.procent - b.procent; })
        .forEach(function(cadru) { cadreUnice.set(formateazaNumarProcent(cadru.procent), cadru); });

    return Array.from(cadreUnice.entries()).map(function([procent, cadru]) {
        const deplasare = calculeazaDeplasareProcentuala(cadru.pozitie, numarImagini / 3);
        const origine = calculeazaOrigineProcentuala(cadru.pozitie, numarImagini / 3);
        return (`    ${procent}% { transform-origin: ${formateazaNumarProcent(origine.x)}% ${formateazaNumarProcent(origine.y)}%; transform: translate(-${formateazaNumarProcent(deplasare.x)}%, -${formateazaNumarProcent(deplasare.y)}%) rotate(${cadru.unghi}deg); }`);
    }).join('\n');
}

function generateCssFor(numarImagini) {
    const traseu = construiesteTraseu(numarImagini);
    const cadre = genereazaCadreCheie(traseu);
    const scss = fs.readFileSync(CALE_SCSS, 'utf8');
    const processed = scss
        .replace(/__NUMAR_RANDURI__/g, String(numarImagini / 3))
        .replace(/__NUMAR_IMAGINI__/g, String(numarImagini))
        .replace(/__DURATA_SECUNDE__/g, String((numarImagini * 1.55).toFixed(2)))
        .replace('__KEYFRAMES__', cadre);

    const css = sass.compileString(processed, { style: 'expanded' }).css;
    return { css, lengte: css.length, sample: css.slice(0, 400) };
}

function main() {
    const cfg = JSON.parse(fs.readFileSync(CALE_JSON, 'utf8'));
    const imgs = Array.isArray(cfg.imagini) ? cfg.imagini.filter(i => i['galerie-animata'] === true) : [];
    console.log('found animated images:', imgs.length);
    const possible = [9,12,15].filter(n => n <= imgs.length);
    if (possible.length === 0) { console.error('no possible counts'); process.exit(1); }
    const n = possible[0];
    const out = generateCssFor(n);
    console.log('numarImagini used:', n);
    console.log('css length:', out.lengte);
    console.log('css sample:\n', out.sample);
}

main();
