import type { Alert, Device, Farm, NotificationItem, Reading, UserRecord } from './types'

export const mockFarms: Farm[] = [
  { id: 'gef', name: 'Green Eden Farm', location: 'Jos, Plateau State', plots: 12, totalDevices: 8, onlineDevices: 7, offlineDevices: 1, openAlerts: 2, lastUpdate: '2 min ago', status: 'Warning' },
  { id: 'nvf', name: 'North Valley Farm', location: 'Kaduna, Kaduna State', plots: 8, totalDevices: 6, onlineDevices: 6, offlineDevices: 0, openAlerts: 1, lastUpdate: '1 min ago', status: 'Online' },
  { id: 'sdf', name: 'Sunrise Demonstration Farm', location: 'Kano, Kano State', plots: 15, totalDevices: 10, onlineDevices: 9, offlineDevices: 1, openAlerts: 1, lastUpdate: '5 min ago', status: 'Warning' },
  { id: 'jrp', name: 'Jos Research Plot', location: 'Jos, Plateau State', plots: 6, totalDevices: 4, onlineDevices: 4, offlineDevices: 0, openAlerts: 0, lastUpdate: '3 min ago', status: 'Online' },
]

export const mockDevices: Device[] = [
  { id: 'SG-JOS-001', farm: 'Green Eden Farm', plot: 'North Field A1', status: 'Online', battery: 92, signal: '-83 dBm', firmware: 'v1.0.0', lastSeen: '2 min ago' },
  { id: 'SG-JOS-002', farm: 'Green Eden Farm', plot: 'South Field B2', status: 'Warning', battery: 34, signal: '-88 dBm', firmware: 'v1.0.0', lastSeen: '4 min ago' },
  { id: 'SG-JOS-003', farm: 'Green Eden Farm', plot: 'East Field C1', status: 'Offline', battery: 71, signal: 'Unavailable', firmware: 'v1.0.0', lastSeen: '2h 18m ago' },
  { id: 'SG-JOS-004', farm: 'Green Eden Farm', plot: 'West Orchard D1', status: 'Online', battery: 84, signal: '-79 dBm', firmware: 'v1.0.0', lastSeen: '1 min ago' },
  { id: 'SG-NVF-001', farm: 'North Valley Farm', plot: 'Plot A2', status: 'Online', battery: 92, signal: '-76 dBm', firmware: 'v1.0.0', lastSeen: '1 min ago' },
  { id: 'SG-KAN-001', farm: 'Sunrise Demonstration Farm', plot: 'Plot B1', status: 'Sensor fault', battery: 63, signal: '-82 dBm', firmware: 'v0.9.8', lastSeen: '18 min ago' },
]

export const mockReadings: Reading[] = [
  { plot: 'North Field A1', farm: 'Green Eden Farm', crop: 'Corn', device: 'SG-JOS-001', status: 'Online', moisture: 31.4, temperature: 24.8, ph: 6.3, ec: 840, updated: '2 min ago', battery: 92, signal: '-83 dBm', timestamp: '12:00 PM', recorded: 'Sep 21, 2026 at 12:00 PM' },
  { plot: 'South Field B2', farm: 'Green Eden Farm', crop: 'Tomato', device: 'SG-JOS-002', status: 'Warning', moisture: 18.2, temperature: 27.1, ph: 6.7, ec: 920, updated: '4 min ago', battery: 34, signal: '-88 dBm', timestamp: '11:45 AM', recorded: 'Sep 21, 2026 at 11:45 AM' },
  { plot: 'East Field C1', farm: 'Green Eden Farm', crop: 'Cassava', device: 'SG-JOS-003', status: 'Offline', moisture: 42.6, temperature: 25.3, ph: 6.1, ec: 710, updated: '2h 18m ago', battery: 71, signal: 'Unavailable', timestamp: '11:30 AM', recorded: 'Sep 21, 2026 at 11:30 AM' },
  { plot: 'West Orchard D1', farm: 'Green Eden Farm', crop: 'Mango', device: 'SG-JOS-004', status: 'Online', moisture: 29.8, temperature: 25.9, ph: 6.5, ec: 805, updated: '1 min ago', battery: 84, signal: '-79 dBm', timestamp: '11:15 AM', recorded: 'Sep 21, 2026 at 11:15 AM' },
]

export const mockAlerts: Alert[] = [
  { id: 'al-001', severity: 'Critical', type: 'Device offline', farm: 'Green Eden Farm', plot: 'East Field C1', device: 'SG-JOS-003', triggered: '2h 18m ago', updated: '18m ago', status: 'Open' },
  { id: 'al-002', severity: 'Warning', type: 'Low soil moisture', farm: 'Green Eden Farm', plot: 'South Field B2', device: 'SG-JOS-002', triggered: '12 min ago', updated: '12 min ago', status: 'Acknowledged', current: '18.2%', threshold: '25%' },
  { id: 'al-003', severity: 'Warning', type: 'High EC', farm: 'North Valley Farm', plot: 'Plot A2', device: 'SG-NVF-001', triggered: '1h ago', updated: '24m ago', status: 'Resolved', current: '1450 µS/cm', threshold: '1200 µS/cm' },
  { id: 'al-004', severity: 'Critical', type: 'High soil temperature', farm: 'Sunrise Demonstration Farm', plot: 'West Orchard D1', device: 'SG-KAN-001', triggered: '34 min ago', updated: '8m ago', status: 'Open', current: '34.2°C', threshold: '32°C' },
  { id: 'al-005', severity: 'Warning', type: 'pH outside range', farm: 'Green Eden Farm', plot: 'South Field B2', device: 'SG-JOS-002', triggered: '3h ago', updated: '45m ago', status: 'Open', current: '5.1', threshold: '5.8–7.0' },
  { id: 'al-006', severity: 'Warning', type: 'Low battery', farm: 'Green Eden Farm', plot: 'South Field B2', device: 'SG-JOS-002', triggered: '5h ago', updated: '2h ago', status: 'Open', current: '34%', threshold: '40%' },
]

export const mockUsers: UserRecord[] = [
  { id: '1', name: 'Amina Musa', email: 'amina@greenedenfarms.com', role: 'Farm Manager', access: 'Green Eden Farm', status: 'Active', lastActive: 'Active now', initials: 'AM' },
  { id: '2', name: 'John Danladi', email: 'john@greenedenfarms.com', role: 'Administrator', access: 'All farms', status: 'Active', lastActive: '12 min ago', initials: 'JD' },
  { id: '3', name: 'David Okafor', email: 'david@greenedenfarms.com', role: 'Agronomist', access: 'North Valley Farm', status: 'Active', lastActive: '34 min ago', initials: 'DO' },
  { id: '4', name: 'Grace Bello', email: 'grace@greenedenfarms.com', role: 'Technician', access: 'Green Eden Farm', status: 'Active', lastActive: 'Yesterday', initials: 'GB' },
  { id: '5', name: 'Peter Adams', email: 'peter@greenedenfarms.com', role: 'Viewer', access: 'Sunrise Demonstration Farm', status: 'Pending', lastActive: 'Not active yet', initials: 'PA' },
]

export const mockNotifications: NotificationItem[] = [
  { id: 'soil', title: 'Low soil moisture', meta: 'South Field B2 · Green Eden Farm', description: 'Soil moisture is below the configured threshold.', time: '12 min ago', tone: 'text-amber-600', href: '/alerts/al-002' },
  { id: 'offline', title: 'Device offline', meta: 'East Field C1 · Green Eden Farm', description: 'SG-JOS-003 has not reported within the offline window.', time: '2h ago', tone: 'text-red-600', href: '/devices/SG-JOS-003' },
  { id: 'battery', title: 'Low battery', meta: 'South Field B2 · Green Eden Farm', description: 'SG-JOS-002 battery level is 34%.', time: '4h ago', tone: 'text-amber-600', href: '/alerts/al-006' },
  { id: 'resolved', title: 'Alert resolved', meta: 'North Field A1 · Green Eden Farm', description: 'Soil moisture returned within the configured range.', time: 'Yesterday', tone: 'text-[#1f7a52]', href: '/alerts/al-003' },
]

export const trendData = [
  { day: 'Sep 10', moisture: 26.2 },
  { day: 'Sep 11', moisture: 27.8 },
  { day: 'Sep 12', moisture: 29.1 },
  { day: 'Sep 13', moisture: 27.4 },
  { day: 'Sep 14', moisture: 30.6 },
  { day: 'Sep 15', moisture: 31.2 },
  { day: 'Sep 16', moisture: 31.4 },
]
