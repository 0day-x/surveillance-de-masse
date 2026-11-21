import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Report } from './types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/reports`)
      .then((response) => response.json())
      .then((data) => setReports(data.reports || []));
  }, []);

  function MapClick() {
    useMapEvents({ click(event) { setSelected([event.latlng.lat, event.latlng.lng]); } });
    return null;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.prevent; 
  }

  return <main>
    <h1>Surveillance de masse</h1>
    <p>Cliquez sur la carte pour proposer une localisation publique. Les contributions passent par modération.</p>
    {selected && <form onSubmit={submit}>
      <strong>Position :</strong> {selected[0].toFixed(6)}, {selected[1].toFixed(6)}
      <select name="kind"><option>ANPR</option><option>CAMERA</option><option>UNKNOWN</option></select>
      <textarea name="description" maxLength={1000} placeholder="Description publique…" />
      <input name="source_url" type="url" placeholder="Lien vers une source publique (facultatif)" />
      <button>Envoyer pour modération</button>
    </form>}
    {notice && <p role="status">{notice}</p>}
    <MapContainer center={[46.603354, 1.888334]} zoom={6} style={{ height: '70vh' }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapClick />
      {reports.map((report) => <Marker key={report.id} position={[report.latitude, report.longitude]} icon={icon}>
        <Popup><b>{report.kind}</b><br />{report.description || ''}{report.source_url && <><br /><a href={report.source_url} target="_blank" rel="noreferrer">Source</a></>}</Popup>
      </Marker>)}
      {selected && <Marker position={selected} icon={icon} />}
    </MapContainer>
  </main>;
}
