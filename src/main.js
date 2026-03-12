import "cesium/Build/Cesium/Widgets/widgets.css";
import * as Cesium from "cesium";

window.CESIUM_BASE_URL = "/cesiumStatic";

// token
Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhYzYzNTQyZC0xYTE5LTQ5YzYtOGE3Mi1jNjcyZDI3NmEzOTMiLCJpZCI6NDAyNjc3LCJpYXQiOjE3NzMzNDY3OTF9.niApnX5TORftj3uAc5G1wpSOC-bkqvpd408REqkQ-ak";

const cityViews = {
  newyork: {
    name: "New York",
    country: "United States",
    description: "Dense urban core with iconic skyline and global financial significance.",
    destination: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 3500),
    orientation: {
      heading: Cesium.Math.toRadians(25),
      pitch: Cesium.Math.toRadians(-40),
      roll: 0
    },
    labelPosition: Cesium.Cartesian3.fromDegrees(-74.006, 40.7128, 0)
  },
  chicago: {
    name: "Chicago",
    country: "United States",
    description: "Major Midwest city known for its lakefront skyline and dense downtown core.",
    destination: Cesium.Cartesian3.fromDegrees(-87.6298, 41.8781, 3000),
    orientation: {
      heading: Cesium.Math.toRadians(20),
      pitch: Cesium.Math.toRadians(-38),
      roll: 0
    },
    labelPosition: Cesium.Cartesian3.fromDegrees(-87.6298, 41.8781, 0)
  },
  tokyo: {
    name: "Tokyo",
    country: "Japan",
    description: "Extremely dense metropolitan region with expansive urban development.",
    destination: Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 4000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-42),
      roll: 0
    },
    labelPosition: Cesium.Cartesian3.fromDegrees(139.6917, 35.6895, 0)
  },
  paris: {
    name: "Paris",
    country: "France",
    description: "Historic European capital with recognizable urban geometry and landmarks.",
    destination: Cesium.Cartesian3.fromDegrees(2.3522, 48.8566, 3000),
    orientation: {
      heading: Cesium.Math.toRadians(15),
      pitch: Cesium.Math.toRadians(-38),
      roll: 0
    },
    labelPosition: Cesium.Cartesian3.fromDegrees(2.3522, 48.8566, 0)
  }
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function truncateText(text, maxLength = 220) {
  if (!text) return { short: "", full: "" };

  if (text.length <= maxLength) {
    return { short: text, full: text };
  }

  return {
    short: text.slice(0, maxLength).trimEnd() + "...",
    full: text
  };
}

function formatAddressParts(address = {}) {
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    "";

  const district =
    address.suburb ||
    address.neighbourhood ||
    address.city_district ||
    address.borough ||
    "";

  const country = address.country || "";

  return {
    locality,
    district,
    country
  };
}

function buildFallbackDescription({ name, category, locality, district, country, height }) {
  const parts = [];

  if (name) {
    parts.push(`${name} is a mapped ${category || "building"}`);
  } else {
    parts.push(`This is a mapped ${category || "building"}`);
  }

  if (district && locality) {
    parts.push(`located in ${district}, ${locality}`);
  } else if (locality) {
    parts.push(`located in ${locality}`);
  } else if (country) {
    parts.push(`located in ${country}`);
  }

  let sentence = parts.join(" ") + ".";

  const numericHeight = Number(height);
  if (!Number.isNaN(numericHeight) && numericHeight > 0) {
    sentence += ` Its mapped height is approximately ${numericHeight} meters.`;
  }

  return sentence;
}

function cleanWikipediaTitle(name) {
  if (!name) return null;
  return encodeURIComponent(name.replace(/ /g, "_"));
}

async function fetchWikipediaSummaryByTitle(title) {
  if (!title) return null;

  const encodedTitle = cleanWikipediaTitle(title);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`;

  try {
    const data = await fetchJson(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (data?.extract) {
      return {
        title: data.title || title,
        description: truncateText(data.extract, 260),
        source: "wikipedia"
      };
    }
  } catch (error) {
    console.warn("Wikipedia summary lookup failed:", title, error);
  }

  return null;
}

async function reverseGeocode(lat, lon) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${encodeURIComponent(lat)}` +
    `&lon=${encodeURIComponent(lon)}` +
    `&zoom=18&addressdetails=1`;

  try {
    const data = await fetchJson(url, {
      headers: {
        Accept: "application/json"
      }
    });

    return data;
  } catch (error) {
    console.warn("Reverse geocoding failed:", error);
    return null;
  }
}

async function buildRichPlaceDescription({ name, lat, lon, category, height }) {
  const [wiki, reverse] = await Promise.all([
    fetchWikipediaSummaryByTitle(name),
    reverseGeocode(lat, lon)
  ]);

  const address = reverse?.address || {};
  const { locality, district, country } = formatAddressParts(address);

  let description = "";

  if (wiki?.description) {
    description = wiki.description;
  } else if (reverse?.display_name) {
    const contextParts = [];
    if (district) contextParts.push(district);
    if (locality) contextParts.push(locality);
    if (country) contextParts.push(country);

    const context = contextParts.length ? contextParts.join(", ") : reverse.display_name;

    description =
      `${name || "This place"} is located in ${context}. ` +
      buildFallbackDescription({
        name,
        category,
        locality,
        district,
        country,
        height
      });
  } else {
    description = buildFallbackDescription({
      name,
      category,
      locality,
      district,
      country,
      height
    });
  }

  return {
    description: truncateText(description, 280),
    locality,
    district,
    country,
    displayName: reverse?.display_name || "",
    address
  };
}

async function init() {
  try {
    const viewer = new Cesium.Viewer("cesiumContainer", {
      baseLayerPicker: false,
      geocoder: false,
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      homeButton: false,
      infoBox: false,
      selectionIndicator: false,
      sceneModePicker: false,
      shadows: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      scene3DOnly: true
    });

    try {
      // Cesium's default world imagery layer
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.add(
        Cesium.ImageryLayer.fromWorldImagery()
      );
      console.log("World imagery loaded");
    } catch (err) {
      console.warn("World imagery failed, falling back to OSM:", err);
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(
        new Cesium.OpenStreetMapImageryProvider({
          url: "https://tile.openstreetmap.org/"
        })
      );
    }

    if (window.devicePixelRatio > 1) {
      viewer.resolutionScale = 0.8;
    }

    viewer.scene.globe.enableLighting = true;
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.fog.enabled = true;
    viewer.scene.globe.depthTestAgainstTerrain = true;
    viewer.scene.highDynamicRange = true;

    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 50;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 20000000;
    viewer.scene.screenSpaceCameraController.inertiaSpin = 0.85;
    viewer.scene.screenSpaceCameraController.inertiaTranslate = 0.85;
    viewer.scene.screenSpaceCameraController.inertiaZoom = 0.6;

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(-20, 20, 20000000)
    });

    let buildingsTileset = null;
    let highlightedFeature = null;
    let activeSearchEntity = null;

    try {
      viewer.terrainProvider = await Cesium.createWorldTerrainAsync();
      console.log("Terrain loaded");
    } catch (err) {
      console.warn("Terrain failed to load:", err);
    }

    try {
      buildingsTileset = await Cesium.createOsmBuildingsAsync({
        enableShowOutline: false
      });

      viewer.scene.primitives.add(buildingsTileset);

      // Darker, fully opaque buildings
      buildingsTileset.style = new Cesium.Cesium3DTileStyle({
        color: "color('rgba(165,175,190,1.0)')"
      });

      console.log("Buildings loaded");
    } catch (err) {
      console.warn("Buildings failed to load:", err);
    }

    const geocoderService = new Cesium.IonGeocoderService({
      scene: viewer.scene,
      accessToken: Cesium.Ion.defaultAccessToken
    });

    const searchInput = document.getElementById("locationSearch");
    const searchButton = document.getElementById("searchButton");
    const searchStatus = document.getElementById("searchStatus");
    const suggestionsEl = document.getElementById("suggestions");

    const buildingCard = document.getElementById("buildingCard");
    const buildingTitle = document.getElementById("buildingTitle");
    const buildingDescription = document.getElementById("buildingDescription");
    const buildingMeta = document.getElementById("buildingMeta");

    let currentSuggestions = [];
    let highlightedIndex = -1;
    let debounceTimer = null;

    function updateInfo(title, subtitle, description) {
      const infoTitle = document.getElementById("infoTitle");
      const infoSubtitle = document.getElementById("infoSubtitle");
      const infoDescription = document.getElementById("infoDescription");

      if (infoTitle) infoTitle.textContent = title;
      if (infoSubtitle) infoSubtitle.textContent = subtitle;
      if (infoDescription) infoDescription.textContent = description;
    }

    function clearSuggestions() {
      currentSuggestions = [];
      highlightedIndex = -1;
      suggestionsEl.innerHTML = "";
      suggestionsEl.style.display = "none";
    }

    function renderSuggestions(items) {
      currentSuggestions = items;
      highlightedIndex = -1;
      suggestionsEl.innerHTML = "";

      if (!items.length) {
        suggestionsEl.style.display = "none";
        return;
      }

      items.forEach((item) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "suggestionItem";
        button.textContent = item.displayName || "Unnamed result";

        button.addEventListener("click", () => {
          flyToSearchResult(item);
        });

        suggestionsEl.appendChild(button);
      });

      suggestionsEl.style.display = "block";
    }

    function highlightSuggestion(index) {
      const nodes = suggestionsEl.querySelectorAll(".suggestionItem");
      nodes.forEach((node, i) => {
        node.classList.toggle("active", i === index);
      });
    }

    function clearSearchMarker() {
      if (activeSearchEntity) {
        viewer.entities.remove(activeSearchEntity);
        activeSearchEntity = null;
      }
    }

    function addSearchMarker(position, labelText) {
      clearSearchMarker();

      activeSearchEntity = viewer.entities.add({
        position,
        point: {
          pixelSize: 10,
          color: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        label: {
          text: labelText,
          font: "600 14px Inter, Arial, sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, -18),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          showBackground: true,
          backgroundColor: new Cesium.Color(0.05, 0.08, 0.12, 0.82)
        }
      });
    }

    function rectangleToBetterView(rectangle) {
      const center = Cesium.Rectangle.center(rectangle);
      const westEast = Cesium.Math.toDegrees(rectangle.east - rectangle.west);
      const southNorth = Cesium.Math.toDegrees(rectangle.north - rectangle.south);
      const span = Math.max(Math.abs(westEast), Math.abs(southNorth));

      let height = 18000;
      if (span > 5) height = 180000;
      else if (span > 1.5) height = 90000;
      else if (span > 0.5) height = 40000;
      else if (span > 0.2) height = 18000;
      else height = 9000;

      return {
        centerCartesian: Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, 0),
        destination: Cesium.Cartesian3.fromRadians(center.longitude, center.latitude, height),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-55),
          roll: 0
        }
      };
    }

    function cartesianToBetterView(destination) {
      const cartographic = Cesium.Cartographic.fromCartesian(destination);
      const lon = cartographic.longitude;
      const lat = cartographic.latitude;

      return {
        centerCartesian: Cesium.Cartesian3.fromRadians(lon, lat, 0),
        destination: Cesium.Cartesian3.fromRadians(lon, lat, 14000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-55),
          roll: 0
        }
      };
    }

    async function flyToSearchResult(result) {
  if (!result) return;

  let view;
  if (result.destination instanceof Cesium.Rectangle) {
    view = rectangleToBetterView(result.destination);
  } else {
    view = cartesianToBetterView(result.destination);
  }

  viewer.camera.flyTo({
    destination: view.destination,
    orientation: view.orientation,
    duration: 2.8
  });

  const displayName = result.displayName || "Search Result";

  addSearchMarker(view.centerCartesian, displayName);

  if (searchInput) {
    searchInput.value = displayName;
  }

  if (searchStatus) {
    searchStatus.textContent = `Showing: ${displayName}`;
  }

  updateInfo(displayName, "Search Result", "Loading description...");
  clearSuggestions();

  try {
    const cartographic = Cesium.Cartographic.fromCartesian(view.centerCartesian);
    const lat = Cesium.Math.toDegrees(cartographic.latitude);
    const lon = Cesium.Math.toDegrees(cartographic.longitude);

    const enriched = await buildRichPlaceDescription({
      name: displayName,
      lat,
      lon,
      category: "place",
      height: null
    });

    const subtitleParts = [];
    if (enriched.locality) subtitleParts.push(enriched.locality);
    if (enriched.country && enriched.country !== enriched.locality) {
      subtitleParts.push(enriched.country);
    }

    updateInfo(
      displayName,
      subtitleParts.join(" • ") || "Search Result",
      enriched.description
    );
  } catch (error) {
    console.warn("Search description enrichment failed:", error);
    updateInfo(
      displayName,
      "Search Result",
      "Location found and centered on the globe."
    );
  }
}

    async function fetchSuggestions(query) {
      if (!query) {
        clearSuggestions();
        if (searchStatus) searchStatus.textContent = "";
        return;
      }

      if (searchStatus) searchStatus.textContent = "Searching...";

      try {
        const results = await geocoderService.geocode(
          query,
          Cesium.GeocodeType.AUTOCOMPLETE
        );

        const trimmed = (results || []).slice(0, 6);
        renderSuggestions(trimmed);

        if (searchStatus) {
          searchStatus.textContent = trimmed.length
            ? "Select a suggestion or press Enter."
            : "No results found.";
        }
      } catch (error) {
        console.error("Autocomplete failed:", error);
        clearSuggestions();
        if (searchStatus) {
          searchStatus.textContent = "Search failed. Try another location.";
        }
      }
    }

    async function runSearch() {
      const query = searchInput?.value?.trim();

      if (!query) {
        if (searchStatus) searchStatus.textContent = "Enter a city, region, or landmark.";
        clearSuggestions();
        return;
      }

      if (currentSuggestions.length > 0) {
        const chosen =
          highlightedIndex >= 0
            ? currentSuggestions[highlightedIndex]
            : currentSuggestions[0];

        flyToSearchResult(chosen);
        return;
      }

      if (searchStatus) searchStatus.textContent = "Searching...";

      try {
        const results = await geocoderService.geocode(
          query,
          Cesium.GeocodeType.SEARCH
        );

        if (!results || results.length === 0) {
          if (searchStatus) searchStatus.textContent = "No results found.";
          clearSuggestions();
          return;
        }

        flyToSearchResult(results[0]);
      } catch (error) {
        console.error("Search failed:", error);
        if (searchStatus) searchStatus.textContent = "Search failed. Try another location.";
      }
    }

    function flyToCity(cityKey) {
      const city = cityViews[cityKey];
      if (!city) return;

      viewer.camera.flyTo({
        destination: city.destination,
        orientation: city.orientation,
        duration: 2.8
      });

      addSearchMarker(city.labelPosition, city.name);
      updateInfo(city.name, city.country, city.description);
      if (searchStatus) searchStatus.textContent = `Showing: ${city.name}`;
      clearSuggestions();
    }

    function getFeatureProperty(feature, keys) {
      for (const key of keys) {
        try {
          if (feature.hasProperty && feature.hasProperty(key)) {
            const value = feature.getProperty(key);
            if (value !== undefined && value !== null && value !== "") {
              return value;
            }
          }
        } catch (_) {}
      }
      return null;
    }

    function buildBuildingDescription(name, type, height) {
  const cleanType = typeof type === "string" ? type.toLowerCase() : "building";
  const numericHeight = Number(height);

  let typePhrase = "a mapped urban building";
  if (cleanType.includes("office")) typePhrase = "an office building";
  else if (cleanType.includes("apart")) typePhrase = "a residential building";
  else if (cleanType.includes("residential")) typePhrase = "a residential building";
  else if (cleanType.includes("commercial")) typePhrase = "a commercial building";
  else if (cleanType.includes("hotel")) typePhrase = "a hotel building";
  else if (cleanType.includes("retail")) typePhrase = "a retail building";
  else if (cleanType.includes("industrial")) typePhrase = "an industrial building";
  else if (cleanType.includes("university")) typePhrase = "a university building";
  else if (cleanType.includes("hospital")) typePhrase = "a hospital building";
  else if (cleanType.includes("school")) typePhrase = "a school building";

  let heightPhrase = "Its mapped height is not available.";
  if (!Number.isNaN(numericHeight) && numericHeight > 0) {
    heightPhrase = `It is approximately ${numericHeight} meters tall.`;
  }

  return `${name} appears to be ${typePhrase} in the OpenStreetMap buildings dataset. ${heightPhrase}`;
}

    async function showBuildingCard(feature, clickPositionCartesian = null) {
  const name =
    getFeatureProperty(feature, ["name", "Name"]) ||
    "Unnamed building";

  const rawHeight =
    getFeatureProperty(feature, ["height", "Height", "building:height"]) ||
    null;

  const rawType =
    getFeatureProperty(feature, ["building", "type", "class"]) ||
    "building";

  const numericHeight = Number(rawHeight);
  const formattedHeight =
    !Number.isNaN(numericHeight) && numericHeight > 0
      ? `${numericHeight} m`
      : "Unknown";

  const formattedType =
    typeof rawType === "string" && rawType.trim()
      ? rawType
      : "building";

  buildingTitle.textContent = name;
  buildingDescription.textContent = "Loading description...";
  buildingMeta.innerHTML = `
    <div class="buildingMetaRow">
      <span>Category</span>
      <strong>${formattedType}</strong>
    </div>
    <div class="buildingMetaRow">
      <span>Height</span>
      <strong>${formattedHeight}</strong>
    </div>
  `;
  buildingCard.classList.add("show");

  try {
    let lat = null;
    let lon = null;

    if (clickPositionCartesian) {
      const cartographic = Cesium.Cartographic.fromCartesian(clickPositionCartesian);
      if (cartographic) {
        lat = Cesium.Math.toDegrees(cartographic.latitude);
        lon = Cesium.Math.toDegrees(cartographic.longitude);
      }
    }

    if (lat === null || lon === null) {
      buildingDescription.textContent =
        buildFallbackDescription({
          name,
          category: formattedType,
          locality: "",
          district: "",
          country: "",
          height: numericHeight
        });
      return;
    }

    const enriched = await buildRichPlaceDescription({
      name,
      lat,
      lon,
      category: formattedType,
      height: numericHeight
    });

    const truncated = truncateText(enriched.description);

buildingDescription.innerHTML = `
<span class="desc-short">${truncated.short}</span>
<span class="desc-full" style="display:none">${truncated.full}</span>
<span class="desc-toggle">Read more</span>
`;
const toggle = buildingDescription.querySelector(".desc-toggle");
const shortText = buildingDescription.querySelector(".desc-short");
const fullText = buildingDescription.querySelector(".desc-full");

if (toggle) {
  toggle.addEventListener("click", () => {
    const expanded = fullText.style.display === "inline";

    if (expanded) {
      fullText.style.display = "none";
      shortText.style.display = "inline";
      toggle.textContent = "Read more";
    } else {
      shortText.style.display = "none";
      fullText.style.display = "inline";
      toggle.textContent = "Show less";
    }
  });
}

    const locationLabel =
      enriched.district && enriched.locality
        ? `${enriched.district}, ${enriched.locality}`
        : enriched.locality || enriched.country || "Unknown";

    buildingMeta.innerHTML = `
      <div class="buildingMetaRow">
        <span>Category</span>
        <strong>${formattedType}</strong>
      </div>
      <div class="buildingMetaRow">
        <span>Height</span>
        <strong>${formattedHeight}</strong>
      </div>
      <div class="buildingMetaRow">
        <span>Area</span>
        <strong>${locationLabel}</strong>
      </div>
    `;
  } catch (error) {
    console.warn("Building enrichment failed:", error);

    buildingDescription.textContent =
      buildFallbackDescription({
        name,
        category: formattedType,
        locality: "",
        district: "",
        country: "",
        height: numericHeight
      });
  }
}

    function hideBuildingCard() {
      buildingCard.classList.remove("show");
    }

    function clearHighlightedFeature() {
      if (highlightedFeature) {
        highlightedFeature.color = Cesium.Color.WHITE;
        highlightedFeature = null;
      }
    }

    document.querySelectorAll("[data-city]").forEach((button) => {
      button.addEventListener("click", () => {
        flyToCity(button.dataset.city);
      });
    });

    document.getElementById("resetView").addEventListener("click", () => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-20, 20, 20000000),
        duration: 2.5
      });

      updateInfo(
        "Earth Twin",
        "Global 3D Explorer",
        "Explore the globe from orbit down to city-scale terrain and buildings."
      );

      if (searchStatus) searchStatus.textContent = "";
      if (searchInput) searchInput.value = "";
      clearSuggestions();
      clearSearchMarker();
      hideBuildingCard();
      clearHighlightedFeature();
    });

    document.getElementById("toggleBuildings").addEventListener("change", (e) => {
      if (buildingsTileset) {
        buildingsTileset.show = e.target.checked;
        viewer.scene.requestRender();
      }
    });

    document.getElementById("toggleLighting").addEventListener("change", (e) => {
      viewer.scene.globe.enableLighting = e.target.checked;
      viewer.scene.requestRender();
    });

    document.getElementById("toggleAtmosphere").addEventListener("change", (e) => {
      viewer.scene.skyAtmosphere.show = e.target.checked;
      viewer.scene.globe.showGroundAtmosphere = e.target.checked;
      viewer.scene.requestRender();
    });

    searchButton.addEventListener("click", runSearch);

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim();

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
      }, 220);
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!currentSuggestions.length) return;
        highlightedIndex = Math.min(highlightedIndex + 1, currentSuggestions.length - 1);
        highlightSuggestion(highlightedIndex);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!currentSuggestions.length) return;
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        highlightSuggestion(highlightedIndex);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        runSearch();
        return;
      }

      if (e.key === "Escape") {
        clearSuggestions();
      }
    });

    document.addEventListener("click", (e) => {
      const withinSearch =
        e.target === searchInput ||
        e.target === searchButton ||
        suggestionsEl.contains(e.target);

      if (!withinSearch) {
        clearSuggestions();
      }
    });

    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      const picked = viewer.scene.pick(movement.endPosition);
      const isFeature = picked instanceof Cesium.Cesium3DTileFeature;
      document.body.style.cursor = isFeature ? "pointer" : "default";
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    viewer.screenSpaceEventHandler.setInputAction((click) => {
  const picked = viewer.scene.pick(click.position);

  clearHighlightedFeature();

  if (picked instanceof Cesium.Cesium3DTileFeature) {
    highlightedFeature = picked;
    highlightedFeature.color = Cesium.Color.fromCssColorString("#ffd166");

    const clickCartesian = viewer.scene.pickPosition(click.position);
    showBuildingCard(picked, clickCartesian);
    return;
  }

  hideBuildingCard();
}, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  } catch (error) {
    console.error("Cesium init failed:", error);
    alert("Cesium failed to initialize. Open DevTools console.");
  }
}

init();