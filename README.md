# Subsurface Climate Modes

Interactive viewer of regional ocean climate variability modes in three depth layers (surface, upper 100 m and upper 700 m), and of how the leading principal component (PC1) of each region compares with regional and coastal sea level.

**Live viewer:** https://cristina-radin.github.io/ml-climate-modes-explorer/

## What you can do

- Pick an ocean layer on the depth ruler.
- Drag, scroll or pinch the map to explore the 22 clusters over real coastlines.
- Choose a region to compare its PC1 with satellite sea level, for 1993–2022 or the full 1955–2022 record, with the correlations for each region.

## Scientific reference

This interactive viewer presents visualizations of results published in:

Radin, C., & Nieves, V. (2024). Unveiling Regional Climate Patterns Through Global Subsurface Ocean Temperature Data: An AI Multi-Layer Analysis Framework. *Earth Systems and Environment*, 8, 1673–1681. https://doi.org/10.1007/s41748-024-00409-w

The original article is licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).

Interactive visualizations developed by Cristina Radin. The visualizations may adapt the presentation of the published results; please refer to the original article for the scientific methodology and interpretation.

## Repository layout

```
index.html               page structure
styles.css               styles
app.js                   map, region table and chart
data/regions.js          cluster maps and regional time series
data/coastline.js        land outline
scripts/build_data.py    builds data/regions.js
scripts/build_coastline.mjs  builds data/coastline.js
```

The viewer is static and needs no server or build step. Open `index.html` in a browser, or publish the repository with GitHub Pages (Settings, Pages, deploy from the `main` branch, root folder).

## Contact

Cristina Radin  
cradin@mpi-bremen.de

## Licence

The source code of the viewer (`index.html`, `styles.css`, `app.js` and `scripts/`) is released under the MIT licence, see [LICENSE](LICENSE). The licence covers the code only. The scientific results and data shown keep the terms of their original sources listed above.
