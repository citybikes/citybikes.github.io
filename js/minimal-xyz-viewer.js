
// Source: https://gist.github.com/jsanz/e8549c7bffd442235a942695ffdaf77d

const TILE_SIZE = 256;
const WEBMERCATOR_R = 6378137.0;
const DIAMETER = WEBMERCATOR_R * 2 * Math.PI;
const BASEMAP_URL = 'https://cdn.digitransit.fi/map/v2/hsl-map-256/{z}/{x}/{y}{size}.png' + API_KEY;
const CARTO_LAYER = 'https://cartocdn-ashbu.global.ssl.fastly.net/jsanz/api/v1/map/named/tpl_bba0a17c_3ca7_11e6_8eeb_0ecfd53eb7d3/all/{z}/{x}/{y}.png';

function mercatorProject(lonlat){
    let x = DIAMETER * lonlat[0] / 360.0;
    let sinlat = Math.sin(lonlat[1] * Math.PI / 180.0);
    let y = DIAMETER * Math.log((1 + sinlat) / (1 - sinlat)) / (4 * Math.PI);
    return [DIAMETER / 2 + x, DIAMETER - (DIAMETER / 2 + y)];
}
// console.log(Mercator.project([-3,41]))

function getVisibleTiles(clientWidth, clientHeight, center, zoom) {
    let centerm = mercatorProject(center);
    // zoom + centerm -> centerpx
    let centerpx = [
        centerm[0] * TILE_SIZE * Math.pow(2, zoom) / DIAMETER,
        centerm[1] * TILE_SIZE * Math.pow(2, zoom) / DIAMETER
    ];

    // xmin, ymin, xmax, ymax
    let bbox = [
        Math.floor((centerpx[0] - clientWidth / 2) / TILE_SIZE),
        Math.floor((centerpx[1] - clientHeight / 2) / TILE_SIZE),
        Math.ceil((centerpx[0] + clientWidth / 2) / TILE_SIZE),
        Math.ceil((centerpx[1] + clientHeight / 2) / TILE_SIZE)
    ];
    let tiles = [];
    //xmin, ymin, xmax, ymax
    for (let x = bbox[0]; x < bbox[2]; ++x) {
        for (let y = bbox[1]; y < bbox[3]; ++y) {
            let [px, py] = [
                x * TILE_SIZE - centerpx[0] + clientWidth / 2,
                y * TILE_SIZE - centerpx[1] + clientHeight / 2
            ];
            tiles.push({ x, y, zoom, px, py });
        }
    }
    return tiles;
}

function renderTile(container, tile, basemap) {
  const img = document.createElement('img');
  img.style.position = 'absolute';
  img.style.top = tile.py + 'px';
  img.style.left = tile.px + 'px';
  img.style.width = TILE_SIZE + 'px';
  img.style.height = TILE_SIZE + 'px';
  img.src = basemap
    .replace('{x}', tile.x)
    .replace('{y}', tile.y)
    .replace('{z}', tile.zoom)
    .replace('{size}', (window.devicePixelRatio > 1) ? '@2x' : '');
  container.appendChild(img);
}

function CartoMap(container, center, zoom, layers) {
    let tiles = getVisibleTiles(container.clientWidth, container.clientHeight, center, zoom);
    for (let layer of layers){
        for (let tile of tiles) {
            renderTile(container, tile, layer);
        }
    }
}

function ShowMap(loc, container) {
    window.addEventListener('resize', () => {
        container.innerHTML = '';
        renderMap(loc, container);
    });
    renderMap(loc, container);
}

function renderMap(loc, container) {
  const map = CartoMap(
    container,
    [loc.coords.longitude, loc.coords.latitude],
    15,
    [BASEMAP_URL]
  );

  const marker = document.createElement('div');
  marker.innerHTML = `
    <svg id="position-marker" viewbox="-100 -100 200 200" fill="transparent">
      <circle cx="0" cy="0" r="25" />
      <circle cx="0" cy="0" r="45" />
      <circle cx="0" cy="0" r="63" />
    </svg>
  `;
  marker.style.position = 'absolute';
  marker.style.top = `${container.clientHeight / 2 - marker.clientHeight / 2}px`;
  marker.style.left = `${container.clientWidth / 2 - marker.clientWidth / 2}px`;

  container.appendChild(marker);
}
