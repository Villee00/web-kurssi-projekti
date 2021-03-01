
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
const getData = () =>{
    const petoRSS = `http://www.peto-media.fi/tiedotteet/rss.xml`
    fetch(petoRSS, {
        method: "GET"
    })
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then((data) => {
        const items = data.querySelector('channel').querySelectorAll('item');
        items.forEach(tiedote => {
            const kaupunki = tiedote.querySelector('title').innerHTML.split(',')[0];
            const tapahtuma = tiedote.querySelector('description').innerHTML.split(' ')[0];
        })
        console.log(data.querySelector('channel').querySelectorAll('item')[0].querySelector('title').innerHTML)
        console.log(data)
    })
}

//Hea jollain apilla kaupungin koordinaatit, jotta saadaan merkattua kartalle
const getCoords = (kaupunki) =>{

}
loadMap()
getData()