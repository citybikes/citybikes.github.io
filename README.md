# Helsinki and Turku city bikes

How many city bikes are at the nearest station?

No map, because you probably already know where they are anyway.

https://citybikes.github.io

If you want to use it from a fixed location, use the name (or part of a name, case-insensitive) or [ID](https://citybikes.github.io/stations.txt) of a station or lat/lon coordinates:

 * https://citybikes.github.io/?name=rautatientori
 * https://citybikes.github.io/?id=A23
 * https://citybikes.github.io/?lat=60.168333&lon=24.95625

## Turku

 * https://citybikes.github.io/?turku
 * https://citybikes.github.io/?turku&name=föri
 * https://citybikes.github.io/?turku&id=23
 * https://citybikes.github.io/?turku&lat=60.4518&lon=22.2666


## How to test locally

```sh
python3 -m http.server 8000
```

Then visit http://sitename.localhost:8000/

## See also

* https://hugovk.github.io/helometer
