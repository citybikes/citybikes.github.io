const helsinkiUrl = "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";
const turkuUrl = "https://api.digitransit.fi/routing/v1/routers/waltti/index/graphql";

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
    return turkuUrl;
  }
  return helsinkiUrl;
}

function ShowClosest(loc) {

  // Load stations from API
  $.ajax({
    method: "POST",
    url: getLocationUrl(),
    data: JSON.stringify({
      query: nearestQuery,
      variables: {
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      },
    }),
    headers: {
      Accept : "application/json; charset=utf-8",
      "Content-Type": "application/json; charset=utf-8"
    },
    success : function(data) {

      // Find distance from here to each station
      const stations = $.map(data.data.nearest.edges, function(edge, index) {
        edge.node.place.geodesic_distance =
          Math.round(distanceBetweenLocAndStation(loc, edge.node.place));
        edge.node.place.distance = edge.node.distance;
        return edge.node.place;
      });

      $("#live-geolocation").html('&nbsp;');
      ShowMap(loc, $('#map')[0]);
      ShowStations(stations);
    }
  });
}

/**
 * Show sorted list of stations
 * @param stations
 */
function ShowStations(stations) {
  // Reset list
  $("ul").empty();

  // Update list
  $.each(stations, function(key, val) {

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
    $('#metro-list').append(
      $(`<li class="station" id="${val.id}">`).append(
        `<a target="citybike-map" href="${map_link}">${val.name}</a> ` +
        `<span class="dist">${distance}${val.bikesAvailable}/${totalSlots}</span>` +
        `<div class="slots">${slots}</div>`
      ));
  });
}

function ShowClosestError() {
  $("#live-geolocation").html('Dunno closest.');
}

/**
 * Show an error when station not found
 * @param needle
 * @param stations Optional. Include for IDs, omit for names.
 */
function ShowNotFound(needle, stations) {
  if (stations == null) {
    $("#live-geolocation").html(needle + ' not found. Available names:');
  } else {
    $("#live-geolocation").html(needle + ' not found. Available IDs:');
    $("ul").empty();
    $.each(stations, function(key, val) {
      $('#metro-list').append(
        $('<li class="station">').append(`${val.id} ${val.name}`)
      );
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
  if (someStations.length > 1) {
    $("#live-geolocation").empty();
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

$(document).ready(function() {

  // Load stations from API
  $.ajax({
    method: "POST",
    url: getLocationUrl(),
    data: JSON.stringify({
      query: stationsQuery,
    }),
    headers: {
      Accept : "application/json; charset=utf-8",
      "Content-Type": "application/json; charset=utf-8"
    },
    success : function(data) {
      data = data.data;
      // Show in list
      $.each(data.stations, function(key, val) {
        $('#metro-list').append(
          $(`<li class="station" id="${val.id}">`).append(val.name));
      });

      // Do we have lat/lon parameters?
      if (getURLParameterValue("lat") !== "null" &&
        getURLParameterValue("lon") !== "null" ) {
        const loc = {
          coords: {
            latitude: getURLParameterValue("lat"),
            longitude: getURLParameterValue("lon")
          }
        };
        ShowClosest(loc);
      }
      // Do we have an ID parameter?
      else if (getURLParameterValue('id') !== 'null') {
        const id = getURLParameterValue('id').toUpperCase();
        const foundStation = data.stations.find(station => station.id === id);
        ShowStationsSubset([foundStation], id, data.stations)
      }
      // Do we have multiple IDs parameter?
      else if (getURLParameterValue('ids') !== 'null') {
        const ids = getURLParameterValue('ids').split(',');
        const filteredStations = data.stations.filter(
          station => ids.includes(station.id)
        );
        ShowStationsSubset(filteredStations, ids, data.stations);
      }
      // Do we have a name parameter?
      else if (getURLParameterValue('name') !== 'null') {
        const name = getURLParameterValue('name').toLowerCase();
        const foundStation = data.stations.find(
          station => station.name.toLowerCase().includes(name)
        );
        ShowStationsSubset([foundStation], name)
      }
      // Do we have a multiple names parameter?
      else if (getURLParameterValue('names') !== 'null') {
        const originalNames = getURLParameterValue('names');
        const names = originalNames.toLowerCase().split(',');
        const filteredStations = data.stations.filter(
          station => names.includes(station.name.toLowerCase())
        );
        ShowStationsSubset(filteredStations, originalNames);
      }
      // Otherwise boot up the satellites
      else if (geoPosition.init()) {
        $("#live-geolocation").html('Checking...');
        lookupLocation();
      } else {
        $("#live-geolocation").html('Dunno.');
      }

    } });

});
