// Canadian Provinces and Territories GeoJSON Data
// Simplified boundaries for interactive map visualization
export const canadianProvincesGeoJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "British Columbia",
        "abbreviation": "BC",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-139.06, 60.00], [-139.06, 48.30], [-114.033, 49.00], [-114.033, 60.00], [-139.06, 60.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Alberta",
        "abbreviation": "AB",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-120.00, 60.00], [-120.00, 49.00], [-110.00, 49.00], [-110.00, 60.00], [-120.00, 60.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Saskatchewan",
        "abbreviation": "SK",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-110.00, 60.00], [-110.00, 49.00], [-101.36, 49.00], [-101.36, 60.00], [-110.00, 60.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Manitoba",
        "abbreviation": "MB",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-101.36, 60.00], [-101.36, 49.00], [-95.15, 49.00], [-95.15, 60.00], [-101.36, 60.00]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Ontario",
        "abbreviation": "ON",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-95.15, 56.85], [-95.15, 41.68], [-74.34, 41.68], [-74.34, 56.85], [-95.15, 56.85]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Quebec",
        "abbreviation": "QC",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-79.76, 62.58], [-79.76, 45.00], [-57.10, 45.00], [-57.10, 62.58], [-79.76, 62.58]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "New Brunswick",
        "abbreviation": "NB",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-69.05, 47.46], [-69.05, 44.60], [-63.77, 44.60], [-63.77, 47.46], [-69.05, 47.46]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nova Scotia",
        "abbreviation": "NS",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-66.33, 47.04], [-66.33, 43.42], [-59.73, 43.42], [-59.73, 47.04], [-66.33, 47.04]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Prince Edward Island",
        "abbreviation": "PE",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-64.42, 47.07], [-64.42, 45.95], [-61.95, 45.95], [-61.95, 47.07], [-64.42, 47.07]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Newfoundland and Labrador",
        "abbreviation": "NL",
        "type": "Province"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-67.80, 60.40], [-67.80, 46.56], [-52.62, 46.56], [-52.62, 60.40], [-67.80, 60.40]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Yukon",
        "abbreviation": "YT",
        "type": "Territory"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-141.00, 69.65], [-141.00, 60.00], [-123.50, 60.00], [-123.50, 69.65], [-141.00, 69.65]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Northwest Territories",
        "abbreviation": "NT",
        "type": "Territory"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-136.45, 78.75], [-136.45, 60.00], [-102.00, 60.00], [-102.00, 78.75], [-136.45, 78.75]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nunavut",
        "abbreviation": "NU",
        "type": "Territory"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-120.00, 83.11], [-120.00, 60.00], [-61.00, 60.00], [-61.00, 83.11], [-120.00, 83.11]
        ]]
      }
    }
  ]
};

// Province name mapping for API integration
export const provinceNameMap = {
  "British Columbia": "BC",
  "Alberta": "AB", 
  "Saskatchewan": "SK",
  "Manitoba": "MB",
  "Ontario": "ON",
  "Quebec": "QC",
  "New Brunswick": "NB",
  "Nova Scotia": "NS",
  "Prince Edward Island": "PE",
  "Newfoundland and Labrador": "NL",
  "Yukon": "YT",
  "Northwest Territories": "NT",
  "Nunavut": "NU"
};

// Color mapping for ranking-based visualization
export const getColorForRank = (rank, totalProvinces) => {
  const percentage = (rank - 1) / (totalProvinces - 1);
  
  if (percentage <= 0.25) return '#ef4444'; // Red - best 25% (highest density)
  if (percentage <= 0.50) return '#f97316'; // Orange - 50-75%
  if (percentage <= 0.75) return '#eab308'; // Yellow - 25-50%
  return '#22c55e'; // Green - worst 25% (lowest density)
}; 