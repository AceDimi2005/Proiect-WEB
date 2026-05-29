"use strict";

window.addEventListener("DOMContentLoaded", function() {
    const panouOferta = document.getElementById("oferta-curenta");

    if (!panouOferta) {
        return;
    }

    const timerOferta = document.getElementById("timer-oferta");
    const reducereOferta = panouOferta.querySelector("[data-oferta-reducere]");
    const categorieOferta = panouOferta.querySelector("[data-oferta-categorie]");
    const urlApi = panouOferta.dataset.apiUrl || "/api/oferta-curenta";
    let finalizareOferta = new Date(panouOferta.dataset.finalizare).getTime();
    let timerInterval = null;
    let seIncarcaOferta = false;

    function douaCifre(numar) {
        return String(numar).padStart(2, "0");
    }

    function formateazaDurata(msRamase) {
        const totalSecunde = Math.max(0, Math.floor(msRamase / 1000));
        const ore = Math.floor(totalSecunde / 3600);
        const minute = Math.floor((totalSecunde % 3600) / 60);
        const secunde = totalSecunde % 60;

        return `${douaCifre(ore)}:${douaCifre(minute)}:${douaCifre(secunde)}`;
    }

    function actualizeazaOferta(oferta) {
        if (!oferta) {
            panouOferta.hidden = true;
            return;
        }

        panouOferta.hidden = false;
        panouOferta.dataset.finalizare = oferta.dataFinalizare;
        finalizareOferta = new Date(oferta.dataFinalizare).getTime();
        reducereOferta.textContent = oferta.reducere;
        categorieOferta.textContent = oferta.categorieLabel;
        panouOferta.classList.remove("oferta-urgent");
        actualizeazaTimer();
    }

    async function incarcaOfertaNoua() {
        if (seIncarcaOferta) {
            return;
        }

        seIncarcaOferta = true;
        timerOferta.textContent = "se actualizează";

        try {
            const raspuns = await fetch(urlApi, { cache: "no-store" });
            const date = await raspuns.json();

            actualizeazaOferta(date.oferta);
        } catch (eroare) {
            panouOferta.hidden = true;
        } finally {
            seIncarcaOferta = false;
        }
    }

    function actualizeazaTimer() {
        const msRamase = finalizareOferta - Date.now();

        if (msRamase <= 0) {
            panouOferta.classList.remove("oferta-urgent");
            incarcaOfertaNoua();
            return;
        }

        timerOferta.textContent = formateazaDurata(msRamase);
        panouOferta.classList.toggle("oferta-urgent", msRamase <= 10000);
    }

    timerInterval = setInterval(actualizeazaTimer, 1000);
    actualizeazaTimer();

    window.addEventListener("beforeunload", function() {
        clearInterval(timerInterval);
    });
});
