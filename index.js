
const express = require("express");
const path = require("path");

const app = express();
app.set("view engine", "ejs");

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);


app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/", function(req, res) {
    res.render("pagini/index");
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

app.listen(8080);
console.log("Serverul a pornit!");
