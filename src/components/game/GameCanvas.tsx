'use client';

import { useEffect, useMemo } from 'react';
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

function buildStations(stations: Station[]): THREE.Group {
  const group = new THREE.Group();
  if (!stations.length) return group;
  const geo = new THREE.CylinderGeometry(3, 4, 3, 8);
  for (const st of stations) {
    const m = new THREE.Mesh(geo.clone(), new THREE.MeshStandardMaterial({ color: st.ownerId === 'player' ? 0x3b82f6 : 0xef4444 }));
    m.position.set(st.position.x, st.elevation + 1.5, st.position.z);
    m.userData = { type: 'station', stationId: st.id, name: st.name };
    m.castShadow = true;
    group.add(m);
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

function SceneSetup({ mapData, showGrid = true }: GameCanvasProps) {
  const { scene, gl } = useThree();
  const stations = useGameStore((s) => s.railwayNetwork.stations);
  const lines = useGameStore((s) => s.railwayNetwork.lines);
  const activeTool = useUIStore((s) => s.activeTool);
  const hoveredPosition = useUIStore((s) => s.hoveredPosition);
  const conStart = useUIStore((s) => s.constructionStartPoint);
  const setHover = useUIStore((s) => s.setHoveredPosition);
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
    return { sts: buildStations(stations), rls: buildRails(lines, stations) };
  }, [stations, lines]);

  const previewObj = useMemo(() => {
    const g = new THREE.Group();
    if (!activeTool || activeTool === 'select' || activeTool === 'demolish') return g;
    if (activeTool === 'station' && hoveredPosition) {
      const x = Math.round(hoveredPosition.x / 10) * 10, z = Math.round(hoveredPosition.z / 10) * 10;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 3, 8), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 }));
      p.position.set(x, 1.5, z); g.add(p);
      const r = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.5, 16), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
      r.position.set(x, 0.1, z); r.rotation.x = -Math.PI / 2; g.add(r);
    }
    if (activeTool === 'line' && conStart && hoveredPosition) {
      const ss = stations.find((s) => s.id === conStart.stationId);
      if (ss) {
        const sx = ss.position.x, sz = ss.position.z, ex = Math.round(hoveredPosition.x / 10) * 10, ez = Math.round(hoveredPosition.z / 10) * 10;
        const len = Math.sqrt((ex - sx) ** 2 + (ez - sz) ** 2), ang = Math.atan2(ez - sz, ex - sx);
        const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, len, 4), new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.6 }));
        rl.rotation.z = Math.PI / 2; rl.position.set((sx + ex) / 2, 0.5, (sz + ez) / 2); rl.rotation.y = -ang; g.add(rl);
        const sm = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 }));
        sm.position.set(sx, 0.5, sz); g.add(sm);
        const em = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7 }));
        em.position.set(ex, 0.5, ez); g.add(em);
      }
    }
    return g;
  }, [activeTool, hoveredPosition, conStart, stations]);

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
    const dom = gl.domElement;
    const onDown = (e: any) => {
      if (e.delta > 0) return;
      const obj = e.object;
      if (obj?.userData?.type === 'station') {
        const sid = obj.userData.stationId as string;
        if (activeTool === 'line') {
          if (conStart?.stationId === sid) setCon(null); else setCon({ x: 0, z: 0, stationId: sid });
        } else { setSel(sid, 'station'); }
      } else if (activeTool === 'station') {
        if (e.point) setHover({ x: e.point.x, z: e.point.z });
      } else { setSel(null, null); }
    };
    const onMove = (e: any) => {
      if (e.object?.userData?.type === 'terrain' && e.point) setHover({ x: e.point.x, z: e.point.z });
    };
    dom.addEventListener('pointerdown', onDown);
    dom.addEventListener('pointermove', onMove);
    return () => { dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('pointermove', onMove); };
  }, [gl, activeTool, conStart, setSel, setHover, setCon]);

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
      </Canvas>
    </div>
  );
}
