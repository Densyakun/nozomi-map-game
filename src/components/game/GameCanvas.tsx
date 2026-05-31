'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import type { MapData, Station, RailLine } from '@/lib/types';

interface GameCanvasProps {
  mapData: MapData;
  showGrid?: boolean;
}

function buildTerrain(mapData: MapData): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(
    mapData.gridWidth * mapData.gridSize,
    mapData.gridHeight * mapData.gridSize,
    mapData.gridWidth - 1,
    mapData.gridHeight - 1
  );
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let z = 0; z < mapData.gridHeight; z++) {
    for (let x = 0; x < mapData.gridWidth; x++) {
      const idx = z * mapData.gridWidth + x;
      const h = mapData.heightMap?.[z]?.[x] ?? 0;
      pos.setY(idx, h);
      const ci = idx * 3;
      const lu = mapData.landUse[z]?.[x];
      if (lu?.type === 'water' || lu?.type === 'river') {
        colors[ci] = 0.16; colors[ci + 1] = 0.44; colors[ci + 2] = 0.55;
      } else if (lu?.type === 'urban') {
        colors[ci] = 0.5; colors[ci + 1] = 0.5; colors[ci + 2] = 0.5;
      } else if (lu?.type === 'suburban') {
        colors[ci] = 0.4; colors[ci + 1] = 0.5; colors[ci + 2] = 0.35;
      } else if (lu?.type === 'agriculture') {
        colors[ci] = 0.55; colors[ci + 1] = 0.6; colors[ci + 2] = 0.3;
      } else if (lu?.type === 'industrial') {
        colors[ci] = 0.45; colors[ci + 1] = 0.4; colors[ci + 2] = 0.35;
      } else if (h < 1) {
        colors[ci] = 0.2; colors[ci + 1] = 0.5; colors[ci + 2] = 0.2;
      } else if (h < 5) {
        colors[ci] = 0.3; colors[ci + 1] = 0.6; colors[ci + 2] = 0.2;
      } else if (h < 15) {
        colors[ci] = 0.2; colors[ci + 1] = 0.4; colors[ci + 2] = 0.15;
      } else {
        colors[ci] = 0.4; colors[ci + 1] = 0.35; colors[ci + 2] = 0.25;
      }
    }
  }
  pos.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.userData = { type: 'terrain' };
  return mesh;
}

function buildBuildings(mapData: MapData): THREE.Group {
  const group = new THREE.Group();
  for (let z = 0; z < mapData.gridHeight; z++) {
    for (let x = 0; x < mapData.gridWidth; x++) {
      const lu = mapData.landUse[z]?.[x]; if (!lu) continue;
      let sr = false, h = 0, c = 0x888888;
      switch (lu.type) {
        case 'urban': sr = Math.random() < 0.4; h = 3 + Math.random() * 8; c = 0x6b8fb0; break;
        case 'suburban': sr = Math.random() < 0.2; h = 2 + Math.random() * 4; c = 0x8b9daa; break;
        case 'industrial': sr = Math.random() < 0.3; h = 3 + Math.random() * 5; c = 0x7a7a7a; break;
        case 'agriculture': sr = Math.random() < 0.02; h = 1; c = 0x6b8e23; break;
      }
      if (!sr) continue;
      const wx = (x - Math.floor(mapData.gridWidth / 2)) * mapData.gridSize;
      const wz = (z - Math.floor(mapData.gridHeight / 2)) * mapData.gridSize;
      const el = mapData.heightMap[z]?.[x] ?? 0;
      const b = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.1 }));
      b.position.set(wx, el + h / 2, wz); b.castShadow = true; b.receiveShadow = true;
      group.add(b);
    }
  }
  return group;
}

function buildVegetation(mapData: MapData): THREE.Group {
  const group = new THREE.Group();
  
  // Collect all instances first
  const treeInstances: { pos: THREE.Vector3; scale: THREE.Vector3; height: number }[] = [];
  const foliageInstances: { pos: THREE.Vector3; scale: THREE.Vector3 }[] = [];
  const grassInstances: { pos: THREE.Vector3; scale: THREE.Vector3; rotation: number }[] = [];
  const cropRowInstances: { pos: THREE.Vector3 }[] = [];
  
  for (let z = 0; z < mapData.gridHeight; z++) {
    for (let x = 0; x < mapData.gridWidth; x++) {
      const lu = mapData.landUse[z]?.[x];
      if (!lu) continue;
      
      const wx = (x - Math.floor(mapData.gridWidth / 2)) * mapData.gridSize;
      const wz = (z - Math.floor(mapData.gridHeight / 2)) * mapData.gridSize;
      const el = mapData.heightMap[z]?.[x] ?? 0;
      
      if (lu.type === 'forest') {
        // Collect tree instances
        const treeCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < treeCount; i++) {
          const offsetX = (Math.random() - 0.5) * mapData.gridSize * 0.8;
          const offsetZ = (Math.random() - 0.5) * mapData.gridSize * 0.8;
          const treeHeight = 3 + Math.random() * 4;
          
          treeInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + treeHeight / 2, wz + offsetZ),
            scale: new THREE.Vector3(1, treeHeight / 3, 1),
            height: treeHeight
          });
          
          foliageInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + treeHeight + 2.5, wz + offsetZ),
            scale: new THREE.Vector3(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4)
          });
        }
      } else if (lu.type === 'agriculture') {
        // Collect crop rows
        const rowCount = 3;
        const rowSpacing = mapData.gridSize / (rowCount + 1);
        for (let row = 0; row < rowCount; row++) {
          const rowOffset = -mapData.gridSize / 2 + rowSpacing * (row + 1);
          cropRowInstances.push({
            pos: new THREE.Vector3(wx + rowOffset, el + 0.25, wz)
          });
        }
        
        // Collect grass between rows
        const grassCount = Math.floor(Math.random() * 4) + 1;
        for (let i = 0; i < grassCount; i++) {
          const offsetX = (Math.random() - 0.5) * mapData.gridSize * 0.9;
          const offsetZ = (Math.random() - 0.5) * mapData.gridSize * 0.9;
          
          grassInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + 0.4, wz + offsetZ),
            scale: new THREE.Vector3(1, 0.5 + Math.random() * 0.5, 1),
            rotation: Math.random() * Math.PI
          });
        }
      } else if (lu.type === 'rural') {
        // Collect grass in rural areas
        const grassCount = Math.floor(Math.random() * 8) + 2;
        for (let i = 0; i < grassCount; i++) {
          const offsetX = (Math.random() - 0.5) * mapData.gridSize * 0.9;
          const offsetZ = (Math.random() - 0.5) * mapData.gridSize * 0.9;
          
          grassInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + 0.4, wz + offsetZ),
            scale: new THREE.Vector3(1, 0.5 + Math.random() * 0.5, 1),
            rotation: Math.random() * Math.PI
          });
        }
      } else if (lu.type === 'park') {
        // Collect trees in parks
        if (Math.random() < 0.3) {
          const treeHeight = 3 + Math.random() * 3;
          const offsetX = (Math.random() - 0.5) * mapData.gridSize * 0.6;
          const offsetZ = (Math.random() - 0.5) * mapData.gridSize * 0.6;
          
          treeInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + treeHeight / 2, wz + offsetZ),
            scale: new THREE.Vector3(1, treeHeight / 3, 1),
            height: treeHeight
          });
          
          foliageInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + treeHeight + 2.5, wz + offsetZ),
            scale: new THREE.Vector3(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4)
          });
        }
        
        // Collect grass in parks
        const grassCount = Math.floor(Math.random() * 5) + 2;
        for (let i = 0; i < grassCount; i++) {
          const offsetX = (Math.random() - 0.5) * mapData.gridSize * 0.8;
          const offsetZ = (Math.random() - 0.5) * mapData.gridSize * 0.8;
          
          grassInstances.push({
            pos: new THREE.Vector3(wx + offsetX, el + 0.4, wz + offsetZ),
            scale: new THREE.Vector3(1, 0.6 + Math.random() * 0.4, 1),
            rotation: Math.random() * Math.PI
          });
        }
      }
    }
  }
  
  // Create instanced meshes for trees
  if (treeInstances.length > 0) {
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeInstances.length);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    treeInstances.forEach((inst, i) => {
      dummy.position.copy(inst.pos);
      dummy.scale.copy(inst.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    group.add(trunkMesh);
  }
  
  // Create instanced meshes for foliage
  if (foliageInstances.length > 0) {
    const foliageGeo = new THREE.ConeGeometry(2, 5, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.8 });
    const foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, foliageInstances.length);
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    foliageInstances.forEach((inst, i) => {
      dummy.position.copy(inst.pos);
      dummy.scale.copy(inst.scale);
      dummy.updateMatrix();
      foliageMesh.setMatrixAt(i, dummy.matrix);
    });
    foliageMesh.instanceMatrix.needsUpdate = true;
    group.add(foliageMesh);
  }
  
  // Create instanced meshes for grass
  if (grassInstances.length > 0) {
    const grassGeo = new THREE.ConeGeometry(0.2, 0.8, 4);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x7cba3d, roughness: 0.9 });
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassInstances.length);
    grassMesh.castShadow = true;
    grassMesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    grassInstances.forEach((inst, i) => {
      dummy.position.copy(inst.pos);
      dummy.scale.copy(inst.scale);
      dummy.rotation.y = inst.rotation;
      dummy.updateMatrix();
      grassMesh.setMatrixAt(i, dummy.matrix);
    });
    grassMesh.instanceMatrix.needsUpdate = true;
    group.add(grassMesh);
  }
  
  // Create instanced meshes for crop rows
  if (cropRowInstances.length > 0) {
    const cropRowGeo = new THREE.BoxGeometry(0.3, 0.5, mapData.gridSize * 0.8);
    const cropMat = new THREE.MeshStandardMaterial({ color: 0x9acd32, roughness: 0.8 });
    const cropMesh = new THREE.InstancedMesh(cropRowGeo, cropMat, cropRowInstances.length);
    cropMesh.castShadow = true;
    cropMesh.receiveShadow = true;
    
    const dummy = new THREE.Object3D();
    cropRowInstances.forEach((inst, i) => {
      dummy.position.copy(inst.pos);
      dummy.updateMatrix();
      cropMesh.setMatrixAt(i, dummy.matrix);
    });
    cropMesh.instanceMatrix.needsUpdate = true;
    group.add(cropMesh);
  }
  
  return group;
}

function buildWaterSurface(mapData: MapData): THREE.Mesh | null {
  // Find river and water cells to create water surface
  const waterCells: { x: number; z: number; el: number }[] = [];
  
  for (let z = 0; z < mapData.gridHeight; z++) {
    for (let x = 0; x < mapData.gridWidth; x++) {
      const lu = mapData.landUse[z]?.[x];
      if (lu?.type === 'river' || lu?.type === 'water') {
        const wx = (x - Math.floor(mapData.gridWidth / 2)) * mapData.gridSize;
        const wz = (z - Math.floor(mapData.gridHeight / 2)) * mapData.gridSize;
        const el = mapData.heightMap[z]?.[x] ?? 0;
        waterCells.push({ x: wx, z: wz, el });
      }
    }
  }
  
  if (waterCells.length === 0) return null;
  
  // Create custom shader material for animated water
  const waterVertexShader = `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      // Add gentle wave animation
      float wave = sin(pos.x * 0.1 + uTime * 0.5) * 0.3 + cos(pos.z * 0.1 + uTime * 0.3) * 0.3;
      pos.y += wave;
      vElevation = wave;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;
  
  const waterFragmentShader = `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;
    
    void main() {
      // Create flowing water effect
      float flow = sin(vUv.x * 20.0 - uTime * 2.0) * 0.1 + cos(vUv.z * 15.0 + uTime * 1.5) * 0.1;
      
      vec3 deepWater = vec3(0.1, 0.3, 0.45);
      vec3 shallowWater = vec3(0.2, 0.5, 0.6);
      vec3 foam = vec3(0.8, 0.9, 0.95);
      
      float mixFactor = (vElevation + flow) * 0.5 + 0.5;
      vec3 color = mix(deepWater, shallowWater, mixFactor);
      
      // Add foam at wave peaks
      if (mixFactor > 0.7) {
        color = mix(color, foam, (mixFactor - 0.7) * 3.0);
      }
      
      // Add subtle sparkles
      float sparkle = sin(vUv.x * 50.0 + uTime * 3.0) * sin(vUv.z * 50.0 + uTime * 2.0);
      if (sparkle > 0.9) {
        color += vec3(0.2, 0.2, 0.2) * (sparkle - 0.9) * 10.0;
      }
      
      gl_FragColor = vec4(color, 0.85);
    }
  `;
  
  // Create a plane covering all water cells
  const minX = Math.min(...waterCells.map(c => c.x)) - mapData.gridSize;
  const maxX = Math.max(...waterCells.map(c => c.x)) + mapData.gridSize;
  const minZ = Math.min(...waterCells.map(c => c.z)) - mapData.gridSize;
  const maxZ = Math.max(...waterCells.map(c => c.z)) + mapData.gridSize;
  
  const width = maxX - minX;
  const height = maxZ - minZ;
  const avgElevation = waterCells.reduce((sum, c) => sum + c.el, 0) / waterCells.length;
  
  const geometry = new THREE.PlaneGeometry(width, height, 50, 50);
  geometry.rotateX(-Math.PI / 2);
  
  const material = new THREE.ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
      uTime: { value: 0 }
    },
    transparent: true,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set((minX + maxX) / 2, avgElevation + 0.2, (minZ + maxZ) / 2);
  mesh.userData = { type: 'water', isWater: true };
  
  return mesh;
}

function buildLandmarks(mapData: MapData): THREE.Group {
  const group = new THREE.Group();
  if (!mapData.landmarks || mapData.landmarks.length === 0) return group;

  const getTerrainHeight = (x: number, z: number): number => {
    const halfWidth = (mapData.gridWidth * mapData.gridSize) / 2;
    const halfHeight = (mapData.gridHeight * mapData.gridSize) / 2;
    const gridX = Math.floor((x + halfWidth) / mapData.gridSize);
    const gridZ = Math.floor((z + halfHeight) / mapData.gridSize);
    if (gridX >= 0 && gridX < mapData.gridWidth && gridZ >= 0 && gridZ < mapData.gridHeight) {
      return mapData.heightMap?.[gridZ]?.[gridX] ?? 0;
    }
    return 0;
  };

  for (const landmark of mapData.landmarks) {
    const el = landmark.elevation ?? getTerrainHeight(landmark.position.x, landmark.position.z);
    const markerGroup = new THREE.Group();

    // Create marker based on type
    let markerColor = 0xff6600;
    let markerHeight = 15;
    let markerRadius = 2;

    switch (landmark.type) {
      case 'station':
        markerColor = 0x3b82f6;
        markerHeight = 20;
        markerRadius = 3;
        break;
      case 'building':
        markerColor = 0x888888;
        markerHeight = 12;
        markerRadius = 2;
        break;
      case 'park':
        markerColor = 0x22c55e;
        markerHeight = 10;
        markerRadius = 2.5;
        break;
      case 'poi':
        markerColor = 0xf59e0b;
        markerHeight = 15;
        markerRadius = 2;
        break;
      case 'river':
        markerColor = 0x0ea5e9;
        markerHeight = 8;
        markerRadius = 1.5;
        break;
      case 'mountain':
        markerColor = 0x8b5cf6;
        markerHeight = 25;
        markerRadius = 2;
        break;
    }

    // Pin/marker body
    const pinGeo = new THREE.ConeGeometry(markerRadius, markerHeight, 8);
    const pinMat = new THREE.MeshStandardMaterial({ 
      color: markerColor, 
      roughness: 0.3, 
      metalness: 0.5,
      emissive: markerColor,
      emissiveIntensity: 0.2
    });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(0, el + markerHeight / 2, 0);
    pin.castShadow = true;
    markerGroup.add(pin);

    // Marker base
    const baseGeo = new THREE.CylinderGeometry(markerRadius * 1.2, markerRadius * 1.5, 2, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, el + 1, 0);
    base.castShadow = true;
    markerGroup.add(base);

    markerGroup.position.set(landmark.position.x, 0, landmark.position.z);
    markerGroup.userData = { type: 'landmark', landmarkId: landmark.id, name: landmark.name };
    group.add(markerGroup);
  }

  return group;
}

function buildOSMBuildings(mapData: MapData): THREE.Group {
  const group = new THREE.Group();
  if (!mapData.osmBuildings || mapData.osmBuildings.length === 0) return group;

  const getTerrainHeight = (x: number, z: number): number => {
    const halfWidth = (mapData.gridWidth * mapData.gridSize) / 2;
    const halfHeight = (mapData.gridHeight * mapData.gridSize) / 2;
    const gridX = Math.floor((x + halfWidth) / mapData.gridSize);
    const gridZ = Math.floor((z + halfHeight) / mapData.gridSize);
    if (gridX >= 0 && gridX < mapData.gridWidth && gridZ >= 0 && gridZ < mapData.gridHeight) {
      return mapData.heightMap?.[gridZ]?.[gridX] ?? 0;
    }
    return 0;
  };

  for (const bldg of mapData.osmBuildings) {
    const el = getTerrainHeight(bldg.position.x, bldg.position.z);
    const height = bldg.height || 5;
    
    // Determine color based on building type
    let color = 0x888888;
    switch (bldg.buildingType) {
      case 'residential':
        color = 0x8b9daa;
        break;
      case 'commercial':
        color = 0x6b8fb0;
        break;
      case 'industrial':
        color = 0x7a7a7a;
        break;
      case 'public':
        color = 0xd4a574;
        break;
    }

    // Create building mesh
    const buildingGeo = new THREE.BoxGeometry(8, height, 8);
    const buildingMat = new THREE.MeshStandardMaterial({ 
      color, 
      roughness: 0.7, 
      metalness: 0.1 
    });
    const building = new THREE.Mesh(buildingGeo, buildingMat);
    building.position.set(bldg.position.x, el + height / 2, bldg.position.z);
    building.castShadow = true;
    building.receiveShadow = true;
    building.userData = { type: 'osm_building', buildingId: bldg.id, name: bldg.name };
    group.add(building);

    // Add roof detail
    const roofGeo = new THREE.BoxGeometry(8.5, 0.5, 8.5);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(bldg.position.x, el + height + 0.25, bldg.position.z);
    roof.castShadow = true;
    group.add(roof);

    // Add windows for taller buildings
    if (height > 10) {
      const windowMat = new THREE.MeshStandardMaterial({ 
        color: 0xaaddff, 
        roughness: 0.3, 
        metalness: 0.5,
        emissive: 0xaaddff,
        emissiveIntensity: 0.1
      });
      const floors = Math.floor(height / 3);
      for (let floor = 0; floor < floors; floor++) {
        for (let side = 0; side < 4; side++) {
          const windowGeo = new THREE.BoxGeometry(1, 1.5, 0.1);
          const window = new THREE.Mesh(windowGeo, windowMat);
          const y = el + 2 + floor * 3;
          
          switch (side) {
            case 0: // front
              window.position.set(bldg.position.x - 2, y, bldg.position.z + 4);
              break;
            case 1: // back
              window.position.set(bldg.position.x + 2, y, bldg.position.z - 4);
              break;
            case 2: // left
              window.position.set(bldg.position.x - 4, y, bldg.position.z - 2);
              window.rotation.y = Math.PI / 2;
              break;
            case 3: // right
              window.position.set(bldg.position.x + 4, y, bldg.position.z + 2);
              window.rotation.y = Math.PI / 2;
              break;
          }
          group.add(window);
        }
      }
    }
  }

  return group;
}

function buildStations(stations: Station[], mapData: MapData): THREE.Group {
  const group = new THREE.Group();
  if (!stations.length) return group;

  const getTerrainHeight = (x: number, z: number): number => {
    const halfWidth = (mapData.gridWidth * mapData.gridSize) / 2;
    const halfHeight = (mapData.gridHeight * mapData.gridSize) / 2;
    const gridX = Math.floor((x + halfWidth) / mapData.gridSize);
    const gridZ = Math.floor((z + halfHeight) / mapData.gridSize);
    if (gridX >= 0 && gridX < mapData.gridWidth && gridZ >= 0 && gridZ < mapData.gridHeight) {
      return mapData.heightMap?.[gridZ]?.[gridX] ?? 0;
    }
    return 0;
  };

  for (const st of stations) {
    const terrainHeight = getTerrainHeight(st.position.x, st.position.z);
    const stationGroup = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(5, 6, 2, 8),
      new THREE.MeshStandardMaterial({ color: st.ownerId === 'player' ? 0x3b82f6 : 0xef4444 })
    );
    base.position.set(0, 1, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    stationGroup.add(base);

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 2, 6, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    tower.position.set(0, 5, 0);
    tower.castShadow = true;
    stationGroup.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(3, 3, 8),
      new THREE.MeshStandardMaterial({ color: st.ownerId === 'player' ? 0x10b981 : 0xf97316 })
    );
    roof.position.set(0, 9.5, 0);
    roof.castShadow = true;
    stationGroup.add(roof);

    stationGroup.position.set(st.position.x, terrainHeight, st.position.z);
    stationGroup.userData = { type: 'station', stationId: st.id, name: st.name };
    group.add(stationGroup);
  }
  return group;
}

function buildRails(lines: RailLine[], stations: Station[], mapData: MapData): THREE.Group {
  const group = new THREE.Group();
  if (!lines.length || !stations.length) return group;
  const sm = new Map(stations.map((s) => [s.id, s]));

  const getTerrainHeight = (x: number, z: number): number => {
    const halfWidth = (mapData.gridWidth * mapData.gridSize) / 2;
    const halfHeight = (mapData.gridHeight * mapData.gridSize) / 2;
    const gridX = Math.floor((x + halfWidth) / mapData.gridSize);
    const gridZ = Math.floor((z + halfHeight) / mapData.gridSize);
    if (gridX >= 0 && gridX < mapData.gridWidth && gridZ >= 0 && gridZ < mapData.gridHeight) {
      return mapData.heightMap?.[gridZ]?.[gridX] ?? 0;
    }
    return 0;
  };

  for (const ln of lines) {
    const pts: THREE.Vector3[] = [];
    for (const sid of ln.stationIds) {
      const st = sm.get(sid);
      if (st) {
        const terrainHeight = getTerrainHeight(st.position.x, st.position.z);
        pts.push(new THREE.Vector3(st.position.x, terrainHeight + 1, st.position.z));
      }
    }
    if (pts.length < 2) continue;

    const curve = new THREE.CatmullRomCurve3(pts);
    const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.8, 8, false);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(ln.color),
      roughness: 0.3,
      metalness: 0.6,
      emissive: new THREE.Color(ln.color),
      emissiveIntensity: 0.2
    });
    const tube = new THREE.Mesh(tubeGeometry, material);
    tube.castShadow = true;
    tube.receiveShadow = true;
    tube.userData = { type: 'rail', lineId: ln.id };
    group.add(tube);

    // Add rail ties (sleepers) for more visual detail
    const tieGeometry = new THREE.BoxGeometry(4, 0.3, 0.8);
    const tieMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
    const tiePoints = curve.getPoints(20);
    for (let i = 0; i < tiePoints.length; i++) {
      const tie = new THREE.Mesh(tieGeometry, tieMaterial);
      tie.position.copy(tiePoints[i]);
      const tieTerrainHeight = getTerrainHeight(tie.position.x, tie.position.z);
      tie.position.y = tieTerrainHeight + 0.5;
      const tangent = curve.getTangent(i / (tiePoints.length - 1));
      tie.lookAt(tiePoints[i].clone().add(tangent));
      tie.castShadow = true;
      tie.receiveShadow = true;
      group.add(tie);
    }

    // Add overhead lines (catenary wires)
    const poleGeometry = new THREE.CylinderGeometry(0.15, 0.2, 8, 6);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
    const wireGeometry = new THREE.TubeGeometry(curve, 50, 0.05, 4, false);
    const wireMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222, 
      roughness: 0.5, 
      metalness: 0.8 
    });
    
    // Add poles at intervals
    const polePoints = curve.getPoints(Math.max(3, Math.floor(curve.getLength() / 30)));
    for (let i = 0; i < polePoints.length; i++) {
      const pt = polePoints[i];
      const terrainHeight = getTerrainHeight(pt.x, pt.z);
      
      // Pole
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(pt.x, terrainHeight + 4, pt.z);
      pole.castShadow = true;
      pole.receiveShadow = true;
      group.add(pole);
      
      // Cross arm
      const crossArm = new THREE.Mesh(
        new THREE.BoxGeometry(6, 0.2, 0.2),
        poleMaterial
      );
      crossArm.position.set(pt.x, terrainHeight + 8, pt.z);
      crossArm.castShadow = true;
      group.add(crossArm);
    }
    
    // Add catenary wire (slightly above the rails)
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    const wirePoints = curve.getPoints(50);
    wirePoints.forEach((pt, i) => {
      pt.y += 7; // Raise wire above rails
    });
    const wireCurve = new THREE.CatmullRomCurve3(wirePoints);
    const wireTubeGeo = new THREE.TubeGeometry(wireCurve, 50, 0.05, 4, false);
    const wireMesh = new THREE.Mesh(wireTubeGeo, wireMaterial);
    wireMesh.castShadow = true;
    wireMesh.userData = { type: 'catenary', lineId: ln.id };
    group.add(wireMesh);
  }
  return group;
}

function CameraDirectionTracker() {
  const { camera } = useThree();
  const setCameraDirection = useUIStore((s) => s.setCameraDirection);

  useEffect(() => {
    const updateDirection = () => {
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);
      const angle = Math.atan2(direction.x, direction.z);
      const degrees = (angle * 180) / Math.PI;
      setCameraDirection(degrees);
    };

    updateDirection();
    const interval = setInterval(updateDirection, 100);
    return () => clearInterval(interval);
  }, [camera, setCameraDirection]);

  return null;
}

function SceneSetup({ mapData, showGrid = true }: GameCanvasProps) {
  const { scene, gl, camera } = useThree();
  const stations = useGameStore((s) => s.railwayNetwork.stations);
  const lines = useGameStore((s) => s.railwayNetwork.lines);
  const activeTool = useUIStore((s) => s.activeTool);
  const hoveredPosition = useUIStore((s) => s.hoveredPosition);
  const selectedStationPosition = useUIStore((s) => s.selectedStationPosition);
  const conStart = useUIStore((s) => s.constructionStartPoint);
  const conEnd = useUIStore((s) => s.constructionEndPoint);
  const setHover = useUIStore((s) => s.setHoveredPosition);
  const setSelectedStationPosition = useUIStore((s) => s.setSelectedStationPosition);
  const setSel = useUIStore((s) => s.setSelectedElement);
  const setCon = useUIStore((s) => s.setConstructionStartPoint);
  const setConEnd = useUIStore((s) => s.setConstructionEndPoint);
  const [waterMesh, setWaterMesh] = useState<THREE.Mesh | null>(null);

  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);

  useEffect(() => {
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 500, 2000);
  }, [scene]);

  const sceneObjects = useMemo(() => {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7a2a, 0.4);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(80, 100, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 4096;
    dir.shadow.mapSize.height = 4096;
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 300;
    dir.shadow.camera.left = -150;
    dir.shadow.camera.right = 150;
    dir.shadow.camera.top = 150;
    dir.shadow.camera.bottom = -150;

    const terrain = buildTerrain(mapData);
    const bldgs = buildBuildings(mapData);
    const vegetation = buildVegetation(mapData);
    const water = buildWaterSurface(mapData);
    const landmarks = buildLandmarks(mapData);
    const osmBuildings = buildOSMBuildings(mapData);
    const maxDim = Math.max(mapData.gridWidth, mapData.gridHeight) * mapData.gridSize;
    const grid = new THREE.GridHelper(maxDim, 50, 0x4a7a3a, 0x3a6a2a);
    grid.visible = showGrid;

    setWaterMesh(water);

    return { ambient, hemi, dir, terrain, bldgs, vegetation, water, landmarks, osmBuildings, grid };
  }, [mapData, showGrid, setWaterMesh]);

  const dynObjs = useMemo(() => {
    return { sts: buildStations(stations, mapData), rls: buildRails(lines, stations, mapData) };
  }, [stations, lines, mapData]);

  const previewObj = useMemo(() => {
    const g = new THREE.Group();
    if (!activeTool || activeTool === 'select' || activeTool === 'demolish') return g;

    const getTerrainHeight = (x: number, z: number): number => {
      const halfWidth = (mapData.gridWidth * mapData.gridSize) / 2;
      const halfHeight = (mapData.gridHeight * mapData.gridSize) / 2;
      const gridX = Math.floor((x + halfWidth) / mapData.gridSize);
      const gridZ = Math.floor((z + halfHeight) / mapData.gridSize);
      if (gridX >= 0 && gridX < mapData.gridWidth && gridZ >= 0 && gridZ < mapData.gridHeight) {
        return mapData.heightMap?.[gridZ]?.[gridX] ?? 0;
      }
      return 0;
    };

    if (activeTool === 'station') {
      if (selectedStationPosition) {
        const { x, z } = selectedStationPosition;
        const terrainHeight = getTerrainHeight(x, z);
        const p = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        p.position.set(x, terrainHeight + 5, z); g.add(p);
      } else if (hoveredPosition) {
        const x = Math.round(hoveredPosition.x / 10) * 10, z = Math.round(hoveredPosition.z / 10) * 10;
        const terrainHeight = getTerrainHeight(x, z);
        const p = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 8, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 }));
        p.position.set(x, terrainHeight + 4, z); g.add(p);
      }
    }
    if (activeTool === 'line' && conStart) {
      const ss = stations.find((s) => s.id === conStart.stationId);
      if (ss) {
        const sx = ss.position.x, sz = ss.position.z;
        let ex = sx, ez = sz;
        if (conEnd) {
          const es = stations.find((s) => s.id === conEnd.stationId);
          if (es) {
            ex = es.position.x;
            ez = es.position.z;
          }
        } else if (hoveredPosition) {
          ex = Math.round(hoveredPosition.x / 10) * 10;
          ez = Math.round(hoveredPosition.z / 10) * 10;
        }
        const len = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2), ang = Math.atan2(ez - sz, ex - sx);
        const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, len, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7, depthWrite: false }));
        rl.rotation.z = Math.PI / 2; rl.position.set((sx + ex) / 2, getTerrainHeight(sx, sz) + 1, (sz + ez) / 2); rl.rotation.y = -ang; g.add(rl);
        const sm = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 12), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8, depthWrite: false }));
        sm.position.set(sx, getTerrainHeight(sx, sz) + 1, sz); g.add(sm);
        const em = new THREE.Mesh(new THREE.SphereGeometry(conEnd ? 1 : 0.6, 12, 12), new THREE.MeshBasicMaterial({ color: conEnd ? 0xff0000 : 0xffa500, transparent: true, opacity: conEnd ? 0.8 : 0.6, depthWrite: false }));
        em.position.set(ex, getTerrainHeight(ex, ez) + 1, ez); g.add(em);
      }
    }
    return g;
  }, [activeTool, hoveredPosition, selectedStationPosition, conStart, conEnd, stations, mapData]);

  useEffect(() => {
    const managed: THREE.Object3D[] = [];
    const addManaged = (obj: THREE.Object3D) => { scene.add(obj); obj.userData.__m = true; managed.push(obj); };

    addManaged(sceneObjects.ambient);
    addManaged(sceneObjects.hemi);
    addManaged(sceneObjects.dir);
    addManaged(sceneObjects.terrain);
    addManaged(sceneObjects.bldgs);
    addManaged(sceneObjects.vegetation);
    if (sceneObjects.water) addManaged(sceneObjects.water);
    addManaged(sceneObjects.landmarks);
    addManaged(sceneObjects.osmBuildings);
    addManaged(sceneObjects.grid);
    addManaged(dynObjs.sts);
    addManaged(dynObjs.rls);
    addManaged(previewObj);

    return () => {
      managed.forEach((o) => { scene.remove(o); delete o.userData.__m; });
    };
  }, [scene, sceneObjects, dynObjs, previewObj]);

  // Animate water surface
  useEffect(() => {
    if (!waterMesh) return;
    
    const animateWater = () => {
      if (waterMesh.material instanceof THREE.ShaderMaterial) {
        waterMesh.material.uniforms.uTime.value += 0.016;
      }
      requestAnimationFrame(animateWater);
    };
    
    animateWater();
    
    return () => {
      // Cleanup is handled by the main effect
    };
  }, [waterMesh]);

  useEffect(() => {
    sceneObjects.grid.visible = showGrid;
  }, [showGrid, sceneObjects.grid]);

  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dom = gl.domElement;
    let downPosition: { x: number; y: number } | null = null;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      downPosition = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: MouseEvent) => {
      if (e.button !== 0 || !downPosition) return;
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - downPosition.x, 2) + Math.pow(e.clientY - downPosition.y, 2)
      );
      downPosition = null;

      if (moveDistance > 5) return;

      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        let obj: THREE.Object3D | null = hit.object;

        // Find parent object with station data
        while (obj && !obj.userData?.type?.includes('station')) {
          obj = obj.parent;
        }

        if (obj?.userData?.type === 'station') {
          const sid = obj.userData.stationId as string;
          if (activeTool === 'line') {
            if (conStart?.stationId === sid) {
              setCon(null);
              setConEnd(null);
            } else if (!conStart) {
              setCon({ x: 0, z: 0, stationId: sid });
            } else if (!conEnd) {
              setConEnd({ x: 0, z: 0, stationId: sid });
            } else {
              setConEnd({ x: 0, z: 0, stationId: sid });
            }
          } else { setSel(sid, 'station'); }
        } else if (activeTool === 'station') {
          const terrainHit = intersects.find((i) => i.object.userData?.type === 'terrain');
          if (terrainHit && terrainHit.point) {
            const x = Math.round(terrainHit.point.x / 10) * 10;
            const z = Math.round(terrainHit.point.z / 10) * 10;
            setSelectedStationPosition({ x, z });
          }
        } else { setSel(null, null); }
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.object?.userData?.type === 'terrain' && hit.point) {
          setHover({ x: hit.point.x, z: hit.point.z });
        }
      }
    };

    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointerup', onUp);
    dom.addEventListener('pointermove', onMove);
    return () => { dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('pointerup', onUp); dom.removeEventListener('pointermove', onMove); };
  }, [gl, camera, scene, activeTool, conStart, conEnd, setSel, setHover, setCon, setConEnd, setSelectedStationPosition]);

  return (
    <MapControls makeDefault enableDamping dampingFactor={0.1}
      maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={800}
    />
  );
}

export default function GameCanvas({ mapData, showGrid = true }: GameCanvasProps) {
  const [cameraConfig, setCameraConfig] = useState({ position: [200, 150, 200] as [number, number, number], fov: 60 });

  useEffect(() => {
    const updateCamera = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setCameraConfig({ position: [150, 120, 150], fov: 50 });
      } else {
        setCameraConfig({ position: [200, 150, 200], fov: 60 });
      }
    };
    updateCamera();
    window.addEventListener('resize', updateCamera);
    return () => window.removeEventListener('resize', updateCamera);
  }, []);

  return (
    <div className="flex-1 relative w-full h-full">
      <Canvas
        camera={{ position: cameraConfig.position, fov: cameraConfig.fov, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
        style={{ background: '#87ceeb', width: '100%', height: '100%' }}
        resize={{ scroll: false, debounce: 0 }}
      >
        <SceneSetup mapData={mapData} showGrid={showGrid} />
        <CameraDirectionTracker />
      </Canvas>
    </div>
  );
}
