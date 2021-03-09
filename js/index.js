/*jshint esversion: 8 */
'use strict';

//proxy rss sivulle
const proxy = 'https://cors.bridged.cc/';
let map = null;
let data = null;
let filter = null;
const suomenKoordinaatit = [65.9, 25.74];

let control;
//Alussa anna helsingin koordinaatit
let nykyisetKoordinaatit = [60.17, 24.94];
let havaintoasemmaKoordinaatit = null;

//Iconien kokojenmukaan 
const LeafIconSmall = L.Icon.extend({
    options: {
        iconSize: [24, 24],
        popupAnchor: [0, -12],
    }
});
const LeafIconMid = L.Icon.extend({
    options: {
        iconSize: [32, 32],
        popupAnchor: [0, -12],
    }
});
const LeafIconLarge = L.Icon.extend({
    options: {
        iconSize: [48, 48],
        popupAnchor: [0, -12],
    }
});

//Kartta kuvakkeiden linkit
const tieliikenneUrl = './icons/tieliikenne.png',
    talopaloUrl = './icons/talopalo.png',
    tuliUrl = './icons/palohalytys.png',
    yleinenUrl = './icons/yleinen.png';
//Ilmoitus obejekti, joissa on kaikki saatu tieto hätätapauksesta
class Ilmoitus {
    constructor(nkaupunki, ntapahtuma, naika, nkoordinaatit, nkoko) {
        this.kaupunki = nkaupunki;
        this.tapahtuma = ntapahtuma;
        this.aika = naika;
        this.koordinaatit = nkoordinaatit;
        this.koko = nkoko;
    }
}

//laittaa kartan sivustolle
const loadMap = () => {
    map = L.map('map').setView(suomenKoordinaatit, 5);

    //Kun zoomia on otettu takaisin tarpeeksi kauas paluta hätätapaukset ja poista kartalla olevat reitit
    map.on('zoomend', () => {
        if (filter != "default" && map.getZoom() <= 7) {
            updateList("default");
            if(control != null){
                map.removeControl(control);
                control = null;
            }
        }
    })

    //Tee kartta
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

};

//Hae RSS syötteestä tiedot ja tallenna ne objektiin, jotta niitä voi käyttää kartassa.)
const getData = async () => {

    const petoRSS = `${proxy}http://www.peto-media.fi/tiedotteet/rss.xml`;
    let dataTaulu = [];

    //Käännä teksti iso-8859-1 muodosta.
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
const setMapPoints = (tapaus) => {
    let tapausIcon = null;

    //vaihda kartalla olevan kuvakkeen koko hätätapauksen koosta riippuen
    //jos tapauksen koosta ei ole tieto pistetään kuvaka pienimmäksi
    switch (tapaus.koko) {
    case "pieni":
        if (tapaus.tapahtuma.includes("rakennuspalo")) tapausIcon = new LeafIconSmall({
            iconUrl: talopaloUrl
        });
        else if (tapaus.tapahtuma.includes("palohälytys")) tapausIcon = new LeafIconSmall({
            iconUrl: tuliUrl
        });
        else if (tapaus.tapahtuma.includes("tieliikenneonnettomuus")) tapausIcon = new LeafIconSmall({
            iconUrl: tieliikenneUrl
        });
        else tapausIcon = new LeafIconSmall({
            iconUrl: yleinenUrl
        });
        break;
    case "keskisuuri":
        if (tapaus.tapahtuma.includes("rakennuspalo")) tapausIcon = new LeafIconMid({
            iconUrl: talopaloUrl
        });
        else if (tapaus.tapahtuma.includes("palohälytys")) tapausIcon = new LeafIconMid({
            iconUrl: tuliUrl
        });
        else if (tapaus.tapahtuma.includes("tieliikenneonnettomuus")) tapausIcon = new LeafIconMid({
            iconUrl: tieliikenneUrl
        });
        else tapausIcon = new LeafIconMid({
            iconUrl: yleinenUrl
        });
        break;

    case "suuri":
        if (tapaus.tapahtuma.includes("rakennuspalo")) tapausIcon = new LeafIconLarge({
            iconUrl: talopaloUrl
        });
        else if (tapaus.tapahtuma.includes("palohälytys")) tapausIcon = new LeafIconLarge({
            iconUrl: tuliUrl
        });
        else if (tapaus.tapahtuma.includes("tieliikenneonnettomuus")) tapausIcon = new LeafIconLarge({
            iconUrl: tieliikenneUrl
        });
        else tapausIcon = new LeafIconLarge({
            iconUrl: yleinenUrl
        });
        break;
    default:
        console.log("Ei toiminu");
        tapausIcon = new LeafIconSmall({
            iconUrl: yleinenUrl
        });
        break;
    }
    const marker = L.marker(tapaus.koordinaatit, {
        icon: tapausIcon
    });
    //Markerin teksti
    marker.bindPopup(`<b>${formatTime(tapaus)}</b><br>${tapaus.kaupunki}: ${tapaus.tapahtuma}`);
    return marker;
};

//Hea koordinaatit kaupungit.js tiedostosta
const getKoordinaatit = (kaupunki) => {
    let koordinaatit = kaupungit.find(etsiKaupunki => etsiKaupunki.name === kaupunki);
    if (koordinaatit === undefined) {
        return getUnknownKoordinaatit(kaupunki);
    }
    return [koordinaatit.coordinates[1], koordinaatit.coordinates[0]];
};



//Muuta saatu xml tiedosto ilmoitus listaksi
const parseXmlData = async (data) => {
    let ilmoitukset = [];
    const items = data.querySelector('channel').querySelectorAll('item');

    //Tee jokaisesta tiedokkeesta oma lista tietue.
    for (let item = 0; item < items.length - 1; item++) {
        const kaupunki = items[item].querySelector('title').innerHTML.split(',')[0];
        const tapahtuma = items[item].querySelector('title').innerHTML.split(',')[1];
        const aika = new Date(items[item].querySelector('pubDate').innerHTML);
        const koordinaatit = await getKoordinaatit(kaupunki.split('/')[0]);
        let koko = "pieni";
        if (tapahtuma.split(": ").length >= 2) koko = tapahtuma.split(":")[1].replace(/ /g, '');

        ilmoitukset.push(new Ilmoitus(kaupunki, tapahtuma, aika, koordinaatit, koko));
    }

    return ilmoitukset;
};

//Printaa sivulle tiedot ul listaan
//Voi antaa määrän, mutta jos ei anna tulostaa funktio kaikki tiedossa olevat sivulle 
const printToSite = async (amount = -1, filter = null) => {
    data = await getData();
    const markers = L.markerClusterGroup({
        maxClusterRadius: 20
    });
    const tabel = document.querySelector('#tapaukset');


    if (amount >= 0) {
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
    } else {
        const menu = document.querySelector("select");
        const setKaupauningit = new Set();

        menu.onchange = () => {
            showKaupunki(menu.value);
        }

        for (const ilmoitus in data) {
            createTableRow(data, ilmoitus, tabel.querySelector("tbody"));
            setKaupauningit.add(data[ilmoitus].kaupunki);
            const marker = setMapPoints(data[ilmoitus]);
            markers.addLayer(marker);
        }

        const arrayKaupungit = Array.from(setKaupauningit).sort();
        arrayKaupungit.forEach((kaupunki) => {
            const item = document.createElement("option");
            item.value = kaupunki;
            item.innerText = kaupunki;
            menu.appendChild(item);
        })
    }
    map.addLayer(markers);
};

//Kaupunki filtteröinti.
const showKaupunki = (kaupunki) => {
    //Jos filtteristä on painettu "kaikki" lennätä kamera takaisin niin, että koko suomi näkyy
    if (kaupunki !== "default") {
        const koordinaatit = getKoordinaatit(kaupunki.split('/')[0]);
        nykyisetKoordinaatit = koordinaatit;
        map.flyTo(koordinaatit, 10);

        updateList(kaupunki);
        getWeather(kaupunki.split('/')[0]);
    } else {

        map.flyTo(suomenKoordinaatit, 5);
        updateList();
    }
    //Muuta filtteri annetuksi kaupungiksi
    filter = kaupunki;
}

//Päivitä tiedotteiden lista
const updateList = (kaupunki = "default") => {
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

    let dataList = data;
    if (kaupunki !== "default") {
        dataList = data.filter(tieto => tieto.kaupunki === kaupunki);
    }

    for (const ilmoitus in dataList) {
        createTableRow(dataList, ilmoitus, tbody);
    }

    tr.appendChild(Kaupunki);
    tr.appendChild(Aika);
    tr.appendChild(Tapahtuma);
    thead.appendChild(tr);
    table.appendChild(thead);
    table.appendChild(tbody);
    div.appendChild(table);
}

//Hea ensiksi paikkakunnan lähin sää asemma ja sen jälkeen hea sen asemman luvut
const getWeather = async (kaupunki) => {
    const url = `https://www.ilmatieteenlaitos.fi/api/weather/forecasts?place=${kaupunki.toLowerCase()}`;
    let stationWind = "Ei tietoa";
    let stationVisibility = "Ei tietoa";
    let stationName = "Ei tietoa";
    let stationTemp = "Ei tietoa";

    const station = await fetch(url)
        .then(response => response.json())
        .then(weatherData => weatherData.observationStations.stationData[0])

    const weather = await fetch(`https://www.ilmatieteenlaitos.fi/observation-data?station=${station.id}`)
        .then(response => response.json())

    //Kaikki annetut asemmat ovat sääasemia, joten tarkastus lämpötilalle on turha
    stationTemp = weather.t2m[weather.t2m.length - 1][1] + " C";
    havaintoasemmaKoordinaatit = [station.coordinates.latitude.text, station.coordinates.longitude.text]
    //Testaa mitä tietoa on asemmalla saatavilla
    if (station.names.hasOwnProperty("name")) stationName = station.names.name.text;
    else stationName = station.names[0].text;
    //Näkyvyys havaintoasemmalla
    if (weather.hasOwnProperty("Visibility")) {
        const mToKm = weather.Visibility[weather.Visibility.length - 1][1] / 1000;
        stationVisibility = mToKm.toFixed(2) + " km";
    }
    //Tuulen nopeus havaintoasemmalla
    if (weather.hasOwnProperty("WindSpeedMS")) stationWind = weather.WindSpeedMS[weather.t2m.length - 1][1] + " m/s";


    const htmlWeather = document.querySelector("#lampo");
    const p = document.querySelector("#weather-city-text");
    const windTxt = document.querySelector("#weather-wind-text");
    const visibilityTxt = document.querySelector("#weather-visibility-text");

    p.innerHTML = stationName;
    windTxt.innerHTML = stationWind;
    visibilityTxt.innerHTML = stationVisibility;
    htmlWeather.innerHTML = stationTemp;
}

//Rakentaa taulukkoon uuden rivin
const createTableRow = (dataList, ilmoitus, tbody) => {
    const kaupunki = document.createElement("td");

    const aika = document.createElement("td");
    const tapahtuma = document.createElement("td");

    const tr = document.createElement("tr");
    //Kun riviä klikataan lennätä kartta oikeaan kaupunkiin.
    tr.addEventListener("click", () => {
        map.flyTo(dataList[ilmoitus].koordinaatit, 10);
    });
    kaupunki.innerText = dataList[ilmoitus].kaupunki;
    tapahtuma.innerText = dataList[ilmoitus].tapahtuma;

    aika.innerText = formatTime(dataList[ilmoitus]);
    tr.appendChild(kaupunki);
    tr.appendChild(aika);
    tr.appendChild(tapahtuma);

    tbody.appendChild(tr);
}

//Rakentaa ajan näyttettävään muotoon
const formatTime = (data) => {
    const dd = data.aika.getDate();
    const mm = data.aika.getMonth() + 1;
    const yy = data.aika.getFullYear();

    const hh = data.aika.getHours();
    const min = data.aika.getMinutes();
    const ss = data.aika.getSeconds();
    return `${dd}.${mm}.${yy} - ${hh}:${min}:${ss}`;
}

//Hae annetun kaupungin koordinaatit
const getUnknownKoordinaatit = async (kaupunki) => {
    const koordinaatit = await fetch(`http://api.digitransit.fi/geocoding/v1/search?text=${kaupunki}`)
        .then(response => response.json())
        .then(data => data.features[0].geometry.coordinates);
    return [koordinaatit[1], koordinaatit[0]];
}

//Tee kartalle reitti havaintoasemmalle ja filtteröidyn kaupungin välille 
const getRoute = () =>{
    if(control != null) map.removeControl(control);
    try {
        control = L.Routing.control({
            waypoints: [
              L.latLng(nykyisetKoordinaatit),
              L.latLng(havaintoasemmaKoordinaatit)
            ],
            router: L.Routing.mapbox('pk.eyJ1IjoidmlsbGVlMDAiLCJhIjoiY2tscHU4a3AwMTZheDJ3cXJsMHpybTBlMyJ9.mFmrob0en09ghXHVfmoI6Q')
          }).addTo(map);
    } catch {
        console.log("koordinaateissa ongelmia");
    }
}
