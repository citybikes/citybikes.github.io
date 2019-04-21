const helsinkiUrl = "https://api.digitransit.fi/routing/v1/routers/hsl/bike_rental";
const turkuUrl = "https://api.digitransit.fi/routing/v1/routers/waltti/bike_rental";

function getURLParameterValue(name) {
  let param = decodeURI(
    (RegExp(name + '=' + '(.+?)(&|$)', 'i').exec(location.search)||[,null])[1]
  );
  // Strip any trailing slash
  return param.replace(/\/$/, '');
}

function getURLParameterField(name) {
  let param = decodeURI(
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
    url: getLocationUrl(),
    headers: {
      Accept : "application/json; charset=utf-8",
      "Content-Type": "application/json; charset=utf-8"
    },
    success : function(data) {

      // Find distance from here to each station
      $.each(data.stations, function(key, val) {
        val.distance = Math.round(distanceBetweenLocAndStation(loc, val));
      });

      // Sort by closest to here
      data.stations.sort(compareDistances);

      ShowStations(data.stations);
    }
  });
}

/**
 * Show sorted list of stations
 * @param stations
 */
function ShowStations(stations) {
  // Reset list
  $("#live-geolocation").html('Closest:');
  $("ul").empty();

  // Update list
  $.each(stations, function(key, val) {

    let totalSlots = val.bikesAvailable + val.spacesAvailable;
    let slotDivStart = '<div class="city-bike-column';
    let slotDivEnd = '"></div>';
    let slots = '';

    for (i = 0; i < val.bikesAvailable; i++) {
      slots += slotDivStart + ' available' + slotDivEnd;
    }
    for (i = 0; i < val.spacesAvailable; i++) {
      slots += slotDivStart + slotDivEnd;
    }

    const map_link = 'https://www.google.com/maps/place/' + val.y + ',' + val.x;
    $('#metro-list').append(
      $('<li class="station">').append(
        // '<span class="dist">' + val.id + '</span>' +
        '<a target="citybike-map" href="' + map_link + '">' +
        val.name +
        '</a>' +
        ' <span class="dist">' +
        numberWithSpaces(val.distance) + '&nbsp;m' +
        ' ' + val.bikesAvailable + '/' + totalSlots + '</span>' +
        '<div class="slots">' + slots + '</div>'
      ));
  });
}

function ShowClosestError() {
  $("#live-geolocation").html('Dunno closest.');
}

$(document).ready(function() {

  // Load stations from API
  $.ajax({
    url: getLocationUrl(),
    headers: {
      Accept : "application/json; charset=utf-8",
      "Content-Type": "application/json; charset=utf-8"
    },
    success : function(data) {

      // Show in list
      $.each(data.stations, function(key, val) {
        $('#metro-list').append(
          $('<li class="station">').append(val.name));
      });

      // Do we have lat/lon parameters?
      if (getURLParameterValue("lat") !== "null" &&
        getURLParameterValue("lon") !== "null" ) {
        let loc = {
          coords: {
            latitude: getURLParameterValue("lat"),
            longitude: getURLParameterValue("lon")
          }
        };
        ShowClosest(loc);
      }
      // Do we have an ID parameter?
      else if (getURLParameterValue('id') !== 'null') {
        let id = getURLParameterValue('id').toUpperCase();
        let found = false;
        $.each(data.stations, function(key, val) {
          if (val.id === id) {
            let loc = {
              coords: {
                latitude: val.y,
                longitude: val.x
              }
            };
            found = true;
            ShowClosest(loc);
            return false;
          }
        });
        if (!found) {
          $("#live-geolocation").html(id + ' not found. Available IDs:');
          $("ul").empty();
          $.each(data.stations, function(key, val) {
            $('#metro-list').append(
              $('<li class="station">').append(val.id + ' ' + val.name)
            );
          });
        }
      }
      // Do we have a name parameter?
      else if (getURLParameterValue('name') !== 'null') {
        let name = getURLParameterValue('name').toLowerCase();
        $.each(data.stations, function(key, val) {
          // If substring found
          if (val.name.toLowerCase().indexOf(name) > -1) {
            let loc = {
              coords: {
                latitude: val.y,
                longitude: val.x
              }
            };
            ShowClosest(loc);
            return false;
          }
        });
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
