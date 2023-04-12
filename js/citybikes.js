const HELSINKI_URL = "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql" + API_KEY;
const TURKU_URL = "https://api.digitransit.fi/routing/v1/routers/waltti/index/graphql" + API_KEY;

const stationsQuery = `query {
  stations: bikeRentalStations {
    y: lat
    x: lon
    id: stationId
    name
    bikesAvailable
    spacesAvailable
  }
}`;
const nearestQuery = `query($lat: Float!, $lon: Float!) {
  nearest(
    lat: $lat,
    lon: $lon,
    maxDistance: 1000000,
    maxResults: 1000,
    filterByPlaceTypes: BICYCLE_RENT
  ) {
    edges {
      node {
        distance
        place {
          ...on BikeRentalStation {
            y: lat
            x: lon
            id: stationId
            name
            bikesAvailable
            spacesAvailable
          }
        }
      }
    }
  }
}`;

function getURLParameterValue(name) {
  const param = decodeURI(
    (RegExp(name + '=' + '(.+?)(&|$)', 'i').exec(location.search)||[,null])[1]
  );
  // Strip any trailing slash
  return param.replace(/\/$/, '');
}

function getURLParameterField(name) {
  const param = decodeURI(
    (RegExp(name + '(&|$)', 'i').exec(location.search)||[,null])[1]
  );
  // Strip any trailing slash
  return param.replace(/\/$/, '');
}

function distanceBetweenLocAndStation(loc, station) {
  return getDistanceFromLatLonInMetres(
    loc.coords.latitude,
    loc.coords.longitude,
    station.y,
    station.x);
}


function getLocationUrl() {
  // Helsinki or Turku?
  if (getURLParameterField("turku") !== "null") {
    return TURKU_URL;
  }
  return HELSINKI_URL;
}

function ShowClosest(loc) {
  const url = getLocationUrl();
  const data = {
    query: nearestQuery,
    variables: {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
    },
  };
  const headers = {
    "Accept": "application/json; charset=utf-8",
    "Content-Type": "application/json; charset=utf-8",
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  })
  .then(response => response.json())
  .then(data => {
    const stations = data.data.nearest.edges.map((edge, index) => {
      edge.node.place.geodesic_distance = Math.round(distanceBetweenLocAndStation(loc, edge.node.place));
      edge.node.place.distance = edge.node.distance;
      return edge.node.place;
    });

    document.getElementById("live-geolocation").innerHTML = '&nbsp;';
    ShowMap(loc, document.getElementById("map"));
    ShowStations(stations);
  })
  .catch(error => console.error("Error fetching nearest stations:", error));
}


function ShowStations(stations) {
  const ul = document.querySelector('ul');

  // Reset list
  ul.innerHTML = '';

  // Update list
  stations.forEach(function(val, key) {
    const totalSlots = val.bikesAvailable + val.spacesAvailable;
    let slots = '';

    for (let i = 0; i < val.bikesAvailable; i++) {
      slots += '<div class="city-bike-column available"></div>';
    }
    for (let i = 0; i < val.spacesAvailable; i++) {
      slots += '<div class="city-bike-column"></div>';
    }

    const distance = val.distance == null ? '' :
      numberWithSpaces(val.distance) + '&nbsp;m ';

    const map_link = `https://www.google.com/maps/place/${val.y},${val.x}`;
    const li = document.createElement('li');
    li.classList.add('station');
    li.setAttribute('id', val.id);
    li.innerHTML = `<a target="citybike-map" href="${map_link}">${val.name}</a> ` +
      `<span class="dist">${distance}${val.bikesAvailable}/${totalSlots}</span>` +
      `<div class="slots">${slots}</div>`;
    ul.appendChild(li);
  });
}


function ShowClosestError() {
  document.getElementById('live-geolocation').innerHTML = 'Dunno closest.';
}

/**
 * Show an error when station not found
 * @param needle
 * @param stations Optional. Include for IDs, omit for names.
 */
function ShowNotFound(needle, stations) {
  const liveGeolocation = document.getElementById('live-geolocation');
  const ul = document.querySelector('ul');

  if (stations == null) {
    liveGeolocation.innerHTML = needle + ' not found. Available names:';
  } else {
    liveGeolocation.innerHTML = needle + ' not found. Available IDs:';
    ul.innerHTML = '';
    stations.forEach(function(val) {
      const li = document.createElement('li');
      li.classList.add('station');
      li.innerHTML = `${val.id} ${val.name}`;
      ul.appendChild(li);
    });
  }
}

/**
 * Show just some stations, or an error.
 * @param someStations Array of one or more stations to show.
 * @param needle For error handling. ID(s) or name(s).
 * @param allStations For error handling. Include for IDs, omit for names.
 */
function ShowStationsSubset(someStations, needle, allStations) {
  const liveGeolocation = document.getElementById('live-geolocation');

  if (someStations.length > 1) {
    liveGeolocation.innerHTML = '';
    ShowStations(someStations);
  } else if (someStations.length === 1 && someStations[0] != null) {
    const loc = {
      coords: {
        latitude: someStations[0].y,
        longitude: someStations[0].x,
      }
    };
    ShowClosest(loc);
  } else {
    ShowNotFound(needle, allStations);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Load stations from API
  fetch(getLocationUrl(), {
    method: "POST",
    headers: {
      Accept: "application/json; charset=utf-8",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ query: stationsQuery }),
  })
    .then((response) => response.json())
    .then((data) => {
      data = data.data;
      const metroList = document.getElementById("metro-list");

      // Show in list
      data.stations.forEach(function (val) {
        const station = document.createElement("li");
        station.className = "station";
        station.id = val.id;
        station.innerHTML = val.name;
        metroList.appendChild(station);
      });

      // Do we have lat/lon parameters?
      if (
        getURLParameterValue("lat") !== "null" &&
        getURLParameterValue("lon") !== "null"
      ) {
        const loc = {
          coords: {
            latitude: getURLParameterValue("lat"),
            longitude: getURLParameterValue("lon"),
          },
        };
        ShowClosest(loc);
      }
      // Do we have an ID parameter?
      else if (getURLParameterValue("id") !== "null") {
        const id = getURLParameterValue("id").toUpperCase();
        const foundStation = data.stations.find(function (station) {
          return station.id === id;
        });
        ShowStationsSubset([foundStation], id, data.stations);
      }
      // Do we have multiple IDs parameter?
      else if (getURLParameterValue("ids") !== "null") {
        const ids = getURLParameterValue("ids").split(",");
        const filteredStations = data.stations.filter(function (station) {
          return ids.includes(station.id);
        });
        ShowStationsSubset(filteredStations, ids, data.stations);
      }
      // Do we have a name parameter?
      else if (getURLParameterValue("name") !== "null") {
        const name = getURLParameterValue("name").toLowerCase();
        const foundStation = data.stations.find(function (station) {
          return station.name.toLowerCase().includes(name);
        });
        ShowStationsSubset([foundStation], name);
      }
      // Do we have a multiple names parameter?
      else if (getURLParameterValue("names") !== "null") {
        const originalNames = getURLParameterValue("names");
        const names = originalNames.toLowerCase().split(",");
        const filteredStations = data.stations.filter(function (station) {
          return names.includes(station.name.toLowerCase());
        });
        ShowStationsSubset(filteredStations, originalNames);
      }
      // Otherwise boot up the satellites
      else if (geoPosition.init()) {
        const liveGeolocation = document.getElementById("live-geolocation");
        liveGeolocation.innerHTML = "Checking...";
        lookupLocation();
      } else {
        const liveGeolocation = document.getElementById("live-geolocation");
        liveGeolocation.innerHTML = "Dunno.";
      }
    });
});
