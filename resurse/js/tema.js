"use strict";

(function() {
    const cheieTema = "techforge-tema";
    const temaImplicita = "light";

    function citesteTemaSalvata() {
        try {
            return localStorage.getItem(cheieTema);
        } catch (eroare) {
            return null;
        }
    }

    function salveazaTema(tema) {
        try {
            localStorage.setItem(cheieTema, tema);
        } catch (eroare) {
            // Tema ramane aplicata pentru incarcarea curenta chiar daca storage-ul nu este disponibil.
        }
    }

    function aplicaTema(tema, salveaza) {
        const temaFinala = tema === "dark" ? "dark" : temaImplicita;
        document.documentElement.setAttribute("data-bs-theme", temaFinala);

        if (salveaza) {
            salveazaTema(temaFinala);
        }
    }

    aplicaTema(citesteTemaSalvata() || temaImplicita, false);

    window.addEventListener("DOMContentLoaded", function() {
        const switchTema = document.getElementById("switch-tema");

        if (!switchTema) {
            return;
        }

        switchTema.checked = document.documentElement.getAttribute("data-bs-theme") === "dark";
        switchTema.addEventListener("change", function() {
            aplicaTema(switchTema.checked ? "dark" : "light", true);
        });
    });
})();
