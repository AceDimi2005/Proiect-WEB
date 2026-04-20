
const express = require("express");
const fs = require("fs");
const path = require("path");
const pg = require("pg");

const app = express();
app.set("view engine", "ejs");

const obGlobal = {
    obErori: null
};

const vect_foldere = ["temp", "logs", "backup", "fisiere_uploadate"];

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

app.get(["/", "/index", "/home"], function(req, res) {
    res.render("pagini/index", {
        ipUtilizator: req.ip
    });
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

app.get("/galerie-statica", function(req, res) {
    res.send("<h1>Galerie statica</h1><p>Pagina va fi adaugata in curand.</p>");
});

app.get("/galerie-dinamica", function(req, res) {
    res.send("<h1>Galerie dinamica</h1><p>Pagina va fi adaugata in curand.</p>");
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