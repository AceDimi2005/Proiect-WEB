
const express = require("express");
const fs = require("fs");
const path = require("path");
const pg = require("pg");
const sharp = require("sharp");
const sass = require("sass");

const app = express();
app.set("view engine", "ejs");

const obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css"),
    folderBackup: path.join(__dirname, "backup")
};

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
const MAX_IMAGINI_GALERIE = 12;
const DIMENSIUNI_GALERIE = {
    mare: {
        latime: 480,
        inaltime: 360
    },
    medie: {
        latime: 320,
        inaltime: 240
    },
    mica: {
        latime: 170,
        inaltime: 128
    }
};
const VALORI_NUMAR_IMAGINI_ANIMATE = [9, 12, 15];
const LUNI_RO = [
    "ianuarie",
    "februarie",
    "martie",
    "aprilie",
    "mai",
    "iunie",
    "iulie",
    "august",
    "septembrie",
    "octombrie",
    "noiembrie",
    "decembrie"
];
const CALE_JSON_GALERIE = path.join(__dirname, "resurse", "json", "galerie-statica.json");
const CALE_SCSS_GALERIE_ANIMATA = path.join(__dirname, "resurse", "scss", "galerie-animata.scss");

for (const numeFolder of vect_foldere) {
    const caleFolder = path.join(__dirname, numeFolder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, { recursive: true });
    }
}

function initErori() {
    const continutFisier = fs.readFileSync(path.join(__dirname, "erori.json"), "utf-8");
    obGlobal.obErori = JSON.parse(continutFisier);

    if (obGlobal.obErori.eroare_default && obGlobal.obErori.eroare_default.imagine) {
        obGlobal.obErori.eroare_default.imagine = path.join(
            __dirname,
            obGlobal.obErori.cale_baza,
            obGlobal.obErori.eroare_default.imagine
        );
    }

    for (const eroare of obGlobal.obErori.info_erori) {
        eroare.imagine = path.join(__dirname, obGlobal.obErori.cale_baza, eroare.imagine);
    }
}

initErori();

function compileazaScss(caleScss, caleCss) {
    try {
        if (path.basename(caleScss) === "galerie-animata.scss") {
            return; // E sablon procesat de express, se va prabusi daca il compileaza sass() direct.
        }

        let scssAbsolut = path.isAbsolute(caleScss) ? caleScss : path.join(obGlobal.folderScss, caleScss);

        let numeCss = caleCss;
        if (!numeCss) {
            numeCss = path.basename(caleScss, path.extname(caleScss)) + ".css";
        }
        let cssAbsolut = path.isAbsolute(numeCss) ? numeCss : path.join(obGlobal.folderCss, numeCss);

        if (fs.existsSync(cssAbsolut)) {
            try {
                const subfolderBackupCss = path.join(obGlobal.folderBackup, "resurse", "css");
                if (!fs.existsSync(subfolderBackupCss)) {
                    fs.mkdirSync(subfolderBackupCss, { recursive: true });
                }
                const numeBackup = `backup_${Date.now()}_${path.basename(cssAbsolut)}`;
                const caleBackup = path.join(subfolderBackupCss, numeBackup);
                fs.copyFileSync(cssAbsolut, caleBackup);
            } catch (errBackup) {
                console.error("Eroare la salvare backup css:", errBackup.message);
            }
        }

        const rezultat = sass.compile(scssAbsolut, {
            style: "expanded",
            loadPaths: [path.join(__dirname, "node_modules")],
            quietDeps: true
        });

        const directorCss = path.dirname(cssAbsolut);
        if (!fs.existsSync(directorCss)) {
            fs.mkdirSync(directorCss, { recursive: true });
        }
        fs.writeFileSync(cssAbsolut, rezultat.css);
    } catch (err) {
        console.error(`Eroare la compilarea SCSS [${caleScss}]:`, err.message);
    }
}

function initCompilareScss() {
    if (fs.existsSync(obGlobal.folderScss)) {
        const fisiere = fs.readdirSync(obGlobal.folderScss);
        for (const fisier of fisiere) {
            if (path.extname(fisier) === ".scss") {
                compileazaScss(fisier);
            }
        }

        fs.watch(obGlobal.folderScss, (eventType, filename) => {
            if (filename && path.extname(filename) === ".scss") {
                const caleS = path.join(obGlobal.folderScss, filename);
                if (fs.existsSync(caleS)) {
                    compileazaScss(filename);
                }
            }
        });
    }
}

initCompilareScss();

function normalizeazaTextRomanesc(text) {
    if (typeof text !== "string") {
        return "";
    }

    return text
        .toLowerCase()
        .trim()
        .replace(/[ăâ]/g, "a")
        .replace(/[î]/g, "i")
        .replace(/[șş]/g, "s")
        .replace(/[țţ]/g, "t");
}

function obtineLunaCurentaRo(dataCurenta = new Date()) {
    return LUNI_RO[dataCurenta.getMonth()];
}

function calculeazaNumarImaginiAfisate(nrImaginiDisponibile) {
    const nrLimitat = Math.min(Math.max(0, nrImaginiDisponibile), MAX_IMAGINI_GALERIE);
    return nrLimitat - (nrLimitat % 2);
}

function construiesteCeluleGalerie(imagini) {
    // Restore checkerboard pattern: 6 images interleaved with 6 empty cells (12 total)
    const celule = [];
    const NUMAR_IMAGINI_DORIT = 6;
    const NUMAR_TOTAL_CELULE = 12; // 3 x 4 grid

    const imaginiLimitate = Array.isArray(imagini) ? imagini.slice(0, NUMAR_IMAGINI_DORIT) : [];

    imaginiLimitate.forEach(function(imagine) {
        celule.push({ tip: "imagine", imagine });
        celule.push({ tip: "gol" });
    });

    // If we had fewer than 6 images, fill remaining cells with empties to reach 12
    while (celule.length < NUMAR_TOTAL_CELULE) {
        celule.push({ tip: "gol" });
    }

    // Ensure exactly 12 cells
    return celule.slice(0, NUMAR_TOTAL_CELULE);
}

function alegeElementAleator(elemente) {
    if (!Array.isArray(elemente) || elemente.length === 0) {
        return null;
    }

    const indexAleator = Math.floor(Math.random() * elemente.length);
    return elemente[indexAleator];
}

function construiesteTraseuGalerieAnimata(numarImagini) {
    if (!Number.isInteger(numarImagini) || numarImagini <= 0 || numarImagini % 3 !== 0) {
        return [];
    }

    const numarRanduri = numarImagini / 3;
    if (numarRanduri < 3) {
        return [];
    }

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

function construiesteCeluleGalerieAnimata(imagini, traseu) {
    const numarImagini = imagini.length;
    const celule = Array.from({ length: numarImagini }, function() {
        return null;
    });

    traseu.forEach(function(pozitie, indexImagine) {
        const indexCelula = pozitie.rand * 3 + pozitie.coloana;
        if (indexCelula >= 0 && indexCelula < celule.length) {
            celule[indexCelula] = imagini[indexImagine];
        }
    });

    return celule.map(function(imagine, indexCelula) {
        return {
            indexCelula: indexCelula + 1,
            imagine
        };
    });
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

function formateazaNumarProcent(numar) {
    const limitat = Math.min(100, Math.max(0, numar));
    return Number(limitat.toFixed(4)).toString();
}

function genereazaCadreCheieGalerieAnimata(traseu) {
    const numarImagini = traseu.length;
    const numarRanduri = numarImagini / 3;
    const pas = 100 / numarImagini;
    const cadre = [];

    for (let indexImagine = 0; indexImagine < numarImagini; indexImagine++) {
        const pozitieCurenta = traseu[indexImagine];
        const pozitieUrmatoare = indexImagine < numarImagini - 1 ? traseu[indexImagine + 1] : pozitieCurenta;
        const start = indexImagine * pas;
        const rotatie1 = start + pas * 0.34;
        const rotatie2 = start + pas * 0.58;
        const rotatie3 = start + pas * 0.78;
        const finalPas = (indexImagine + 1) * pas;

        cadre.push({ procent: start, pozitie: pozitieCurenta, unghi: 0 });
        cadre.push({ procent: rotatie1, pozitie: pozitieCurenta, unghi: 8 });
        cadre.push({ procent: rotatie2, pozitie: pozitieCurenta, unghi: -8 });
        cadre.push({ procent: rotatie3, pozitie: pozitieCurenta, unghi: 0 });
        cadre.push({ procent: finalPas, pozitie: pozitieUrmatoare, unghi: 0 });
    }

    cadre.push({
        procent: 100,
        pozitie: traseu[traseu.length - 1],
        unghi: 0
    });

    const cadreUnice = new Map();
    cadre
        .sort(function(cadruA, cadruB) {
            return cadruA.procent - cadruB.procent;
        })
        .forEach(function(cadru) {
            cadreUnice.set(formateazaNumarProcent(cadru.procent), cadru);
        });

    return Array.from(cadreUnice.entries())
        .map(function([procent, cadru]) {
            const deplasare = calculeazaDeplasareProcentuala(cadru.pozitie, numarRanduri);
            const origine = calculeazaOrigineProcentuala(cadru.pozitie, numarRanduri);

            return (
                `    ${procent}% { ` +
                `transform-origin: ${formateazaNumarProcent(origine.x)}% ${formateazaNumarProcent(origine.y)}%; ` +
                `transform: translate(-${formateazaNumarProcent(deplasare.x)}%, -${formateazaNumarProcent(deplasare.y)}%) ` +
                `rotate(${cadru.unghi}deg); }`
            );
        })
        .join("\n");
}

function genereazaCssGalerieAnimata(numarImagini, traseu) {
    const numarRanduri = numarImagini / 3;
    const durataSecunde = Number((numarImagini * 1.55).toFixed(2));
    let cadreCheie = genereazaCadreCheieGalerieAnimata(traseu);
    if (!cadreCheie || String(cadreCheie).trim() === "") {
        // Fallback simplu pentru a evita eroarea de parsare SCSS când nu există cadre generate
        cadreCheie = "0% { transform: translateX(0); } 100% { transform: translateX(-100%); }";
    }

    const sursaScss = fs.readFileSync(CALE_SCSS_GALERIE_ANIMATA, "utf-8");
    const scssProcesat = sursaScss
        .replace(/__NUMAR_RANDURI__/g, String(numarRanduri))
        .replace(/__NUMAR_IMAGINI__/g, String(numarImagini))
        .replace(/__DURATA_SECUNDE__/g, String(durataSecunde))
        .replace("__KEYFRAMES__", cadreCheie);

    return sass.compileString(scssProcesat, { style: "expanded", quietDeps: true }).css;
}

function selecteazaPrimeleImaginiDistincte(imagini) {
    const imaginiDistincte = [];
    const fisiereVazute = new Set();

    imagini.forEach(function(imagine) {
        const numeFisier = String(imagine.cale_fisier || "").trim().toLowerCase();
        if (!numeFisier || fisiereVazute.has(numeFisier)) {
            return;
        }

        fisiereVazute.add(numeFisier);
        imaginiDistincte.push(imagine);
    });

    return imaginiDistincte;
}

function citesteConfiguratieGalerie() {
    const continut = fs.readFileSync(CALE_JSON_GALERIE, "utf-8");
    return JSON.parse(continut);
}

function imagineSePotrivesteCuLuna(imagine, lunaCurenta) {
    if (!Array.isArray(imagine.luni) || imagine.luni.length === 0) {
        return true;
    }

    const luniNormalize = imagine.luni.map(function(luna) {
        return normalizeazaTextRomanesc(luna);
    });

    return luniNormalize.includes(normalizeazaTextRomanesc(lunaCurenta));
}

async function asiguraImagineRedimensionata(caleSursa, caleDestinatie, dimensiuni) {
    await fs.promises.mkdir(path.dirname(caleDestinatie), { recursive: true });

    const latime = Number(dimensiuni && dimensiuni.latime);
    const inaltime = Number(dimensiuni && dimensiuni.inaltime);

    if (!Number.isFinite(latime) || !Number.isFinite(inaltime) || latime <= 0 || inaltime <= 0) {
        throw new Error("Dimensiuni invalide pentru redimensionare galerie.");
    }

    let trebuieGenerata = true;

    if (fs.existsSync(caleDestinatie)) {
        const [statsSursa, statsDestinatie] = await Promise.all([
            fs.promises.stat(caleSursa),
            fs.promises.stat(caleDestinatie)
        ]);

        if (statsDestinatie.mtimeMs >= statsSursa.mtimeMs) {
            trebuieGenerata = false;
        }
    }

    if (!trebuieGenerata) {
        return;
    }

    await sharp(caleSursa)
        .resize(latime, inaltime, {
            fit: "cover",
            position: "centre"
        })
        .webp({ quality: 86 })
        .toFile(caleDestinatie);
}

async function pregatesteImagineGalerieDinConfiguratie(imagine, caleGalerieAbsoluta) {
    const numeFisier = String(imagine.cale_fisier || "").trim();
    if (!numeFisier) {
        return null;
    }

    const caleSursaAbsoluta = path.normalize(path.join(caleGalerieAbsoluta, numeFisier));

    if (!caleSursaAbsoluta.startsWith(caleGalerieAbsoluta)) {
        return null;
    }

    if (!fs.existsSync(caleSursaAbsoluta)) {
        return null;
    }

    const numeBaza = path.parse(numeFisier).name;
    const titluImplicit = numeBaza.replace(/[-_]+/g, " ").trim();

    const caleImagineMareAbsoluta = path.join(caleGalerieAbsoluta, "mare", `${numeBaza}.webp`);
    const caleImagineMedieAbsoluta = path.join(caleGalerieAbsoluta, "mediu", `${numeBaza}.webp`);
    const caleImagineMicaAbsoluta = path.join(caleGalerieAbsoluta, "mic", `${numeBaza}.webp`);

    await Promise.all([
        asiguraImagineRedimensionata(caleSursaAbsoluta, caleImagineMareAbsoluta, DIMENSIUNI_GALERIE.mare),
        asiguraImagineRedimensionata(caleSursaAbsoluta, caleImagineMedieAbsoluta, DIMENSIUNI_GALERIE.medie),
        asiguraImagineRedimensionata(caleSursaAbsoluta, caleImagineMicaAbsoluta, DIMENSIUNI_GALERIE.mica)
    ]);

    return {
        titlu: typeof imagine.titlu === "string" && imagine.titlu.trim() ? imagine.titlu.trim() : titluImplicit,
        text_descriere:
            typeof imagine.text_descriere === "string" && imagine.text_descriere.trim()
                ? imagine.text_descriere.trim()
                : titluImplicit,
        alt:
            typeof imagine.alt === "string" && imagine.alt.trim()
                ? imagine.alt.trim()
                : titluImplicit,
        autor:
            typeof imagine.autor === "string" && imagine.autor.trim()
                ? imagine.autor.trim()
                : "",
        licenta:
            typeof imagine.licenta === "string" && imagine.licenta.trim()
                ? imagine.licenta.trim()
                : "",
        sursa:
            typeof imagine.sursa === "string" && imagine.sursa.trim()
                ? imagine.sursa.trim()
                : "",
        credit:
            typeof imagine.credit === "string" && imagine.credit.trim()
                ? imagine.credit.trim()
                : "",
        cale_mare: caleImaginePentruClient(caleImagineMareAbsoluta),
        cale_medie: caleImaginePentruClient(caleImagineMedieAbsoluta),
        cale_mica: caleImaginePentruClient(caleImagineMicaAbsoluta)
    };
}

async function obtineDateGalerieStatica() {
    const configuratieGalerie = citesteConfiguratieGalerie();
    const caleGalerieRelativa = String(configuratieGalerie.cale_galerie || "resurse/imagini/poze")
        .replace(/^\/+/, "");
    const caleGalerieAbsoluta = path.join(__dirname, caleGalerieRelativa);
    const lunaCurenta = obtineLunaCurentaRo();

    const imaginiConfigurate = Array.isArray(configuratieGalerie.imagini)
        ? configuratieGalerie.imagini
        : [];

    const imaginiFiltrate = imaginiConfigurate.filter(function(imagine) {
        return imagineSePotrivesteCuLuna(imagine, lunaCurenta);
    });

    const numarImaginiAfisate = calculeazaNumarImaginiAfisate(imaginiFiltrate.length);
    const imaginiSelectate = imaginiFiltrate.slice(0, numarImaginiAfisate);

    const imaginiPregatite = await Promise.all(imaginiSelectate.map(function(imagine) {
        return pregatesteImagineGalerieDinConfiguratie(imagine, caleGalerieAbsoluta);
    }));

    const imaginiFinale = imaginiPregatite.filter(function(imagine) {
        return imagine !== null;
    });

    return {
        lunaCurenta,
        imagini: imaginiFinale,
        celule: construiesteCeluleGalerie(imaginiFinale)
    };
}

async function obtineDateGalerieAnimata() {
    const configuratieGalerie = citesteConfiguratieGalerie();
    const caleGalerieRelativa = String(configuratieGalerie.cale_galerie || "resurse/imagini/poze")
        .replace(/^\/+/, "");
    const caleGalerieAbsoluta = path.join(__dirname, caleGalerieRelativa);

    const imaginiConfigurate = Array.isArray(configuratieGalerie.imagini)
        ? configuratieGalerie.imagini
        : [];

    const imaginiPentruAnimatie = imaginiConfigurate.filter(function(imagine) {
        return imagine["galerie-animata"] === true;
    });

    const imaginiDistincte = selecteazaPrimeleImaginiDistincte(imaginiPentruAnimatie);
    const valoriPosibile = VALORI_NUMAR_IMAGINI_ANIMATE.filter(function(numar) {
        return numar <= imaginiDistincte.length;
    });

    const numarImaginiCerut = alegeElementAleator(valoriPosibile);
    if (!numarImaginiCerut) {
        return {
            numarImagini: 0,
            celule: [],
            css: ""
        };
    }

    const imaginiSelectate = imaginiDistincte.slice(0, numarImaginiCerut);
    const imaginiPregatite = await Promise.all(imaginiSelectate.map(function(imagine) {
        return pregatesteImagineGalerieDinConfiguratie(imagine, caleGalerieAbsoluta);
    }));

    const imaginiFinale = imaginiPregatite.filter(function(imagine) {
        return imagine !== null;
    });

    const valoriPosibileDupaFiltrare = VALORI_NUMAR_IMAGINI_ANIMATE.filter(function(numar) {
        return numar <= imaginiFinale.length;
    });

    const numarImaginiFinal = valoriPosibileDupaFiltrare.length > 0
        ? valoriPosibileDupaFiltrare[valoriPosibileDupaFiltrare.length - 1]
        : 0;

    if (!numarImaginiFinal) {
        return {
            numarImagini: 0,
            celule: [],
            css: ""
        };
    }

    const imaginiAlese = imaginiFinale.slice(0, numarImaginiFinal);
    const traseu = construiesteTraseuGalerieAnimata(numarImaginiFinal);
    const celule = construiesteCeluleGalerieAnimata(imaginiAlese, traseu);
    const css = genereazaCssGalerieAnimata(numarImaginiFinal, traseu);

    return {
        numarImagini: numarImaginiFinal,
        celule,
        css
    };
}

async function obtineDateGalerieDinInternet() {
    const caleFisier = path.join(__dirname, "resurse", "json", "galerie-dinamica.json");
    if (!fs.existsSync(caleFisier)) {
        return { numarImagini: 0, celule: [], css: "" };
    }

    const continut = fs.readFileSync(caleFisier, "utf-8");
    const configuratie = JSON.parse(continut);
    const lista = Array.isArray(configuratie.imagini) ? configuratie.imagini : [];

    const imaginiProcesate = lista.map(function(item) {
        const url = String(item.url || "").trim();
        if (!url) return null;

        // Use the same external URL for all sizes; picsum supports resizing via path
        const caleMare = url;
        const caleMedie = url.replace(/\/1200\//, "/800/").replace(/\/1200\//, "/800/");
        const caleMica = url.replace(/\/1200\//, "/400/").replace(/\/1200\//, "/400/");

        return {
            titlu: item.titlu || "",
            text_descriere: item.text_descriere || item.titlu || "",
            alt: item.alt || item.titlu || "",
            autor: item.autor || "",
            licenta: item.licenta || "",
            sursa: item.sursa || "",
            credit: item.credit || "",
            cale_mare: caleMare,
            cale_medie: caleMedie,
            cale_mica: caleMica
        };
    }).filter(Boolean);

    const imaginiDistincte = selecteazaPrimeleImaginiDistincte(imaginiProcesate);
    const valoriPosibile = VALORI_NUMAR_IMAGINI_ANIMATE.filter(function(numar) {
        return numar <= imaginiDistincte.length;
    });

    const numarImaginiCerut = alegeElementAleator(valoriPosibile);
    if (!numarImaginiCerut) {
        return { numarImagini: 0, celule: [], css: "" };
    }

    const imaginiAlese = imaginiDistincte.slice(0, numarImaginiCerut);
    const traseu = construiesteTraseuGalerieAnimata(numarImaginiCerut);
    const celule = construiesteCeluleGalerieAnimata(imaginiAlese, traseu);
    const css = genereazaCssGalerieAnimata(numarImaginiCerut, traseu);

    return {
        numarImagini: numarImaginiCerut,
        celule,
        css
    };
}

function caleImaginePentruClient(caleImagine) {
    if (!caleImagine) {
        return "";
    }

    if (path.isAbsolute(caleImagine)) {
        const caleRelativa = path.relative(__dirname, caleImagine).split(path.sep).join("/");
        return "/" + caleRelativa;
    }

    return caleImagine.startsWith("/") ? caleImagine : "/" + caleImagine.replace(/\\/g, "/");
}

function afisareEroare(res, identificator, titlu, text, imagine) {
    let eroareJson = null;

    if (identificator !== undefined && obGlobal.obErori && Array.isArray(obGlobal.obErori.info_erori)) {
        eroareJson = obGlobal.obErori.info_erori.find((err) => err.identificator === identificator);
    }

    const eroareBaza = eroareJson || (obGlobal.obErori ? obGlobal.obErori.eroare_default : null) || {
        titlu: "Eroare",
        text: "A aparut o eroare.",
        imagine: ""
    };

    const titluFinal = titlu !== undefined ? titlu : eroareBaza.titlu;
    const textFinal = text !== undefined ? text : eroareBaza.text;
    const imagineSursa = imagine !== undefined ? imagine : eroareBaza.imagine;
    const imagineFinala = caleImaginePentruClient(imagineSursa);
    const statusFinal = eroareJson && eroareJson.status ? eroareJson.identificator : 200;

    res.status(statusFinal).render("pagini/eroare", {
        titlu: titluFinal,
        text: textFinal,
        imagine: imagineFinala
    });
}

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

app.use(function(req, res, next) {
    const esteCerereFisierEjs = /\.ejs(?:\/|$)/i.test(req.path);

    if (esteCerereFisierEjs) {
        afisareEroare(res, 400);
        return;
    }

    next();
});


app.use("/resurse", function(req, res, next) {
    const caleBazaResurse = path.join(__dirname, "resurse");
    const caleCeruta = path.normalize(path.join(caleBazaResurse, req.path));

    if (!caleCeruta.startsWith(caleBazaResurse)) {
        afisareEroare(res, 403);
        return;
    }

    if (fs.existsSync(caleCeruta)) {
        const statistici = fs.statSync(caleCeruta);
        if (statistici.isDirectory()) {
            afisareEroare(res, 403);
            return;
        }
    }

    next();
});

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.use(function(req, res, next) {
    res.locals.ipUtilizator = req.ip;
    next();
});

app.get(["/", "/index", "/home"], async function(req, res) {
    try {
        const dateGalerie = await obtineDateGalerieStatica();

        res.render("pagini/index", {
            ipUtilizator: req.ip,
            imaginiGalerie: dateGalerie.imagini,
            celuleGalerie: dateGalerie.celule,
            lunaGalerie: dateGalerie.lunaCurenta
        });
    }
    catch (eroareGalerie) {
        console.error("Eroare la generarea galeriei pentru pagina principala:", eroareGalerie.message);
        afisareEroare(res, 500);
    }
});

app.get("/despre", function(req, res) {
    res.render("pagini/despre");
});

app.get("/produse", function(req, res) {
    res.send("<h1>Produse</h1><p>Pagina de produse va fi adaugata in curand.</p>");
});

app.get("/cos", function(req, res) {
    res.send("<h1>Cos</h1><p>Pagina de cos va fi adaugata in curand.</p>");
});

app.get("/galerie-statica", async function(req, res) {
    try {
        const dateGalerie = await obtineDateGalerieStatica();
        const dateGalerieAnimata = await obtineDateGalerieAnimata();

        // Allow forcing the animation to be visible for debugging with ?anim=force
        let cssAnim = dateGalerieAnimata.css || "";
        if (String(req.query.anim || "").toLowerCase() === "force") {
            cssAnim += "\n/* DEBUG OVERRIDE: force show and run animation */\n";
            cssAnim += "#galerie-animata{display:block !important;}\n";
            cssAnim += "#galerie-animata .pista-galerie-animata{animation-play-state:running !important; animation: traseu-galerie-animata 12s linear infinite alternate !important;}\n";
            cssAnim += "#galerie-animata .fereastra-galerie-animata{display:block !important;}\n";
        }

        res.render("pagini/galerie-statica", {
            imaginiGalerie: dateGalerie.imagini,
            celuleGalerie: dateGalerie.celule,
            lunaGalerie: dateGalerie.lunaCurenta,
            numarImaginiAnimata: dateGalerieAnimata.numarImagini,
            celuleGalerieAnimata: dateGalerieAnimata.celule,
            cssGalerieAnimata: cssAnim
        });
    }
    catch (eroareGalerie) {
        console.error("Eroare la generarea paginii galerie statica:", eroareGalerie.message);
        afisareEroare(res, 500);
    }
});

app.get("/galerie-dinamica", async function(req, res) {
    try {
        const dateGalerieAnimata = await obtineDateGalerieAnimata();

        res.render("pagini/galerie-dinamica", {
            numarImaginiAnimata: dateGalerieAnimata.numarImagini,
            celuleGalerieAnimata: dateGalerieAnimata.celule,
            cssGalerieAnimata: dateGalerieAnimata.css
        });
    }
    catch (eroareGalerieAnimata) {
        console.error("Eroare la generarea paginii galerie dinamica:", eroareGalerieAnimata.message);
        afisareEroare(res, 500);
    }
});

app.get("/contact", function(req, res) {
    res.send("<h1>Contact</h1><p>Pagina de contact va fi adaugata in curand.</p>");
});

app.get("/cale/:a/:b", function(req, res) {
    res.send(parseInt(req.params.a) + parseInt(req.params.b) + "");
});



app.get("/cale2", function(req, res) {
    res.sendFile(path.join(__dirname, "cale2.html"));
    console.log("Am primit o cerere GET pe /cale2");
});

app.get("/favicon.ico", function(req, res) {
    res.sendFile(path.join(__dirname, "resurse", "imagini", "favicon", "favicon.ico"));
});

app.get(/.*/, function(req, res) {
    const pagina = req.path.substring(1);
    const calePagina = path.join("pagini", pagina).replace(/\\/g, "/");

    res.render(calePagina, function(eroare, rezultatRandare) {
        if (eroare) {
            if (eroare.message && eroare.message.startsWith("Failed to lookup view")) {
                afisareEroare(res, 404);
                return;
            }

            afisareEroare(res, 500);
            return;
        }

        res.send(rezultatRandare);
    });
});

const port = Number(process.env.PORT) || 8080;
app.listen(port);
console.log(`Serverul a pornit pe portul ${port}!`);


const client = new pg.Client({
    database: "proiect",
    user: "postgres",
    password: "postgres",
    host: "localhost",
    port: 5432
});

client.connect().catch(function(eroareConexiune) {
    console.error("Conexiunea la baza de date a esuat:", eroareConexiune.message);
});