'use strict';

//proxy rss sivulle
const proxy = 'https://cors.bridged.cc/'

//RSS syöteestä tallennettut tiedot
class Ilmoitus {
    constructor(nkaupunki,ncoords,ntapahtuma,naika) {
        this.kaupunki = nkaupunki;
        this.coords = ncoords;
        this.tapahtuma = ntapahtuma;
        this.aika = naika;
    }
  }

//laittaa kartan sivustolle
const loadMap = () =>{
    const map = L.map('map').setView([65.9, 25.74], 5);

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
const getCoords = async (kaupunki) =>{
    const url = `http://api.digitransit.fi/geocoding/v1/search?text=${kaupunki}`

    fetch(url)
    .then((response) => response.json())
    .then((tiedot) => {
        const test = [tiedot.bbox[2],tiedot.bbox[3]]

        return [tiedot.bbox[2],tiedot.bbox[3]]
    })
}
const parseXmlData = (data) =>{
    let ilmoitukset = [];
    const items = data.querySelector('channel').querySelectorAll('item');
    items.forEach(tiedote => {
        const kaupunki = tiedote.querySelector('title').innerHTML.split(',')[0];
        const tapahtuma = tiedote.querySelector('title').innerHTML.split(',')[1];
        const coords = 0;
        const aika = new Date(tiedote.querySelector('pubDate').innerHTML)
        ilmoitukset.push(new Ilmoitus(kaupunki, coords, tapahtuma, aika))
    })
    return ilmoitukset;
}

//Printaa sivulle tiedot ul listaan
//Jos haluaa maksimimäärän listan 
const printToSite = async (amount = -1) =>{
    const data = await getData();

    const ul = document.querySelector('ul');

    if(amount >= 0){
        for (let item = 0; item < amount; item++) {
            const li = document.createElement("li");
            const spanStart = document.createElement("span");
            const spanEnd = document.createElement("span");
            spanStart.innerText = data[item].kaupunki;
            spanStart.id = "start"
            spanEnd.innerText = data[item].tapahtuma;
            spanEnd.id = "end"
            li.appendChild(spanStart);
            li.appendChild(spanEnd);
            ul.appendChild(li);
        }
    }
    else{
        data.forEach(ilmoitus => {
            const li = document.createElement("li");
            const spanStart = document.createElement("span");
            const spanEnd = document.createElement("span");
            spanStart.innerText = ilmoitus.kaupunki;
            spanStart.id = "start"
            spanEnd.innerText = ilmoitus.tapahtuma;
            spanEnd.id = "end"
            li.appendChild(spanStart);
            li.appendChild(spanEnd);
            ul.appendChild(li);
        });
    }
}
loadMap()
printToSite(10)