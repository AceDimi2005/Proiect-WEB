const sass = require("sass");
const express = require("express");
const fs = require("fs");
const path = require("path");
const pg = require("pg");
const sharp = require("sharp");

const app = express();
app.set("view engine", "ejs");

const obGlobal = {
    obErori: null,
    folderScss: path.join(__dirname, "resurse", "scss"),
    folderCss: path.join(__dirname, "resurse", "css"),
    folderBackup: path.join(__dirname, "backup")
};

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];
const caleJsonGalerieStatica = path.join(__dirname, "resurse", "json", "galerie-statica.json");
const caleJsonOferte = path.join(__dirname, "resurse", "json", "oferte.json");
const caleScssGalerieAnimata = path.join(__dirname, "resurse", "scss", "galerie-animata.scss");
const varianteNumarImaginiAnimata = [9, 12, 15];
const intervalOfertaMs = Number(process.env.INTERVAL_OFERTA_MS) || 2 * 60 * 1000;
const intervalStergereOferteMs = Number(process.env.INTERVAL_STERGERE_OFERTE_MS) || 10 * 60 * 1000;
const valoriReduceriOferte = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const dimensiuniGalerieStatica = {
    mica: { folder: "mic", width: 200, height: 150 },
    medie: { folder: "mediu", width: 320, height: 240 },
    mare: { folder: "mare", width: 480, height: 360 }
};
const numeTipCategorieProdus = "categorie_produs";
const pool = new pg.Pool({
    database: process.env.PG_DATABASE || "proiect",
    user: process.env.PG_USER || "techforge_app",
    password: process.env.PG_PASSWORD || "techforge_app",
    host: process.env.PG_HOST || "localhost",
    port: Number(process.env.PG_PORT) || 5432,
    connectionTimeoutMillis: 1500
});
let cacheCategoriiProduse = null;
let timerGeneratorOferte = null;

for (const numeFolder of vect_foldere) {
    const caleFolder = path.join(__dirname, numeFolder);
    if (!fs.existsSync(caleFolder)) {
        fs.mkdirSync(caleFolder, { recursive: true });
    }
}


function compileazaScss(caleScss, caleCss) {
    if (!caleCss) {
        let numeFisExt = path.basename(caleScss);
        let numeFis = path.parse(numeFisExt).name;
        caleCss = numeFis + ".css";
    }

    if (!path.isAbsolute(caleScss)) {
        caleScss = path.join(obGlobal.folderScss, caleScss);
    }

    if (!path.isAbsolute(caleCss)) {
        caleCss = path.join(obGlobal.folderCss, caleCss);
    }

    let caleBackup = path.join(obGlobal.folderBackup, "resurse/css");

    if (!fs.existsSync(caleBackup)) {
        fs.mkdirSync(caleBackup, { recursive: true });
    }

    if (fs.existsSync(caleCss)) {
        let numeBackup = `${Date.now()}_${path.basename(caleCss)}`;
        fs.copyFileSync(caleCss, path.join(caleBackup, numeBackup));
    }

    let rezultat = sass.compile(caleScss, {
        loadPaths: [path.join(__dirname, "node_modules")],
        quietDeps: true,
        style: "expanded"
    });

    fs.writeFileSync(caleCss, rezultat.css);
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

function eliminaExtensie(numeFisier) {
    return numeFisier.replace(/\.[^.]+$/, "");
}

function obtineLunaCurenta() {
    return new Date().toLocaleDateString("ro-RO", { month: "long" }).toLowerCase();
}

function obtineCaiGalerieStatica(galerieJson) {
    const caleGalerieJson = typeof galerieJson.cale_galerie === "string" && galerieJson.cale_galerie.trim()
        ? galerieJson.cale_galerie.trim()
        : path.join("resurse", "imagini", "poze");
    const caleGalerieAbs = path.isAbsolute(caleGalerieJson)
        ? caleGalerieJson
        : path.join(__dirname, caleGalerieJson);

    return {
        absoluta: caleGalerieAbs
    };
}

async function genereazaVariantaGalerie(caleSursa, caleDestinatie, dimensiuni) {
    if (fs.existsSync(caleDestinatie) || !fs.existsSync(caleSursa)) {
        return;
    }

    fs.mkdirSync(path.dirname(caleDestinatie), { recursive: true });

    await sharp(caleSursa)
        .resize({
            width: dimensiuni.width,
            height: dimensiuni.height,
            fit: "cover",
            position: "attention"
        })
        .webp({ quality: 82 })
        .toFile(caleDestinatie);
}

async function pregatesteImagineGalerieStatica(imagine, caiGalerie) {
    const numeFisier = imagine.cale_fisier || "";
    const numeBaza = eliminaExtensie(numeFisier);
    const caleSursa = path.join(caiGalerie.absoluta, numeFisier);
    const caleMica = path.join(caiGalerie.absoluta, dimensiuniGalerieStatica.mica.folder, `${numeBaza}.webp`);
    const caleMedie = path.join(caiGalerie.absoluta, dimensiuniGalerieStatica.medie.folder, `${numeBaza}.webp`);
    const caleMare = path.join(caiGalerie.absoluta, dimensiuniGalerieStatica.mare.folder, `${numeBaza}.webp`);

    try {
        await Promise.all([
            genereazaVariantaGalerie(caleSursa, caleMica, dimensiuniGalerieStatica.mica),
            genereazaVariantaGalerie(caleSursa, caleMedie, dimensiuniGalerieStatica.medie),
            genereazaVariantaGalerie(caleSursa, caleMare, dimensiuniGalerieStatica.mare)
        ]);
    } catch (eroare) {
        console.error(`Nu am putut genera variantele pentru ${numeFisier}:`, eroare.message);
    }

    return {
        titlu: imagine.titlu || "Imagine galerie",
        alt: imagine.alt || "Imagine din galeria TechForge",
        text_descriere: imagine.text_descriere || "",
        autor: imagine.autor || "",
        credit: imagine.credit || "",
        licenta: imagine.licenta || "",
        sursa: imagine.sursa || "",
        cale_mica: caleImaginePentruClient(caleMica),
        cale_medie: caleImaginePentruClient(caleMedie),
        cale_mare: caleImaginePentruClient(caleMare)
    };
}

async function obtineDateGalerieStatica() {
    const lunaGalerie = obtineLunaCurenta();

    try {
        const continutJson = fs.readFileSync(caleJsonGalerieStatica, "utf-8");
        const galerieJson = JSON.parse(continutJson);
        const imaginiJson = Array.isArray(galerieJson.imagini) ? galerieJson.imagini : [];
        const caiGalerie = obtineCaiGalerieStatica(galerieJson);

        const maxImaginiAfisare = 12;
        const imaginiDeAfisatJson = imaginiJson
            .filter(function(imagine) {
                return Array.isArray(imagine.luni) && imagine.luni.includes(lunaGalerie);
            })
            .slice(0, maxImaginiAfisare);

        const imaginiDeAfisat = await Promise.all(
            imaginiDeAfisatJson.map(function(imagine) {
                return pregatesteImagineGalerieStatica(imagine, caiGalerie);
            })
        );

        
        let randuri = 2; 
        while (Math.ceil((randuri * 3) / 2) < imaginiDeAfisat.length) {
            randuri += 2;
        }

        const celuleGalerie = [];
        let indexImagine = 0;

        for (let r = 0; r < randuri; r++) {
            for (let c = 0; c < 3; c++) {
                if (((r + c) % 2 === 0) && indexImagine < imaginiDeAfisat.length) {
                    celuleGalerie.push({ tip: "imagine", imagine: imaginiDeAfisat[indexImagine] });
                    indexImagine++;
                } else {
                    celuleGalerie.push({ tip: "gol" });
                }
            }
        }

        return {
            lunaGalerie,
            imaginiGalerie: imaginiDeAfisat,
            celuleGalerie
        };
    } catch (eroare) {
        console.error("Nu am putut incarca galeria statica:", eroare.message);
        return {
            lunaGalerie,
            imaginiGalerie: [],
            celuleGalerie: []
        };
    }
}

function alegeElementAleator(elemente) {
    if (!Array.isArray(elemente) || elemente.length === 0) {
        return null;
    }

    return elemente[Math.floor(Math.random() * elemente.length)];
}

function selecteazaImaginiDistinctePentruAnimatie(imaginiJson, caiGalerie) {
    const imaginiDistincte = [];
    const fisiereVazute = new Set();

    for (const imagine of imaginiJson) {
        if (!imagine || imagine["galerie-animata"] !== true) {
            continue;
        }

        const numeFisier = String(imagine.cale_fisier || "").trim();
        const cheieFisier = numeFisier.toLowerCase();
        const caleFisier = path.join(caiGalerie.absoluta, numeFisier);

        if (!numeFisier || fisiereVazute.has(cheieFisier) || !fs.existsSync(caleFisier)) {
            continue;
        }

        fisiereVazute.add(cheieFisier);
        imaginiDistincte.push(imagine);
    }

    return imaginiDistincte;
}

function construiesteTraseuGalerieAnimata(numarImagini) {
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

        for (const coloana of ordineColoane) {
            traseu.push({ rand, coloana });
        }
    }

    return traseu.slice(0, numarImagini);
}

function construiesteCeluleGalerieAnimata(imagini, traseu) {
    const celule = Array.from({ length: imagini.length }, function() {
        return { tip: "gol" };
    });

    traseu.forEach(function(pozitie, indexImagine) {
        const indexCelula = pozitie.rand * 3 + pozitie.coloana;

        if (indexCelula >= 0 && indexCelula < celule.length) {
            celule[indexCelula] = {
                tip: "imagine",
                imagine: imagini[indexImagine]
            };
        }
    });

    return celule;
}

function formateazaProcent(numar) {
    const numarLimitat = Math.min(100, Math.max(0, numar));

    return Number(numarLimitat.toFixed(4)).toString();
}

function calculeazaDeplasareGalerieAnimata(pozitie, numarRanduri) {
    return {
        x: pozitie.coloana * (100 / 3),
        y: pozitie.rand * (100 / numarRanduri)
    };
}

function calculeazaOrigineGalerieAnimata(pozitie, numarRanduri) {
    return {
        x: (pozitie.coloana + 0.5) * (100 / 3),
        y: (pozitie.rand + 0.5) * (100 / numarRanduri)
    };
}

function estePozitieMargineGalerieAnimata(pozitie, numarRanduri) {
    return pozitie.rand === 0 ||
        pozitie.rand === numarRanduri - 1 ||
        pozitie.coloana === 0 ||
        pozitie.coloana === 2;
}

function genereazaKeyframesGalerieAnimata(traseu) {
    const numarImagini = traseu.length;
    const numarRanduri = numarImagini / 3;
    const pas = 100 / numarImagini;
    const cadre = [];
    let unghiBaza = 0;

    for (let indexImagine = 0; indexImagine < numarImagini; indexImagine++) {
        const pozitieCurenta = traseu[indexImagine];
        const pozitieUrmatoare = indexImagine < numarImagini - 1 ? traseu[indexImagine + 1] : pozitieCurenta;
        const estePeMargine = estePozitieMargineGalerieAnimata(pozitieCurenta, numarRanduri);
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
        .sort(function(cadruA, cadruB) {
            return cadruA.procent - cadruB.procent;
        })
        .forEach(function(cadru) {
            cadreUnice.set(formateazaProcent(cadru.procent), cadru);
        });

    return Array.from(cadreUnice.entries()).map(function([procent, cadru]) {
        const deplasare = calculeazaDeplasareGalerieAnimata(cadru.pozitie, numarRanduri);
        const origine = calculeazaOrigineGalerieAnimata(cadru.pozitie, numarRanduri);

        return (
            `    ${procent}% { ` +
            `transform-origin: ${formateazaProcent(origine.x)}% ${formateazaProcent(origine.y)}%; ` +
            `transform: translate(-${formateazaProcent(deplasare.x)}%, -${formateazaProcent(deplasare.y)}%) ` +
            `rotate(${cadru.unghi}deg); }`
        );
    }).join("\n");
}

function genereazaCssGalerieAnimata(numarImagini, traseu) {
    const sursaScss = fs.readFileSync(caleScssGalerieAnimata, "utf-8");
    const numarRanduri = numarImagini / 3;
    const durataSecunde = Number((numarImagini * 1.55).toFixed(2));
    const scssProcesat = sursaScss
        .replace(/__NUMAR_RANDURI__/g, String(numarRanduri))
        .replace(/__NUMAR_IMAGINI__/g, String(numarImagini))
        .replace(/__DURATA_SECUNDE__/g, String(durataSecunde))
        .replace("__KEYFRAMES__", genereazaKeyframesGalerieAnimata(traseu));

    return sass.compileString(scssProcesat, {
        loadPaths: [path.join(__dirname, "node_modules")],
        quietDeps: true,
        style: "expanded"
    }).css;
}

async function obtineDateGalerieAnimata() {
    try {
        const continutJson = fs.readFileSync(caleJsonGalerieStatica, "utf-8");
        const galerieJson = JSON.parse(continutJson);
        const imaginiJson = Array.isArray(galerieJson.imagini) ? galerieJson.imagini : [];
        const caiGalerie = obtineCaiGalerieStatica(galerieJson);
        const imaginiAnimataJson = selecteazaImaginiDistinctePentruAnimatie(imaginiJson, caiGalerie);
        const varianteDisponibile = varianteNumarImaginiAnimata.filter(function(numarImagini) {
            return numarImagini <= imaginiAnimataJson.length;
        });
        const numarImagini = alegeElementAleator(varianteDisponibile);

        if (!numarImagini) {
            return {
                numarImagini: 0,
                celuleGalerieAnimata: [],
                cssGalerieAnimata: ""
            };
        }

        const imaginiSelectateJson = imaginiAnimataJson.slice(0, numarImagini);
        const imaginiPregatite = await Promise.all(
            imaginiSelectateJson.map(function(imagine) {
                return pregatesteImagineGalerieStatica(imagine, caiGalerie);
            })
        );
        const traseu = construiesteTraseuGalerieAnimata(numarImagini);

        return {
            numarImagini,
            celuleGalerieAnimata: construiesteCeluleGalerieAnimata(imaginiPregatite, traseu),
            cssGalerieAnimata: genereazaCssGalerieAnimata(numarImagini, traseu)
        };
    } catch (eroare) {
        console.error("Nu am putut incarca galeria animata:", eroare.message);

        return {
            numarImagini: 0,
            celuleGalerieAnimata: [],
            cssGalerieAnimata: ""
        };
    }
}

function caleImaginePentruClient(caleImagine) {
    if (!caleImagine) {
        return "";
    }

    if (/^(https?:)?\/\//i.test(caleImagine) || caleImagine.startsWith("/resurse/")) {
        return caleImagine;
    }

    if (path.isAbsolute(caleImagine)) {
        const caleRelativa = path.relative(__dirname, caleImagine);

        if (!caleRelativa.startsWith("..") && !path.isAbsolute(caleRelativa)) {
            return "/" + caleRelativa.split(path.sep).join("/");
        }

        return caleImagine.replace(/\\/g, "/");
    }

    return caleImagine.startsWith("/") ? caleImagine : "/" + caleImagine.replace(/\\/g, "/");
}

function capitalizeaza(text) {
    const textCurat = String(text || "").trim();

    if (!textCurat) {
        return "";
    }

    return textCurat.charAt(0).toUpperCase() + textCurat.slice(1);
}

function etichetaDinValoare(valoare) {
    return String(valoare || "")
        .split(/[_-]+/)
        .filter(Boolean)
        .map(capitalizeaza)
        .join(" ");
}

function titluCategorieProdus(valoare) {
    const etichete = {
        pc_gaming: "PC-uri gaming",
        pc_birou: "PC-uri birou",
        pc_workstation: "PC-uri workstation",
        laptop_gaming: "Laptopuri gaming",
        laptop_business: "Laptopuri business"
    };

    return etichete[valoare] || etichetaDinValoare(valoare);
}

function slugifica(valoare) {
    return String(valoare || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function obtineDataValida(data) {
    const dataFinala = data instanceof Date ? data : new Date(data);

    return Number.isNaN(dataFinala.getTime()) ? null : dataFinala;
}

function formateazaDataIso(data) {
    const dataFinala = obtineDataValida(data);

    if (!dataFinala) {
        return "";
    }

    const luna = String(dataFinala.getMonth() + 1).padStart(2, "0");
    const zi = String(dataFinala.getDate()).padStart(2, "0");

    return `${dataFinala.getFullYear()}-${luna}-${zi}`;
}

function formateazaDataRomana(data) {
    const dataFinala = obtineDataValida(data);

    if (!dataFinala) {
        return "";
    }

    const ziSaptamana = dataFinala.toLocaleDateString("ro-RO", { weekday: "long" });
    const luna = dataFinala.toLocaleDateString("ro-RO", { month: "long" });

    return `${dataFinala.getDate()}(${capitalizeaza(ziSaptamana)})/${capitalizeaza(luna)}/${dataFinala.getFullYear()}`;
}

function extrageValoriMultiple(valoare) {
    return String(valoare || "")
        .split(",")
        .map(function(element) {
            return element.trim();
        })
        .filter(Boolean);
}

function comparaDupaEticheta(a, b) {
    return a.eticheta.localeCompare(b.eticheta, "ro-RO");
}

function valoriUniceCuEticheta(produse, proprietate) {
    const valori = new Map();

    produse.forEach(function(produs) {
        const valoare = produs[proprietate];

        if (valoare && !valori.has(valoare)) {
            valori.set(valoare, {
                valoare,
                eticheta: produs[`${proprietate}Label`] || etichetaDinValoare(valoare)
            });
        }
    });

    return Array.from(valori.values()).sort(comparaDupaEticheta);
}

async function obtineCategoriiProduse() {
    if (cacheCategoriiProduse) {
        return cacheCategoriiProduse;
    }

    const rezultat = await pool.query(
        `SELECT e.enumlabel AS valoare
         FROM pg_type t
         JOIN pg_enum e ON t.oid = e.enumtypid
         WHERE t.typname = $1
         ORDER BY e.enumsortorder`,
        [numeTipCategorieProdus]
    );

    cacheCategoriiProduse = rezultat.rows.map(function(rand) {
        return {
            valoare: rand.valoare,
            eticheta: titluCategorieProdus(rand.valoare),
            url: `/produse?categorie=${encodeURIComponent(rand.valoare)}`
        };
    });

    return cacheCategoriiProduse;
}

function normalizeazaProdus(rand) {
    const pret = Number(rand.pret) || 0;
    const greutateG = Number(rand.greutate_g) || 0;
    const garantieLuni = Number(rand.garantie_luni) || 0;
    const conectivitate = extrageValoriMultiple(rand.conectivitate);

    return {
        id: rand.id,
        nume: rand.nume,
        descriere: rand.descriere,
        imagine: caleImaginePentruClient(rand.imagine),
        categorie: rand.categorie,
        categorieLabel: titluCategorieProdus(rand.categorie),
        categorieClasa: `categorie-${slugifica(rand.categorie)}`,
        tipProdus: rand.tip_produs,
        tipProdusLabel: etichetaDinValoare(rand.tip_produs),
        segment: rand.segment,
        segmentLabel: etichetaDinValoare(rand.segment),
        pret,
        pretAfisat: `${pret.toFixed(2)} lei`,
        greutateG,
        brand: rand.brand,
        culoare: rand.culoare,
        culoareLabel: etichetaDinValoare(rand.culoare),
        conectivitate,
        conectivitateText: conectivitate.join(", "),
        nrConectivitate: conectivitate.length,
        dataAdaugareIso: formateazaDataIso(rand.data_adaugare),
        dataAdaugareText: formateazaDataRomana(rand.data_adaugare),
        inStoc: rand.in_stoc === true,
        inStocText: rand.in_stoc === true ? "Da" : "Nu",
        garantieLuni,
        specificatii: rand.specificatii
    };
}

async function obtineProduse(categorie) {
    const coloane = `
        id, nume, descriere, imagine, categorie, tip_produs, segment, pret,
        greutate_g, data_adaugare, culoare, conectivitate, in_stoc, brand,
        garantie_luni, specificatii`;
    const rezultat = categorie
        ? await pool.query(
            `SELECT ${coloane}
             FROM produse
             WHERE categorie = $1::categorie_produs
             ORDER BY id`,
            [categorie]
        )
        : await pool.query(
            `SELECT ${coloane}
             FROM produse
             ORDER BY id`
        );

    return rezultat.rows.map(normalizeazaProdus);
}

async function obtineProdusDupaId(id) {
    const rezultat = await pool.query(
        `SELECT id, nume, descriere, imagine, categorie, tip_produs, segment, pret,
                greutate_g, data_adaugare, culoare, conectivitate, in_stoc, brand,
                garantie_luni, specificatii
         FROM produse
         WHERE id = $1`,
        [id]
    );

    return rezultat.rows.length ? normalizeazaProdus(rezultat.rows[0]) : null;
}

function calculeazaPretSet(produse) {
    const sumaPreturi = produse.reduce(function(total, produs) {
        return total + produs.pret;
    }, 0);
    const reducereSet = Math.min(5, produse.length) * 5;
    const pretFinal = Number((sumaPreturi * (100 - reducereSet) / 100).toFixed(2));

    return {
        sumaPreturi,
        sumaPreturiAfisata: `${sumaPreturi.toFixed(2)} lei`,
        reducereSet,
        pretFinal,
        pretFinalAfisat: `${pretFinal.toFixed(2)} lei`
    };
}

function grupeazaSeturi(randuri) {
    const seturiMap = new Map();

    randuri.forEach(function(rand) {
        if (!seturiMap.has(rand.id_set)) {
            seturiMap.set(rand.id_set, {
                id: rand.id_set,
                numeSet: rand.nume_set,
                descriereSet: rand.descriere_set,
                produse: []
            });
        }

        seturiMap.get(rand.id_set).produse.push(normalizeazaProdus(rand));
    });

    return Array.from(seturiMap.values()).map(function(set) {
        const preturiSet = calculeazaPretSet(set.produse);

        return {
            ...set,
            numarProduse: set.produse.length,
            ...preturiSet
        };
    });
}

async function obtineSeturi(idProdus) {
    const coloaneProdus = `
        p.id, p.nume, p.descriere, p.imagine, p.categorie, p.tip_produs, p.segment,
        p.pret, p.greutate_g, p.data_adaugare, p.culoare, p.conectivitate,
        p.in_stoc, p.brand, p.garantie_luni, p.specificatii`;
    const interogare = idProdus
        ? `SELECT s.id AS id_set, s.nume_set, s.descriere_set, ${coloaneProdus}
           FROM seturi s
           JOIN asociere_set a ON a.id_set = s.id
           JOIN produse p ON p.id = a.id_produs
           WHERE s.id IN (
                SELECT id_set
                FROM asociere_set
                WHERE id_produs = $1
           )
           ORDER BY s.id, a.id`
        : `SELECT s.id AS id_set, s.nume_set, s.descriere_set, ${coloaneProdus}
           FROM seturi s
           JOIN asociere_set a ON a.id_set = s.id
           JOIN produse p ON p.id = a.id_produs
           ORDER BY s.id, a.id`;
    const rezultat = idProdus
        ? await pool.query(interogare, [idProdus])
        : await pool.query(interogare);

    return grupeazaSeturi(rezultat.rows);
}

function construiesteOptiuniFiltre(produse) {
    const preturi = produse.map(function(produs) {
        return produs.pret;
    });
    const conectivitati = new Map();

    produse.forEach(function(produs) {
        produs.conectivitate.forEach(function(valoare) {
            if (!conectivitati.has(valoare)) {
                conectivitati.set(valoare, { valoare, eticheta: valoare });
            }
        });
    });

    return {
        pretMin: preturi.length ? Math.floor(Math.min(...preturi)) : 0,
        pretMax: preturi.length ? Math.ceil(Math.max(...preturi)) : 0,
        branduri: Array.from(new Set(produse.map((produs) => produs.brand).filter(Boolean))).sort(function(a, b) {
            return a.localeCompare(b, "ro-RO");
        }),
        segmente: valoriUniceCuEticheta(produse, "segment"),
        tipuriProdus: valoriUniceCuEticheta(produse, "tipProdus"),
        culori: valoriUniceCuEticheta(produse, "culoare"),
        conectivitati: Array.from(conectivitati.values()).sort(comparaDupaEticheta)
    };
}

function asiguraFisierOferte() {
    const folderOferte = path.dirname(caleJsonOferte);

    if (!fs.existsSync(folderOferte)) {
        fs.mkdirSync(folderOferte, { recursive: true });
    }

    if (!fs.existsSync(caleJsonOferte)) {
        fs.writeFileSync(caleJsonOferte, JSON.stringify({ oferte: [] }, null, 4));
    }
}

function citesteJsonOferte() {
    asiguraFisierOferte();

    try {
        const continut = fs.readFileSync(caleJsonOferte, "utf-8");
        const date = JSON.parse(continut);

        return {
            oferte: Array.isArray(date.oferte) ? date.oferte : []
        };
    } catch (eroare) {
        console.error("Nu am putut citi oferte.json:", eroare.message);

        return { oferte: [] };
    }
}

function scrieJsonOferte(dateOferte) {
    asiguraFisierOferte();
    fs.writeFileSync(caleJsonOferte, JSON.stringify(dateOferte, null, 4));
}

function obtineTimestampData(dataText) {
    const timestamp = new Date(dataText).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function esteOfertaActiva(oferta, moment = Date.now()) {
    if (!oferta) {
        return false;
    }

    const inceput = obtineTimestampData(oferta["data-incepere"]);
    const final = obtineTimestampData(oferta["data-finalizare"]);

    return inceput <= moment && moment < final;
}

function stergeOferteExpirateVechi(oferte, moment = Date.now()) {
    const limita = moment - intervalStergereOferteMs;

    return oferte.filter(function(oferta) {
        const final = obtineTimestampData(oferta["data-finalizare"]);

        return final >= limita;
    });
}

async function genereazaOfertaNoua(dateOferteInitiale) {
    const dateOferte = dateOferteInitiale || citesteJsonOferte();
    const categorii = await obtineCategoriiProduse();
    const categorieAnterioara = dateOferte.oferte[0] ? dateOferte.oferte[0].categorie : null;
    const categoriiDisponibile = categorii.length > 1
        ? categorii.filter(function(categorie) {
            return categorie.valoare !== categorieAnterioara;
        })
        : categorii;
    const categorieAleasa = alegeElementAleator(categoriiDisponibile);
    const reducereAleasa = alegeElementAleator(valoriReduceriOferte);

    if (!categorieAleasa || !reducereAleasa) {
        return null;
    }

    const momentIncepere = new Date();
    const momentFinalizare = new Date(momentIncepere.getTime() + intervalOfertaMs);
    const ofertaNoua = {
        categorie: categorieAleasa.valoare,
        "data-incepere": momentIncepere.toISOString(),
        "data-finalizare": momentFinalizare.toISOString(),
        reducere: reducereAleasa
    };

    const oferteActualizate = stergeOferteExpirateVechi(
        [ofertaNoua, ...dateOferte.oferte],
        momentIncepere.getTime()
    );

    scrieJsonOferte({ oferte: oferteActualizate });

    return ofertaNoua;
}

async function asiguraOfertaActiva() {
    const dateOferte = citesteJsonOferte();
    const moment = Date.now();
    const oferteCuratate = stergeOferteExpirateVechi(dateOferte.oferte, moment);
    const primaOferta = oferteCuratate[0];

    if (esteOfertaActiva(primaOferta, moment)) {
        if (oferteCuratate.length !== dateOferte.oferte.length) {
            scrieJsonOferte({ oferte: oferteCuratate });
        }

        return primaOferta;
    }

    return genereazaOfertaNoua({ oferte: oferteCuratate });
}

function ofertaPentruClient(oferta) {
    if (!oferta) {
        return null;
    }

    return {
        categorie: oferta.categorie,
        categorieLabel: titluCategorieProdus(oferta.categorie),
        reducere: oferta.reducere,
        dataIncepere: oferta["data-incepere"],
        dataFinalizare: oferta["data-finalizare"]
    };
}

async function obtineOfertaCurentaPentruClient() {
    try {
        const oferta = await asiguraOfertaActiva();

        return ofertaPentruClient(oferta);
    } catch (eroare) {
        console.error("Nu am putut obtine oferta curenta:", eroare.message);

        return null;
    }
}

function aplicaOfertaPeProdus(produs, ofertaCurenta) {
    if (!ofertaCurenta || produs.categorie !== ofertaCurenta.categorie) {
        return {
            ...produs,
            areOferta: false
        };
    }

    const pretRedus = Number((produs.pret * (100 - ofertaCurenta.reducere) / 100).toFixed(2));

    return {
        ...produs,
        areOferta: true,
        reducereOferta: ofertaCurenta.reducere,
        pretVechiAfisat: produs.pretAfisat,
        pretRedus,
        pretRedusAfisat: `${pretRedus.toFixed(2)} lei`
    };
}

function programeazaUrmatoareaOferta() {
    if (timerGeneratorOferte) {
        clearTimeout(timerGeneratorOferte);
    }

    asiguraOfertaActiva()
        .then(function(oferta) {
            const final = oferta ? obtineTimestampData(oferta["data-finalizare"]) : 0;
            const intarziere = Math.max(1000, final - Date.now());

            timerGeneratorOferte = setTimeout(async function() {
                try {
                    await genereazaOfertaNoua();
                } catch (eroare) {
                    console.error("Nu am putut genera oferta programata:", eroare.message);
                }

                programeazaUrmatoareaOferta();
            }, intarziere || 10000);
        })
        .catch(function(eroare) {
            console.error("Nu am putut porni generatorul de oferte:", eroare.message);
            timerGeneratorOferte = setTimeout(programeazaUrmatoareaOferta, 10000);
        });
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

function randarePaginaSimpla(titlu, text) {
    return `<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titlu}</title>
    <link rel="stylesheet" href="/resurse/css/general.css">
    <link rel="stylesheet" href="/resurse/css/nav.css">
</head>
<body id="top">
    <div id="print-watermark" aria-hidden="true">Pirvanescu Dimitrie-Alexandru</div>
    <main style="max-width: 900px; margin: 3rem auto; padding: 1.5rem; text-align: center;">
        <h1>${titlu}</h1>
        <p>${text}</p>
    </main>
</body>
</html>`;
}

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.use(async function(req, res, next) {
    res.locals.ipUtilizator = req.ip;
    try {
        res.locals.categoriiProduse = await obtineCategoriiProduse();
    } catch (eroare) {
        console.error("Nu am putut incarca enum-ul pentru meniul de produse:", eroare.message);
        res.locals.categoriiProduse = [];
    }
    next();
});

app.get(["/", "/index", "/home"], async function(req, res) {
    const dateGalerie = await obtineDateGalerieStatica();
    const ofertaCurenta = await obtineOfertaCurentaPentruClient();

    res.render("pagini/index", {
        ipUtilizator: req.ip,
        imaginiGalerie: dateGalerie.imaginiGalerie,
        celuleGalerie: dateGalerie.celuleGalerie,
        lunaGalerie: dateGalerie.lunaGalerie,
        ofertaCurenta
    });
});

app.get("/despre", function(req, res) {
    res.render("pagini/despre");
});

app.get("/produse", async function(req, res) {
    try {
        const categorieCeruta = typeof req.query.categorie === "string" ? req.query.categorie.trim() : "";
        const categoriiProduse = await obtineCategoriiProduse();

        if (categorieCeruta && !categoriiProduse.some((categorie) => categorie.valoare === categorieCeruta)) {
            afisareEroare(
                res,
                404,
                "Categorie inexistenta",
                "Categoria de produse ceruta nu exista in enum-ul bazei de date."
            );
            return;
        }

        const ofertaCurenta = await obtineOfertaCurentaPentruClient();
        const produse = (await obtineProduse(categorieCeruta || null)).map(function(produs) {
            return aplicaOfertaPeProdus(produs, ofertaCurenta);
        });
        const categorieSelectata = categorieCeruta
            ? categoriiProduse.find((categorie) => categorie.valoare === categorieCeruta)
            : null;

        res.render("pagini/produse", {
            produse,
            optiuniFiltre: construiesteOptiuniFiltre(produse),
            categorieSelectata,
            ofertaCurenta
        });
    } catch (eroare) {
        console.error("Nu am putut incarca produsele:", eroare.message);
        afisareEroare(
            res,
            500,
            "Produsele nu pot fi incarcate",
            "Verifica daca baza de date PostgreSQL a fost initializata cu scriptul resurse/sql/init-produse.sql."
        );
    }
});

app.get("/api/oferta-curenta", async function(req, res) {
    try {
        const ofertaCurenta = await obtineOfertaCurentaPentruClient();

        res.json({
            oferta: ofertaCurenta
        });
    } catch (eroare) {
        console.error("Nu am putut incarca oferta curenta:", eroare.message);
        res.status(500).json({
            oferta: null
        });
    }
});

app.get(["/seturi", "/produse/seturi"], async function(req, res) {
    try {
        const seturi = await obtineSeturi();

        res.render("pagini/seturi", {
            seturi
        });
    } catch (eroare) {
        console.error("Nu am putut incarca seturile:", eroare.message);
        afisareEroare(
            res,
            500,
            "Seturile nu pot fi incarcate",
            "A aparut o problema la interogarea seturilor de produse."
        );
    }
});

app.get(["/produs/:id", "/produse/:id"], async function(req, res) {
    const idProdus = Number(req.params.id);

    if (!Number.isInteger(idProdus) || idProdus <= 0) {
        afisareEroare(res, 400, "Produs invalid", "Identificatorul produsului trebuie sa fie numeric.");
        return;
    }

    try {
        const produs = await obtineProdusDupaId(idProdus);

        if (!produs) {
            afisareEroare(res, 404, "Produs inexistent", "Produsul cerut nu exista in baza de date.");
            return;
        }

        const seturiProdus = await obtineSeturi(idProdus);

        res.render("pagini/produs", {
            produs,
            seturiProdus
        });
    } catch (eroare) {
        console.error("Nu am putut incarca produsul:", eroare.message);
        afisareEroare(
            res,
            500,
            "Produsul nu poate fi incarcat",
            "A aparut o problema la interogarea bazei de date."
        );
    }
});

app.get("/cos", function(req, res) {
    res.send(randarePaginaSimpla("Cos", "Pagina de cos va fi adaugata in curand."));
});

app.get("/galerie-statica", async function(req, res) {
    const dateGalerie = await obtineDateGalerieStatica();

    res.render("pagini/galerie-statica", {
        ipUtilizator: req.ip,
        imaginiGalerie: dateGalerie.imaginiGalerie,
        celuleGalerie: dateGalerie.celuleGalerie,
        lunaGalerie: dateGalerie.lunaGalerie
    });
});

app.get("/galerie-dinamica", async function(req, res) {
    const dateGalerieAnimata = await obtineDateGalerieAnimata();

    res.render("pagini/galerie-dinamica", {
        ipUtilizator: req.ip,
        numarImaginiAnimata: dateGalerieAnimata.numarImagini,
        celuleGalerieAnimata: dateGalerieAnimata.celuleGalerieAnimata,
        cssGalerieAnimata: dateGalerieAnimata.cssGalerieAnimata
    });
});

app.get("/contact", function(req, res) {
    res.send(randarePaginaSimpla("Contact", "Pagina de contact va fi adaugata in curand."));
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

app.get("/*pagina", function(req, res) {
    console.log("Cale pagina", req.url);

    if (req.path.startsWith("/resurse") && path.extname(req.path) === "") {
        afisareEroare(res, 403);
        return;
    }

    if (path.extname(req.path) === ".ejs" || /\.ejs(?:\/|$)/i.test(req.path)) {
        afisareEroare(res, 400);
        return;
    }

    try {
        const calePagina = path.join("pagini", req.path).replace(/\\/g, "/");

        res.render(calePagina, function(eroare, rezultatRandare) {
            if (eroare) {
                if (eroare.message && eroare.message.includes("Failed to lookup view")) {
                    afisareEroare(res, 404);
                    return;
                }

                afisareEroare(res);
                return;
            }

            res.send(rezultatRandare);
        });
    } catch (eroare) {
        if (eroare.message && eroare.message.includes("Cannot find module")) {
            afisareEroare(res, 404);
            return;
        }

        afisareEroare(res);
    }
});

const port = Number(process.env.PORT) || 8080;
app.listen(port);
console.log(`Serverul a pornit pe portul ${port}!`);

function compileazaToateScss() {
    const fisiere = fs.readdirSync(obGlobal.folderScss);

    for (const fisier of fisiere) {
        if (path.extname(fisier) === ".scss" && fisier !== "galerie-animata.scss") {
            compileazaScss(fisier);
        }
    }
}

function urmaresteScss() {
    fs.watch(obGlobal.folderScss, function(eventType, filename) {
        if (!filename || path.extname(filename) !== ".scss" || filename === "galerie-animata.scss") {
            return;
        }

        const caleScss = path.join(obGlobal.folderScss, filename);

        if (!fs.existsSync(caleScss)) {
            return;
        }

        try {
            compileazaScss(filename);
            console.log(`Am recompilat ${filename} dupa evenimentul ${eventType}.`);
        } catch (eroare) {
            console.error(`Eroare la recompilarea fisierului ${filename}:`, eroare.message);
        }
    });
}

compileazaToateScss();
urmaresteScss();
programeazaUrmatoareaOferta();
