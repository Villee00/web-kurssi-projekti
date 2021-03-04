'use strict';

//proxy rss sivulle
const proxy = 'https://cors.bridged.cc/'
let map = null;
//Ilmoitus objecti, joissa on kaikki saatu tieto hätätapauksesta
class Ilmoitus {
    constructor(nkaupunki,ntapahtuma,naika, ncoords) {
        this.kaupunki = nkaupunki;
        this.tapahtuma = ntapahtuma;
        this.aika = naika;
        this.coords = ncoords;
    }
}

//laittaa kartan sivustolle
const loadMap = () =>{
    map = L.map('map').setView([65.9, 25.74], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

}

//Hae RSS syötteestä tiedot ja tallenna ne objektiin, jotta niitä voi käyttää kartassa. (CORS ongelma vielä ei toimi))
const getData = async () =>{

    const petoRSS = `${proxy}http://www.peto-media.fi/tiedotteet/rss.xml`
    let dataTaulu = []; 

    const decoder = new TextDecoder("iso-8859-1");
    await fetch(petoRSS)
    .then(response => response.arrayBuffer())
    .then((buffer) => {
        const str = decoder.decode(buffer)
        return new window.DOMParser().parseFromString(str, "text/xml")
    })
    .then(data => dataTaulu = parseXmlData(data));
    return dataTaulu;
}


//Hea jollain apilla kaupungin koordinaatit, jotta saadaan merkattua kartalle
const setMapPoints = (tapaus) =>{
    const marker = L.marker(tapaus.coords);

    marker.bindPopup(`<b>${tapaus.kaupunki}</b><br>${tapaus.tapahtuma}`);
    return marker;
}

//Hea koordinaatit kaupungit.js tiedostosta
const getCoords = async (kaupunki) =>{
    const kau = kaupungit.find(etsiKaupunki => etsiKaupunki.name === kaupunki)
    return [kau.coordinates[1], kau.coordinates[0]];
}

//Muuta saatu xml tiedosto ilmoitus listaksi
const parseXmlData = async (data) =>{
    let ilmoitukset = [];
    const items = data.querySelector('channel').querySelectorAll('item');

    for (let item = 0; item < items.length -1; item++) {
        const kaupunki = items[item].querySelector('title').innerHTML.split(',')[0];
        const tapahtuma = items[item].querySelector('title').innerHTML.split(',')[1];
        const aika = new Date(items[item].querySelector('pubDate').innerHTML);
        const coords = await getCoords(kaupunki.split('/')[0]);
        ilmoitukset.push(new Ilmoitus(kaupunki, tapahtuma, aika, coords))
    }

    return ilmoitukset;
}

//Printaa sivulle tiedot ul listaan
//Jos haluaa maksimimäärän listan 
const printToSite = async (amount = -1, multiMarkers = false) =>{
    const data = await getData();
    const markers = L.markerClusterGroup({maxClusterRadius: 30});
    const tabel = document.querySelector('#tapaukset');

    if(amount >= 0){
        for (let item = 0; item < amount; item++) {
            const kaupunki = document.createElement("td");
            const tapahtuma = document.createElement("td");
            const tr = document.createElement("tr");
            kaupunki.innerText = data[item].kaupunki;
            tapahtuma.innerText = data[item].tapahtuma;
            tr.appendChild(kaupunki);
            tr.appendChild(tapahtuma);
            tabel.querySelector("tbody").appendChild(tr);

            const marker = await setMapPoints(data[item]);
            if(multiMarkers) markers.addLayer(marker);
            else marker.addTo(map);
            
        }
    }
    else{
        data.forEach(async ilmoitus => {
            
            const kaupunki = document.createElement("td");

            const aika = document.createElement("td");
            const tapahtuma = document.createElement("td");
            
            const tr = document.createElement("tr");
            tr.addEventListener("click", () => {
                map.flyTo(ilmoitus.coords, 10);
            })
            kaupunki.innerText = ilmoitus.kaupunki;
            tapahtuma.innerText = ilmoitus.tapahtuma;

            const dd = ilmoitus.aika.getDate();
            const mm = ilmoitus.aika.getMonth();

            const hh = ilmoitus.aika.getHours();
            const min = ilmoitus.aika.getMinutes(); 
            const ss = ilmoitus.aika.getSeconds();

            aika.innerText = `${dd}.${mm} - ${hh}:${min}:${ss}`;
            tr.appendChild(kaupunki);
            tr.appendChild(aika);
            tr.appendChild(tapahtuma);
            
            tabel.querySelector("tbody").appendChild(tr);

            /* const li = document.createElement("li");
            const spanStart = document.createElement("span");
            const spanEnd = document.createElement("span");
            spanStart.innerText = ilmoitus.kaupunki;
            spanStart.id = "start"
            spanEnd.innerText = ilmoitus.tapahtuma;
            spanEnd.id = "end"
            li.appendChild(spanStart);
            li.appendChild(spanEnd);
            ul.appendChild(li); */

            const marker = setMapPoints(ilmoitus);
            markers.addLayer(marker);
        });
    }
    map.addLayer(markers);
}

const getMap = () => map;