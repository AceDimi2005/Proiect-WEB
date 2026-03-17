
const express = require("express");
const path = require("path");

const app = express();
app.set("view engine", "ejs");

console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);


app.use("/resurse", express.static(path.join(__dirname, "resurse")));

app.get("/", function(req, res) {
    res.render("pagini/index");;
})

app.get("/cale/:a/:b", function(req, res) {
    res.send(parseInt(req.params.a) + parseInt(req.params.b) + "");
});



app.get("/cale2", function(req, res) {
    res.sendFile(path.join(__dirname, "cale2.html"));
    console.log("Am primit o cerere GET pe /cale2");
})


app.get("/:a/:b", function(req, res) {
    res.sendFile(path.join(__dirname, "index.html")

);
});

app.listen(8080);
console.log("Serverul a pornit!");
