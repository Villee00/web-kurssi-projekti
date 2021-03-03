'use strict';

//proxy rss sivulle
const proxy = 'https://cors.bridged.cc/'
let map = null;
//Ilmoitus objecti, joissa on kaikki saatu tieto hätätapauksesta
class Ilmoitus {
    constructor(nkaupunki,ntapahtuma,naika) {
        this.kaupunki = nkaupunki;
        this.tapahtuma = ntapahtuma;
        this.aika = naika;
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
const setMapPoints =  (tapaus) =>{
    const url = `http://api.digitransit.fi/geocoding/v1/search?text=${tapaus.kaupunki}`

    fetch(url)
    .then((response) => response.json())
    .then((tiedot) => {
        const marker = L.marker([tiedot.features[0].geometry.coordinates[1],tiedot.features[0].geometry.coordinates[0]]).addTo(map);
        marker.bindPopup(`<b>${tapaus.kaupunki}</b><br>${tapaus.tapahtuma}`);
    })
}

//Muuta saatu xml tiedosto ilmoitus listaksi
const parseXmlData =  (data) =>{
    let ilmoitukset = [];
    const items = data.querySelector('channel').querySelectorAll('item');
    items.forEach(tiedote => {
        const kaupunki = tiedote.querySelector('title').innerHTML.split(',')[0];
        const tapahtuma = tiedote.querySelector('title').innerHTML.split(',')[1];
        const aika = new Date(tiedote.querySelector('pubDate').innerHTML)
        ilmoitukset.push(new Ilmoitus(kaupunki, tapahtuma, aika))
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

            setMapPoints(data[item]);
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

            setMapPoints(ilmoitus);
        });
    }
}
loadMap()
printToSite(10)