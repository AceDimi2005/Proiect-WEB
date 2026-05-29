"use strict";

window.addEventListener("DOMContentLoaded", function() {
    const cheieComparare = "techforge_comparare_produse";
    const durataMaximaInactivitate = 24 * 60 * 60 * 1000;
    const butoaneComparare = Array.from(document.querySelectorAll(".btn-compara"));
    let stareComparare = citesteStareComparare();
    let tooltipComparare = null;
    let timerExpirareComparare = null;

    if (!butoaneComparare.length) {
        return;
    }

    function citesteStareComparare() {
        try {
            const stare = JSON.parse(localStorage.getItem(cheieComparare));

            if (!stare || !Array.isArray(stare.produse)) {
                return { produse: [], ultimaComparare: 0 };
            }

            if (Date.now() - Number(stare.ultimaComparare || 0) > durataMaximaInactivitate) {
                localStorage.removeItem(cheieComparare);
                return { produse: [], ultimaComparare: 0 };
            }

            return {
                produse: stare.produse.slice(0, 2),
                ultimaComparare: Number(stare.ultimaComparare || Date.now())
            };
        } catch (eroare) {
            localStorage.removeItem(cheieComparare);
            return { produse: [], ultimaComparare: 0 };
        }
    }

    function salveazaStareComparare() {
        if (!stareComparare.produse.length) {
            localStorage.removeItem(cheieComparare);
            return;
        }

        localStorage.setItem(cheieComparare, JSON.stringify(stareComparare));
    }

    function produsDinButon(buton) {
        return {
            id: buton.dataset.id,
            nume: buton.dataset.nume,
            imagine: buton.dataset.imagine,
            categorie: buton.dataset.categorie,
            tip: buton.dataset.tip,
            segment: buton.dataset.segment,
            brand: buton.dataset.brand,
            pret: buton.dataset.pret,
            greutate: buton.dataset.greutate,
            garantie: buton.dataset.garantie,
            culoare: buton.dataset.culoare,
            conectivitate: buton.dataset.conectivitate,
            stoc: buton.dataset.stoc,
            dataAdaugare: buton.dataset.dataAdaugare,
            specificatii: buton.dataset.specificatii
        };
    }

    function produsEsteInComparare(idProdus) {
        return stareComparare.produse.some(function(produs) {
            return String(produs.id) === String(idProdus);
        });
    }

    function adaugaProdusInComparare(produs) {
        if (stareComparare.produse.length >= 2 || produsEsteInComparare(produs.id)) {
            return;
        }

        stareComparare.produse.push(produs);
        stareComparare.ultimaComparare = Date.now();
        salveazaStareComparare();
        randareContainerComparare();
        actualizeazaButoaneComparare();
        programeazaExpirareComparare();
    }

    function stergeProdusDinComparare(idProdus) {
        stareComparare.produse = stareComparare.produse.filter(function(produs) {
            return String(produs.id) !== String(idProdus);
        });
        salveazaStareComparare();
        randareContainerComparare();
        actualizeazaButoaneComparare();
        programeazaExpirareComparare();
    }

    function programeazaExpirareComparare() {
        if (timerExpirareComparare) {
            clearTimeout(timerExpirareComparare);
        }

        if (!stareComparare.produse.length) {
            timerExpirareComparare = null;
            return;
        }

        const timpRamas = durataMaximaInactivitate - (Date.now() - stareComparare.ultimaComparare);

        if (timpRamas <= 0) {
            stareComparare = { produse: [], ultimaComparare: 0 };
            localStorage.removeItem(cheieComparare);
            randareContainerComparare();
            actualizeazaButoaneComparare();
            timerExpirareComparare = null;
            return;
        }

        timerExpirareComparare = setTimeout(function() {
            stareComparare = { produse: [], ultimaComparare: 0 };
            localStorage.removeItem(cheieComparare);
            randareContainerComparare();
            actualizeazaButoaneComparare();
            timerExpirareComparare = null;
        }, timpRamas);
    }

    function obtineSauCreeazaContainerComparare() {
        let container = document.getElementById("container-comparare");

        if (!container) {
            container = document.createElement("aside");
            container.id = "container-comparare";
            container.setAttribute("aria-live", "polite");
            document.body.appendChild(container);
        }

        return container;
    }

    function randareContainerComparare() {
        const containerExistent = document.getElementById("container-comparare");

        if (!stareComparare.produse.length) {
            if (containerExistent) {
                containerExistent.remove();
            }
            ascundeTooltipComparare();
            return;
        }

        const container = obtineSauCreeazaContainerComparare();
        const listaProduse = stareComparare.produse.map(function(produs) {
            return `
                <li>
                    <span>${escapeHtml(produs.nume)}</span>
                    <button type="button" class="btn-sterge-comparare" data-id="${escapeHtml(produs.id)}" aria-label="Sterge ${escapeHtml(produs.nume)} din comparare">x</button>
                </li>`;
        }).join("");
        const butonAfisare = stareComparare.produse.length === 2
            ? '<button type="button" id="btn-afiseaza-comparare">afișează</button>'
            : "";

        container.innerHTML = `
            <h3>Comparare produse</h3>
            <ul>${listaProduse}</ul>
            ${butonAfisare}`;

        container.querySelectorAll(".btn-sterge-comparare").forEach(function(buton) {
            buton.addEventListener("click", function() {
                stergeProdusDinComparare(buton.dataset.id);
            });
        });

        const btnAfiseaza = document.getElementById("btn-afiseaza-comparare");

        if (btnAfiseaza) {
            btnAfiseaza.addEventListener("click", deschideFereastraComparare);
        }
    }

    function actualizeazaButoaneComparare() {
        const comparareaEstePlina = stareComparare.produse.length >= 2;

        butoaneComparare.forEach(function(buton) {
            buton.disabled = comparareaEstePlina;
            buton.classList.toggle("comparare-dezactivata", comparareaEstePlina);
            buton.dataset.mesajDezactivat = comparareaEstePlina
                ? "ștergeți un produs din lista de comparare"
                : "";
        });
    }

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function randTabelComparare(eticheta, proprietate) {
        return `
            <tr>
                <th>${escapeHtml(eticheta)}</th>
                <td>${escapeHtml(stareComparare.produse[0][proprietate])}</td>
                <td>${escapeHtml(stareComparare.produse[1][proprietate])}</td>
            </tr>`;
    }

    function deschideFereastraComparare() {
        if (stareComparare.produse.length !== 2) {
            return;
        }

        const fereastra = window.open("", "comparare-produse", "width=980,height=720");

        if (!fereastra) {
            alert("Fereastra de comparare nu a putut fi deschisă.");
            return;
        }

        const randuri = [
            ["Categorie", "categorie"],
            ["Tip", "tip"],
            ["Segment", "segment"],
            ["Brand", "brand"],
            ["Preț", "pret"],
            ["Greutate", "greutate"],
            ["Garanție", "garantie"],
            ["Culoare", "culoare"],
            ["Conectivitate", "conectivitate"],
            ["În stoc", "stoc"],
            ["Data adăugării", "dataAdaugare"],
            ["Specificații", "specificatii"]
        ].map(function(rand) {
            return randTabelComparare(rand[0], rand[1]);
        }).join("");

        fereastra.document.open();
        fereastra.document.write(`
            <!DOCTYPE html>
            <html lang="ro">
            <head>
                <meta charset="utf-8">
                <title>Comparare produse TechForge</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 2rem; color: #0d2238; background: #f4f8ff; }
                    table { width: 100%; border-collapse: collapse; background: #fff; }
                    th, td { border: 1px solid #2f5d8a; padding: 0.55rem; vertical-align: top; }
                    th { background: #1f3b5b; color: #fff; text-align: left; }
                    thead td { text-align: center; font-weight: 700; }
                    img { width: 11rem; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 0.35rem; display: block; margin: 0 auto 0.4rem; }
                    h1 { margin-top: 0; }
                </style>
            </head>
            <body>
                <h1>Comparare produse TechForge</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Caracteristică</th>
                            <td>
                                <img src="${escapeHtml(stareComparare.produse[0].imagine)}" alt="">
                                ${escapeHtml(stareComparare.produse[0].nume)}
                            </td>
                            <td>
                                <img src="${escapeHtml(stareComparare.produse[1].imagine)}" alt="">
                                ${escapeHtml(stareComparare.produse[1].nume)}
                            </td>
                        </tr>
                    </thead>
                    <tbody>${randuri}</tbody>
                </table>
            </body>
            </html>`);
        fereastra.document.close();
    }

    function obtineTooltipComparare() {
        if (!tooltipComparare) {
            tooltipComparare = document.createElement("div");
            tooltipComparare.id = "tooltip-comparare";
            tooltipComparare.textContent = "ștergeți un produs din lista de comparare";
            document.body.appendChild(tooltipComparare);
        }

        return tooltipComparare;
    }

    function afiseazaTooltipComparare(event) {
        const tooltip = obtineTooltipComparare();

        tooltip.style.left = `${event.clientX + 14}px`;
        tooltip.style.top = `${event.clientY + 14}px`;
        tooltip.classList.add("vizibil");
    }

    function ascundeTooltipComparare() {
        if (tooltipComparare) {
            tooltipComparare.classList.remove("vizibil");
        }
    }

    butoaneComparare.forEach(function(buton) {
        buton.addEventListener("click", function() {
            adaugaProdusInComparare(produsDinButon(buton));
        });
    });

    document.addEventListener("mousemove", function(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);

        if (element && element.classList.contains("btn-compara") && element.disabled) {
            afiseazaTooltipComparare(event);
        } else {
            ascundeTooltipComparare();
        }
    });

    document.addEventListener("mouseleave", ascundeTooltipComparare);

    randareContainerComparare();
    actualizeazaButoaneComparare();
    programeazaExpirareComparare();
});
