export type ConstructionMethod = 'surface' | 'elevated' | 'tunnel' | 'bridge';
export type LandUseType = 'urban' | 'suburban' | 'rural' | 'forest' | 'mountain' | 'water' | 'river' | 'agriculture' | 'industrial' | 'park';
export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
export type EvaluationCategory = 'profitability' | 'transportVolume' | 'networkCoverage' | 'financialHealth' | 'punctuality';
export type ObjectiveType = 'passengers' | 'profit' | 'coverage' | 'punctuality' | 'custom';
export type ConstructionTool = 'select' | 'station' | 'line' | 'demolish' | null;
export type PanelName = 'none' | 'construction' | 'timetable' | 'finance' | 'menu';
export type StationType = 'normal' | 'terminal' | 'junction' | 'underground';

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface GameTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface LandUseCell {
  type: LandUseType;
  costMultiplier: number;
  allowedMethods: ConstructionMethod[];
}

export interface PopulationCell {
  daytime: number;
  nighttime: number;
  commercial: number;
  residential: number;
  industrial: number;
}

// OSM/GeoJSON types --------------------------------------------------------

export interface GeoJSONGeometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';
  coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: GeoJSONGeometry;
  properties: Record<string, string | number | boolean | null>;
  id?: string | number;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface OSMNode {
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

export interface OSMWay {
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export interface OSMRelation {
  id: number;
  members: { type: 'node' | 'way' | 'relation'; ref: number; role: string }[];
  tags?: Record<string, string>;
}

export interface OSMRawData {
  elements: (OSMNode | OSMWay | OSMRelation)[];
}

export type OSMFeatureType =
  | 'building'
  | 'water'
  | 'river'
  | 'road'
  | 'railway'
  | 'forest'
  | 'park'
  | 'agriculture'
  | 'industrial'
  | 'residential'
  | 'commercial';

export interface OSMFeature {
  id: string;
  type: OSMFeatureType;
  geometry: GeoJSONGeometry;
  properties: Record<string, string | number | boolean | null>;
  tags: Record<string, string>;
  bounds?: { minLat: number; maxLat: number; minLon: number; maxLon: number };
}

// Map data types -----------------------------------------------------------

export interface Landmark {
  id: string;
  name: string;
  position: { x: number; z: number };
  type: 'station' | 'building' | 'park' | 'poi' | 'river' | 'mountain' | 'custom';
  elevation?: number;
  description?: string;
}

export interface OSMBuilding {
  id: string;
  position: { x: number; z: number };
  height?: number;
  levels?: number;
  buildingType: 'residential' | 'commercial' | 'industrial' | 'public' | 'other';
  footprint?: number[][]; // Polygon coordinates
  name?: string;
}

export interface MapData {
  id: string;
  name: string;
  description: string;
  bounds: GeoBounds;
  center: { lat: number; lng: number };
  gridSize: number;
  gridWidth: number;
  gridHeight: number;
  heightMap: number[][];
  landUse: LandUseCell[][];
  population: PopulationCell[][];
  geoJSON?: GeoJSONFeatureCollection;
  osmFeatures?: OSMFeature[];
  landmarks?: Landmark[];
  osmBuildings?: OSMBuilding[];
}

// Scenario types -----------------------------------------------------------

export interface InitialFacility {
  type: 'station' | 'line';
  ownerId: string;
  stationName?: string;
  position?: { x: number; z: number };
  stationIds?: string[];
  lineName?: string;
}

export interface CompetitorData {
  id: string;
  name: string;
  color: string;
  aggression: number;
  initialFacilities: InitialFacility[];
}

export interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: number;
  current: number;
  reward: number;
  evaluationWeights?: Partial<Record<EvaluationCategory, number>>;
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  mapId: string;
  mapBounds: { startX: number; startZ: number; width: number; height: number };
  startYear: number;
  startFunds: number;
  initialFacilities: InitialFacility[];
  competitors: CompetitorData[];
  objectives: Objective[];
  osmQuery?: { lat: number; lon: number; radius: number };
}

// Railway network types ----------------------------------------------------

export interface Station {
  id: string;
  ownerId: string;
  name: string;
  position: { x: number; z: number };
  elevation: number;
  type: StationType;
  passengers: number;
  lineIds: string[];
  facilityIds: string[];
}

export interface LineSegment {
  startStationId: string;
  endStationId: string;
  length: number;
  constructionCost: number;
  constructionMethod: ConstructionMethod;
  completed: boolean;
  underConstruction: boolean;
  remainingDays: number;
}

export interface RailLine {
  id: string;
  ownerId: string;
  name: string;
  color: string;
  stationIds: string[];
  segments: LineSegment[];
  timetable: TimetableEntry[];
  trainIds: string[];
}

export interface Facility {
  id: string;
  ownerId: string;
  name: string;
  position: { x: number; z: number };
  type: 'depot' | 'signal' | 'power' | 'maintenance';
}

export interface Train {
  id: string;
  ownerId: string;
  name: string;
  capacity: number;
  maxSpeed: number;
  cars: number;
}

export interface TimetableEntry {
  trainId: string;
  lineId: string;
  direction: 'up' | 'down';
  departures: { stationId: string; arrivalTime: string; departureTime: string }[];
  intervalMinutes?: number;
}

// Finance types ------------------------------------------------------------

export interface FinanceRecord {
  date: GameTime;
  type: 'construction' | 'fare' | 'maintenance' | 'subsidy' | 'scenario_reward' | 'other';
  amount: number;
  description: string;
}

export interface FinanceData {
  funds: number;
  history: FinanceRecord[];
}

// Evaluation types ---------------------------------------------------------

export interface Evaluation {
  overall: ScoreGrade;
  profitability: ScoreGrade;
  transportVolume: ScoreGrade;
  networkCoverage: ScoreGrade;
  financialHealth: ScoreGrade;
  punctuality: ScoreGrade;
}

export interface ObjectiveProgress {
  id: string;
  completed: boolean;
  current: number;
  target: number;
  completedAt?: GameTime;
}

export interface RailwayNetwork {
  stations: Station[];
  lines: RailLine[];
  trains: Train[];
  facilities: Facility[];
}

// Game state type ----------------------------------------------------------

export interface GameState {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  playTime: number;
  scenarioId: string | null;
  time: GameTime;
  speed: 0 | 1 | 2 | 5 | 10;
  paused: boolean;
  mapId: string;
  railwayNetwork: RailwayNetwork;
  finance: FinanceData;
  objectives: ObjectiveProgress[];
  evaluation: Evaluation;
}

// Simulation types ---------------------------------------------------------

export interface PassengerDemand {
  originStationId: string;
  destinationStationId: string;
  dailyPassengers: number;
}

export interface SimulationResult {
  stationPassengers: Record<string, number>;
  linePassengers: Record<string, number>;
  revenue: number;
  expenses: number;
  demand: PassengerDemand[];
}
