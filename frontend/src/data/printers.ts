export interface PrinterProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  printVolume: string;
  volumeX: number;
  volumeY: number;
  volumeZ: number;
  nozzle: string;
  supportedMaterials: string[];
  hotend: string;
  firmware: string;
}

export const printerProfiles: PrinterProfile[] = [
  {
    id: 'bambu-p1s',
    name: 'Bambu Lab P1S',
    brand: 'Bambu Lab',
    model: 'P1S',
    printVolume: '256 × 256 × 256 mm',
    volumeX: 256,
    volumeY: 256,
    volumeZ: 256,
    nozzle: '0.4 mm',
    supportedMaterials: ['PLA', 'PETG', 'ABS', 'TPU'],
    hotend: 'All-metal',
    firmware: 'Bambu Studio',
  },
  {
    id: 'ender-3-v3',
    name: 'Creality Ender 3 V3',
    brand: 'Creality',
    model: 'Ender 3 V3',
    printVolume: '220 × 220 × 250 mm',
    volumeX: 220,
    volumeY: 220,
    volumeZ: 250,
    nozzle: '0.4 mm',
    supportedMaterials: ['PLA', 'PETG', 'ABS', 'TPU'],
    hotend: 'Copper Alloy',
    firmware: 'Marlin',
  },
  {
    id: 'k1-max',
    name: 'Bambu Lab K1 Max',
    brand: 'Bambu Lab',
    model: 'K1 Max',
    printVolume: '300 × 300 × 300 mm',
    volumeX: 300,
    volumeY: 300,
    volumeZ: 300,
    nozzle: '0.4 mm',
    supportedMaterials: ['PLA', 'PETG', 'ABS', 'TPU'],
    hotend: 'All-metal',
    firmware: 'Bambu Studio',
  },
  {
    id: 'neptune-4',
    name: 'Elegoo Neptune 4',
    brand: 'Elegoo',
    model: 'Neptune 4',
    printVolume: '225 × 225 × 265 mm',
    volumeX: 225,
    volumeY: 225,
    volumeZ: 265,
    nozzle: '0.4 mm',
    supportedMaterials: ['PLA', 'PETG', 'ABS', 'TPU'],
    hotend: 'High Flow',
    firmware: 'Marlin',
  },
];
