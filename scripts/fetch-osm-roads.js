const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

// Map bounds from tokyo-osm-001.json
const bounds = {
  north: 35.6545045045045,
  south: 35.645495495495496,
  east: 139.70554337477014,
  west: 139.69445662522983
};

async function fetchOSMRoads() {
  console.log('Fetching OSM road data from OSM API...');
  
  // Use OSM API directly to get map data
  const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'NozomiMapGame/1.0'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const xmlText = await response.text();
  console.log(`Fetched OSM XML data (${xmlText.length} bytes)`);
  
  return parseOSMXML(xmlText);
}

async function parseOSMXML(xmlText) {
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlText);
  
  const osm = result.osm;
  const nodes = new Map();
  const ways = [];
  
  // Parse nodes
  if (osm.node) {
    for (const node of osm.node) {
      const id = parseInt(node.$.id);
      const lat = parseFloat(node.$.lat);
      const lon = parseFloat(node.$.lon);
      nodes.set(id, { lat, lon });
    }
  }
  
  console.log(`Parsed ${nodes.size} nodes`);
  
  // Parse ways with highway tags
  if (osm.way) {
    for (const way of osm.way) {
      // Check if it has a highway tag
      if (!way.tag) continue;
      
      const highwayTag = way.tag.find(t => t.$.k === 'highway');
      if (!highwayTag) continue;
      
      const highway = highwayTag.$.v;
      
      // Extract node references
      const nodeRefs = [];
      if (way.nd) {
        for (const nd of way.nd) {
          nodeRefs.push(parseInt(nd.$.ref));
        }
      }
      
      if (nodeRefs.length < 2) continue;
      
      ways.push({
        id: parseInt(way.$.id),
        nodes: nodeRefs,
        tags: { highway }
      });
    }
  }
  
  console.log(`Parsed ${ways.length} highway ways`);
  
  return { nodes, ways };
}

function convertToGameFormat(osmData) {
  const { nodes, ways } = osmData;
  const osmFeatures = [];
  let matchedNodes = 0;
  let unmatchedNodes = 0;
  
  for (const way of ways) {
    const coordinates = [];
    for (const nodeId of way.nodes) {
      const node = nodes.get(nodeId);
      if (node) {
        coordinates.push([node.lon, node.lat]);
        matchedNodes++;
      } else {
        unmatchedNodes++;
      }
    }
    
    if (coordinates.length < 2) continue;
    
    osmFeatures.push({
      id: `osm-road-${way.id}`,
      type: 'road',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      },
      properties: {},
      tags: {
        highway: way.tags.highway
      }
    });
  }
  
  console.log(`Matched nodes: ${matchedNodes}, Unmatched nodes: ${unmatchedNodes}`);
  console.log(`Converted ${osmFeatures.length} road features`);
  
  // Sample first few node IDs for debugging
  const sampleNodeIds = Array.from(nodes.keys()).slice(0, 5);
  console.log(`Sample node IDs: ${sampleNodeIds.join(', ')}`);
  
  // Sample first few way node refs for debugging
  if (ways.length > 0) {
    console.log(`Sample way ${ways[0].id} node refs: ${ways[0].nodes.slice(0, 5).join(', ')}`);
  }
  
  return osmFeatures;
}

async function updateMapFile(osmFeatures) {
  const mapPath = path.join(__dirname, '..', 'public', 'maps', 'tokyo-osm-001.json');
  
  console.log('Reading existing map file...');
  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  
  // Update osmFeatures
  mapData.osmFeatures = osmFeatures;
  
  console.log('Writing updated map file...');
  fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2));
  
  console.log('Map file updated successfully!');
}

async function main() {
  try {
    const osmData = await fetchOSMRoads();
    const osmFeatures = convertToGameFormat(osmData);
    await updateMapFile(osmFeatures);
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
