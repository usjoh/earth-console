# Attribution

Earth Console combines local app code with public data, cached API outputs, and third-party web assets.

## Natural Earth

Present-day country geometry and labels use Natural Earth 1:110m Admin 0 country data.

- Source: https://www.naturalearthdata.com/
- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- License/status: public domain. Natural Earth states that no permission or credit is required, but Earth Console cites it for provenance.

## GPlates Web Service and Muller2019

Past point reconstructions, coastlines, and plate polygons are precomputed from GPlates Web Service using the Muller2019 model.

- GPlates Web Service: https://gws.gplates.org/
- Model docs: https://gwsdoc.gplates.org/models/
- Model: MULLER2019 / Muller2019
- Data license: Creative Commons Attribution 4.0 International
- License text: https://creativecommons.org/licenses/by/4.0/
- Model data license note: https://www.earthbyte.org/webdav/ftp/Data_Collections/Muller_etal_2019_Tectonics/License.txt

Model citation:

Muller, R. D., Zahirovic, S., Williams, S. E., Cannon, J., Seton, M., Bower, D. J., Tetley, M. G., Heine, C., Le Breton, E., Liu, S., Russell, S. H. J., Yang, T., Leonard, J., and Gurnis, M. (2019), A global plate model including lithospheric deformation along major rifts and orogens since the Triassic. Tectonics, 38. https://doi.org/10.1029/2018TC005462

Earth Console caches, compacts, and transforms GPlates Web Service outputs for browser performance. These transformed files are stored in `public/data`.

## Three-Globe Example Textures

The present-day Earth texture, topology/bump map, and star field were downloaded from the `three-globe` example image set.

- Project: https://github.com/vasturiano/three-globe
- License: MIT
- Local files:
  - `public/assets/earth-blue-marble.jpg`
  - `public/assets/earth-topology.png`
  - `public/assets/night-sky.png`

Texture provenance should be tightened if this project later becomes a broadly promoted public educational site. A future cleanup could replace these with explicitly sourced NASA/public-domain imagery.

## Local Earth Console Assets

The following assets are project-created scenario or style assets:

- `public/assets/deep-ocean.svg`
- `public/assets/roblox-ocean.svg`
- `public/assets/roblox-sky.svg`

Future scenario drift vectors and future land movement layers are local illustrative sketches. They are not validated scientific forecasts.
