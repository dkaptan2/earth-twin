# Earth Twin

Earth Twin is an interactive 3D globe explorer built for the web. It allows users to navigate from a planetary view down to city-scale terrain and buildings, search for places around the world, and interact with mapped urban structures through a clean browser-based interface.

The project is designed to feel like a lightweight digital twin prototype: visually immersive, responsive in a regular web browser, and enriched with real-world location context.

<img width="1717" height="1185" alt="image" src="https://github.com/user-attachments/assets/abcd0876-0673-4ad6-b307-ede6ae7275f1" />

## Features

- Interactive 3D Earth rendered in the browser with CesiumJS
- Smooth navigation from global view to city-scale exploration
- Search with autocomplete suggestions for cities, landmarks, and regions
- 3D buildings rendered from OpenStreetMap data
- Clickable building selection with contextual information
- Search result markers and labels for better location relevance
- Terrain and global imagery layers for a more realistic experience
- Enriched descriptions using public geographic and knowledge sources
- Responsive control panel with city shortcuts and visualization toggles

## Demo Goals

This project was built to demonstrate:

- browser-based 3D geospatial visualization
- real-world map and terrain streaming
- autocomplete geocoding workflows
- interaction with 3D tiled building data
- public API integration for place enrichment
- UI/UX decisions for technical product demos

<img width="1718" height="1179" alt="image" src="https://github.com/user-attachments/assets/4ded107d-f099-42be-a0e6-8acce9bc3c99" />

## Tech Stack

- **CesiumJS** for 3D globe rendering and geospatial interaction
- **Vite** for frontend tooling and development
- **JavaScript** for application logic
- **OpenStreetMap / Cesium OSM Buildings** for building data
- **Cesium World Terrain / imagery services** for terrain and globe layers
- **Nominatim** for reverse geocoding and location context
- **Wikipedia / Wikidata** for description and fact enrichment

## How It Works

Earth Twin combines several layers of functionality:

1. **CesiumJS** renders the globe, terrain, imagery, and 3D buildings.
2. A custom **search interface** provides location suggestions and camera fly-to behavior.
3. Search results are refined into more useful views by centering and labeling the selected place.
4. Clicking on buildings pulls available building metadata and enriches it with public geographic context.
5. Public knowledge sources are used to improve the quality of descriptions and display extra facts for places when available.

## Project Structure

```bash
earth-twin/
├── src/
│   ├── main.js
│   └── style.css
├── index.html
├── package.json
├── vite.config.js
└── README.md

<img width="1719" height="1184" alt="image" src="https://github.com/user-attachments/assets/c7ed6eb8-630c-4616-8323-a8abf53fac8c" />
