'use client';

import React, { useEffect, useMemo } from 'react';
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

function buildRails(lines: RailLine[], stations: Station[]): THREE.Group {
  const group = new THREE.Group();
  if (!lines.length || !stations.length) return group;
  const sm = new Map(stations.map((s) => [s.id, s]));
  for (const ln of lines) {
    const pts: THREE.Vector3[] = [];
    for (const sid of ln.stationIds) { const st = sm.get(sid); if (st) pts.push(new THREE.Vector3(st.position.x, st.elevation + 1, st.position.z)); }
    if (pts.length < 2) continue;
    const l = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(new THREE.CatmullRomCurve3(pts).getPoints(50)),
      new THREE.LineBasicMaterial({ color: new THREE.Color(ln.color) })
    );
    l.userData = { type: 'rail', lineId: ln.id };
    group.add(l);
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
  const setHover = useUIStore((s) => s.setHoveredPosition);
  const setSelectedStationPosition = useUIStore((s) => s.setSelectedStationPosition);
  const setSel = useUIStore((s) => s.setSelectedElement);
  const setCon = useUIStore((s) => s.setConstructionStartPoint);

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
    const maxDim = Math.max(mapData.gridWidth, mapData.gridHeight) * mapData.gridSize;
    const grid = new THREE.GridHelper(maxDim, 50, 0x4a7a3a, 0x3a6a2a);
    grid.visible = showGrid;

    return { ambient, hemi, dir, terrain, bldgs, grid };
  }, [mapData, showGrid]);

  const dynObjs = useMemo(() => {
    return { sts: buildStations(stations, mapData), rls: buildRails(lines, stations) };
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
    if (activeTool === 'line' && conStart && hoveredPosition) {
      const ss = stations.find((s) => s.id === conStart.stationId);
      if (ss) {
        const sx = ss.position.x, sz = ss.position.z, ex = Math.round(hoveredPosition.x / 10) * 10, ez = Math.round(hoveredPosition.z / 10) * 10;
        const len = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2), ang = Math.atan2(ez - sz, ex - sx);
        const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, len, 4), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6, depthWrite: false }));
        rl.rotation.z = Math.PI / 2; rl.position.set((sx + ex) / 2, 0.5, (sz + ez) / 2); rl.rotation.y = -ang; g.add(rl);
        const sm = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7, depthWrite: false }));
        sm.position.set(sx, 0.5, sz); g.add(sm);
        const em = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7, depthWrite: false }));
        em.position.set(ex, 0.5, ez); g.add(em);
      }
    }
    return g;
  }, [activeTool, hoveredPosition, selectedStationPosition, conStart, stations, mapData]);

  useEffect(() => {
    const managed: THREE.Object3D[] = [];
    const addManaged = (obj: THREE.Object3D) => { scene.add(obj); obj.userData.__m = true; managed.push(obj); };

    addManaged(sceneObjects.ambient);
    addManaged(sceneObjects.hemi);
    addManaged(sceneObjects.dir);
    addManaged(sceneObjects.terrain);
    addManaged(sceneObjects.bldgs);
    addManaged(sceneObjects.grid);
    addManaged(dynObjs.sts);
    addManaged(dynObjs.rls);
    addManaged(previewObj);

    return () => {
      managed.forEach((o) => { scene.remove(o); delete o.userData.__m; });
    };
  }, [scene, sceneObjects, dynObjs, previewObj]);

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
        const obj = hit.object;

        if (obj.userData?.type === 'station') {
          const sid = obj.userData.stationId as string;
          if (activeTool === 'line') {
            if (conStart?.stationId === sid) setCon(null); else setCon({ x: 0, z: 0, stationId: sid });
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
  }, [gl, camera, scene, activeTool, conStart, setSel, setHover, setCon, setSelectedStationPosition]);

  return (
    <MapControls makeDefault enableDamping dampingFactor={0.1}
      maxPolarAngle={Math.PI / 2.1} minDistance={5} maxDistance={800}
    />
  );
}

export default function GameCanvas({ mapData, showGrid = true }: GameCanvasProps) {
  return (
    <div className="flex-1 relative">
      <Canvas
        camera={{ position: [200, 150, 200], fov: 60, near: 0.1, far: 2000 }}
        gl={{ antialias: true }}
        style={{ background: '#87ceeb' }}
      >
        <SceneSetup mapData={mapData} showGrid={showGrid} />
        <CameraDirectionTracker />
      </Canvas>
    </div>
  );
}
