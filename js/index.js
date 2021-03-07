/*jshint esversion: 8 */
'use strict';

//proxy rss sivulle
const proxy = 'https://cors.bridged.cc/';
let map = null;
let data = null;
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

};

//Hae RSS syötteestä tiedot ja tallenna ne objektiin, jotta niitä voi käyttää kartassa. (CORS ongelma vielä ei toimi))
const getData = async () =>{

    const petoRSS = `${proxy}http://www.peto-media.fi/tiedotteet/rss.xml`;
    let dataTaulu = []; 

    const decoder = new TextDecoder("iso-8859-1");
    await fetch(petoRSS)
    .then(response => response.arrayBuffer())
    .then((buffer) => {
        const str = decoder.decode(buffer);
        return new window.DOMParser().parseFromString(str, "text/xml");
    })
    .then(data => dataTaulu = parseXmlData(data));
    return dataTaulu;
};
//Hea jollain apilla kaupungin koordinaatit, jotta saadaan merkattua kartalle
const setMapPoints = (tapaus) =>{
    const marker = L.marker(tapaus.coords);
    
    marker.bindPopup(`<b>${tapaus.kaupunki}</b><br>${tapaus.tapahtuma}`);
    return marker;
};

//Hea koordinaatit kaupungit.js tiedostosta
const getCoords = (kaupunki) =>{
    let coords = kaupungit.find(etsiKaupunki => etsiKaupunki.name === kaupunki);
    if(coords === undefined){ 
        return getUnknownCoords(kaupunki);
    } 
    return [coords.coordinates[1], coords.coordinates[0]];
};



//Muuta saatu xml tiedosto ilmoitus listaksi
const parseXmlData = async (data) =>{
    let ilmoitukset = [];
    const items = data.querySelector('channel').querySelectorAll('item');
    
    for (let item = 0; item < items.length -1; item++) {
        const kaupunki = items[item].querySelector('title').innerHTML.split(',')[0];
        const tapahtuma = items[item].querySelector('title').innerHTML.split(',')[1];
        const aika = new Date(items[item].querySelector('pubDate').innerHTML);
        const coords = await getCoords(kaupunki.split('/')[0]);
        ilmoitukset.push(new Ilmoitus(kaupunki, tapahtuma, aika, coords));
    }
    
    return ilmoitukset;
};

//Printaa sivulle tiedot ul listaan
//Jos haluaa maksimimäärän listan 
const printToSite = async (amount = -1, filter = null) =>{
    data = await getData();
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
            //if(multiMarkers) markers.addLayer(marker);
            marker.addTo(map);
        }
    }
    else{
        const menu = document.querySelector("select");
        const setKaupauningit = new Set();
        
        menu.onchange = () => {
            showCity(menu.value);
        }
        data.forEach(async ilmoitus => {
            
            const kaupunki = document.createElement("td");
            
            const aika = document.createElement("td");
            const tapahtuma = document.createElement("td");
            
            const tr = document.createElement("tr");
            tr.addEventListener("click", () => {
                map.flyTo(ilmoitus.coords, 10);
            });
            kaupunki.innerText = ilmoitus.kaupunki;
            tapahtuma.innerText = ilmoitus.tapahtuma;
            
            setKaupauningit.add(ilmoitus.kaupunki);
            
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
            
            const marker = setMapPoints(ilmoitus);
            markers.addLayer(marker);
        });
        
        const arrayKaupungit = Array.from(setKaupauningit).sort();
        arrayKaupungit.forEach((city) => {
            const item = document.createElement("option");
            item.value = city;
            item.innerText = city;
            menu.appendChild(item);
        })
    }
    map.addLayer(markers);
};

const showCity = (city) => {
    if(city !== "default"){
        const coords = getCoords(city.split('/')[0]);
        map.flyTo(coords, 10);

        updateList(city);
        getWeather(city.split('/')[0]);
    }
    else{
        map.flyTo([65.9, 25.74], 5);
        updateList();
    }
}

const updateList = (city = "default") =>{
    const oldList = document.querySelector("#table-scroll")
    const div = document.createElement("div");
    oldList.after(div);
    oldList.remove();

    div.id = "table-scroll";
    const table = document.createElement("table");
    table.id = "tapaukset";
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    const Kaupunki = document.createElement("th");
    const Aika = document.createElement("th");
    const Tapahtuma = document.createElement("th");
    const tbody = document.createElement("tbody");

    Kaupunki.innerText = "Kaupunki";
    Aika.innerText = "Aika";
    Tapahtuma.innerText = "Tapahtuma";

    let filtterdList = data;
    if(city !== "default"){
        filtterdList = data.filter(tieto => tieto.kaupunki === city);
    }

    for(const ilmoitus in filtterdList){
        const kaupunki = document.createElement("td");
        
        const aika = document.createElement("td");
        const tapahtuma = document.createElement("td");
        
        const tr = document.createElement("tr");
        tr.addEventListener("click", () => {
            map.flyTo(filtterdList[ilmoitus].coords, 10);
        });
        kaupunki.innerText = filtterdList[ilmoitus].kaupunki;
        tapahtuma.innerText = filtterdList[ilmoitus].tapahtuma;
        
        const dd = filtterdList[ilmoitus].aika.getDate();
        const mm = filtterdList[ilmoitus].aika.getMonth();
        
        const hh = filtterdList[ilmoitus].aika.getHours();
        const min = filtterdList[ilmoitus].aika.getMinutes(); 
        const ss = filtterdList[ilmoitus].aika.getSeconds();
        
        aika.innerText = `${dd}.${mm} - ${hh}:${min}:${ss}`;
        tr.appendChild(kaupunki);
        tr.appendChild(aika);
        tr.appendChild(tapahtuma);
        
        tbody.appendChild(tr);
    }

    tr.appendChild(Kaupunki);
    tr.appendChild(Aika);
    tr.appendChild(Tapahtuma);
    thead.appendChild(tr);
    table.appendChild(thead);
    table.appendChild(tbody);
    div.appendChild(table);
}


const getWeather = async (city) =>{
    const url = `https://www.ilmatieteenlaitos.fi/api/weather/forecasts?place=${city.toLowerCase()}`;
    let stationWind = "Ei tietoa";
    let stationVisibility = "Ei tietoa";
    let stationName = "Ei tietoa";
    let stationTemp = "Ei tietoa";

    const station = await fetch(url,{"X-Requested-With":"XMLHttpRequest"})
    .then(response => response.json())
    .then(weatherData => weatherData.observationStations.stationData[0])
 
    const weather = await fetch(`https://www.ilmatieteenlaitos.fi/observation-data?station=${station.id}`)
    .then(response => response.json())

    stationTemp = weather.t2m[weather.t2m.length -1][1] + " C";
    if(station.names.hasOwnProperty("name")){
        stationName = station.names.name.text;
    }
    else{
        stationName = station.names[0].text;
    }

    if(weather.hasOwnProperty("Visibility")){
        const mToKm = weather.Visibility[weather.t2m.length -1][1] / 1000;
        stationVisibility = mToKm.toFixed(2) + " km"
    }
    if(weather.hasOwnProperty("WindSpeedMS")){
        stationWind = weather.WindSpeedMS[weather.t2m.length -1][1] + " m/s"
    }

    const htmlWeather = document.querySelector("#lampo");
    const p = document.querySelector("#weather-city-text");
    const windTxt = document.querySelector("#weather-wind-text");
    const visibilityTxt = document.querySelector("#weather-visibility-text");

    p.innerHTML = stationName;
    windTxt.innerHTML = stationWind;
    visibilityTxt.innerHTML = stationVisibility;
    htmlWeather.innerHTML = stationTemp;
}

async function getUnknownCoords(kaupunki) {
    const coords = await fetch(`http://api.digitransit.fi/geocoding/v1/search?text=${kaupunki}`)
        .then(response => response.json())
        .then(data => data.features[0].geometry.coordinates);
    return [coords[1], coords[0]];
}
