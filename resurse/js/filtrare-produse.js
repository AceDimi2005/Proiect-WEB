"use strict";

window.addEventListener("DOMContentLoaded", function() {
    const listaProduse = document.getElementById("lista-produse");

    if (!listaProduse) {
        return;
    }

    const articoleInitiale = Array.from(listaProduse.querySelectorAll("article.produs"));
    const inpNume = document.getElementById("inp-nume");
    const inpPret = document.getElementById("inp-pret");
    const valoarePret = document.getElementById("valoare-pret");
    const inpBrand = document.getElementById("inp-brand");
    const txtCuvinte = document.getElementById("txt-cuvinte");
    const floatingCuvinte = document.getElementById("floating-cuvinte");
    const selTip = document.getElementById("sel-tip");
    const selCuloare = document.getElementById("sel-culoare");
    const mesajValidare = document.getElementById("mesaj-validare");
    const numarProduse = document.getElementById("numar-produse");
    const btnFiltrare = document.getElementById("btn-filtrare");
    const btnSortAsc = document.getElementById("btn-sort-asc");
    const btnSortDesc = document.getElementById("btn-sort-desc");
    const btnCalculare = document.getElementById("btn-calculare");
    const btnResetare = document.getElementById("btn-resetare");
    const valoriBrand = Array.from(document.querySelectorAll("#lista-branduri option")).map(function(optiune) {
        return normalizeazaText(optiune.value);
    });
    const regexNume = /^[\p{L}\p{N}\s.+\-/#]*$/u;
    const regexCuvinte = /^[\p{L}\p{N}\s,\-.]*$/u;

    function normalizeazaText(text) {
        return String(text || "").toLocaleLowerCase("ro-RO").trim();
    }

    function selectiiMultiple(select) {
        return Array.from(select.selectedOptions).map(function(optiune) {
            return optiune.value;
        });
    }

    function activeazaSelectMultipluToggle(select) {
        select.addEventListener("mousedown", function(event) {
            if (event.target.tagName !== "OPTION") {
                return;
            }

            const optiuneApasata = event.target;
            const valoriInainte = selectiiMultiple(select);
            const eraSelectata = optiuneApasata.selected;

            event.preventDefault();

            requestAnimationFrame(function() {
                Array.from(select.options).forEach(function(optiune) {
                    optiune.selected = valoriInainte.includes(optiune.value);
                });
                optiuneApasata.selected = !eraSelectata;
                select.focus();
                select.dispatchEvent(new Event("change", { bubbles: true }));
            });
        });
    }

    function checkboxuriBifate() {
        return Array.from(document.querySelectorAll(".filtru-conectivitate:checked")).map(function(checkbox) {
            return checkbox.value;
        });
    }

    function seteazaMesaj(text) {
        mesajValidare.textContent = text;
        mesajValidare.classList.toggle("activ", Boolean(text));
    }

    function marcheazaInvalid(element, invalid) {
        if (element) {
            element.classList.toggle("is-invalid", invalid);
        }

        if (element === txtCuvinte && floatingCuvinte) {
            floatingCuvinte.classList.toggle("is-invalid", invalid);
        }
    }

    function actualizeazaValoarePret() {
        valoarePret.textContent = inpPret.value;
    }

    function textareaInvalida() {
        const cuvinte = txtCuvinte.value.trim();

        return Boolean(cuvinte) && !regexCuvinte.test(cuvinte);
    }

    function actualizeazaValidareTextarea() {
        marcheazaInvalid(txtCuvinte, textareaInvalida());
    }

    function valideazaInputuri() {
        const erori = [];
        const nume = inpNume.value.trim();
        const brand = inpBrand.value.trim();
        const numeInvalid = Boolean(nume) && !regexNume.test(nume);
        const cuvinteInvalid = textareaInvalida();
        const brandInvalid = Boolean(brand) && !valoriBrand.includes(normalizeazaText(brand));
        const faraConectivitate = checkboxuriBifate().length === 0;
        const faraCulori = selectiiMultiple(selCuloare).length === 0;

        marcheazaInvalid(inpNume, numeInvalid);
        marcheazaInvalid(txtCuvinte, cuvinteInvalid);
        marcheazaInvalid(inpBrand, brandInvalid);
        marcheazaInvalid(selCuloare, faraCulori);

        if (numeInvalid) {
            erori.push("Numele poate contine doar litere, cifre, spatii si semne uzuale pentru modele.");
        }

        if (cuvinteInvalid) {
            erori.push("Cuvintele cheie se scriu separate prin virgula, fara alte simboluri.");
        }

        if (brandInvalid) {
            erori.push("Brandul trebuie ales din lista de sugestii sau lasat gol.");
        }

        if (faraConectivitate) {
            erori.push("Bifeaza cel putin o optiune de conectivitate.");
        }

        if (faraCulori) {
            erori.push("Selecteaza cel putin o culoare.");
        }

        seteazaMesaj(erori.join(" "));

        return erori.length === 0;
    }

    function produsTreceFiltrele(articol) {
        const nume = normalizeazaText(inpNume.value);
        const pretMaxim = Number(inpPret.value);
        const brand = normalizeazaText(inpBrand.value);
        const segment = document.querySelector("input[name='segment']:checked").value;
        const cuvinte = txtCuvinte.value
            .split(",")
            .map(normalizeazaText)
            .filter(Boolean);
        const conectivitatiSelectate = checkboxuriBifate();
        const tipSelectat = selTip.value;
        const culoriSelectate = selectiiMultiple(selCuloare);
        const conectivitatiProdus = String(articol.dataset.conectivitate || "").split("|").filter(Boolean);

        if (nume && !normalizeazaText(articol.dataset.nume).includes(nume)) {
            return false;
        }

        if (Number(articol.dataset.pret) > pretMaxim) {
            return false;
        }

        if (brand && normalizeazaText(articol.dataset.brand) !== brand) {
            return false;
        }

        if (segment && articol.dataset.segment !== segment) {
            return false;
        }

        if (cuvinte.length && !cuvinte.some(function(cuvant) {
            return normalizeazaText(articol.dataset.descriere).includes(cuvant);
        })) {
            return false;
        }

        if (!conectivitatiSelectate.some(function(conectivitate) {
            return conectivitatiProdus.includes(conectivitate);
        })) {
            return false;
        }

        if (tipSelectat && articol.dataset.tipProdus !== tipSelectat) {
            return false;
        }

        if (!culoriSelectate.includes(articol.dataset.culoare)) {
            return false;
        }

        return true;
    }

    function actualizeazaNumarProduse() {
        const afisate = articoleInitiale.filter(function(articol) {
            return articol.style.display !== "none";
        }).length;
        numarProduse.textContent = `${afisate} produse afisate`;
    }

    function filtreazaProduse() {
        if (!valideazaInputuri()) {
            return;
        }

        articoleInitiale.forEach(function(articol) {
            articol.style.display = produsTreceFiltrele(articol) ? "" : "none";
        });
        actualizeazaNumarProduse();
    }

    function sorteazaProduse(directie) {
        if (!valideazaInputuri()) {
            return;
        }

        Array.from(listaProduse.children)
            .sort(function(articolA, articolB) {
                const diferentaPret = Number(articolA.dataset.pret) - Number(articolB.dataset.pret);
                const diferentaConectivitate = Number(articolA.dataset.nrConectivitate) - Number(articolB.dataset.nrConectivitate);
                const rezultat = diferentaPret || diferentaConectivitate;

                return directie * rezultat;
            })
            .forEach(function(articol) {
                listaProduse.appendChild(articol);
            });
    }

    function afiseazaRezultatCalcul(text) {
        const rezultatVechi = document.querySelector(".rezultat-calcul-produse");

        if (rezultatVechi) {
            rezultatVechi.remove();
        }

        const div = document.createElement("div");
        div.className = "rezultat-calcul-produse";
        div.textContent = text;
        document.body.appendChild(div);

        setTimeout(function() {
            div.remove();
        }, 2000);
    }

    function calculeazaMediaPreturilor() {
        if (!valideazaInputuri()) {
            return;
        }

        const produseAfisate = articoleInitiale.filter(function(articol) {
            return articol.style.display !== "none";
        });

        if (!produseAfisate.length) {
            afiseazaRezultatCalcul("Nu exista produse afisate pentru calcul.");
            return;
        }

        const suma = produseAfisate.reduce(function(total, articol) {
            return total + Number(articol.dataset.pret);
        }, 0);
        const media = suma / produseAfisate.length;

        afiseazaRezultatCalcul(`Media preturilor afisate: ${media.toFixed(2)} lei`);
    }

    function reseteazaFiltre() {
        if (!confirm("Sigur vrei sa resetezi filtrele si sortarea?")) {
            return;
        }

        inpNume.value = "";
        inpPret.value = inpPret.max;
        inpBrand.value = "";
        txtCuvinte.value = "";
        selTip.value = "";
        document.querySelector("input[name='segment'][value='']").checked = true;
        document.querySelectorAll(".filtru-conectivitate").forEach(function(checkbox) {
            checkbox.checked = true;
        });
        Array.from(selCuloare.options).forEach(function(optiune) {
            optiune.selected = true;
        });
        [inpNume, txtCuvinte, inpBrand, selCuloare].forEach(function(element) {
            marcheazaInvalid(element, false);
        });
        seteazaMesaj("");
        actualizeazaValoarePret();

        articoleInitiale
            .sort(function(articolA, articolB) {
                return Number(articolA.dataset.order) - Number(articolB.dataset.order);
            })
            .forEach(function(articol) {
                articol.style.display = "";
                listaProduse.appendChild(articol);
            });
        actualizeazaNumarProduse();
    }

    activeazaSelectMultipluToggle(selCuloare);
    inpPret.addEventListener("input", actualizeazaValoarePret);
    txtCuvinte.addEventListener("input", actualizeazaValidareTextarea);
    btnFiltrare.addEventListener("click", filtreazaProduse);
    btnSortAsc.addEventListener("click", function() {
        sorteazaProduse(1);
    });
    btnSortDesc.addEventListener("click", function() {
        sorteazaProduse(-1);
    });
    btnCalculare.addEventListener("click", calculeazaMediaPreturilor);
    btnResetare.addEventListener("click", reseteazaFiltre);

    actualizeazaValoarePret();
    actualizeazaNumarProduse();
});
