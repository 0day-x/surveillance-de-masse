import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { Report } from './types';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

function MapClick({ onSelect }: { onSelect: (point: [number, number]) => void }) {
  useMapEvents({ click(event) { onSelect([event.latlng.lat, event.latlng.lng]); } });
  return null;
}

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pending, setPending] = useState<Report[]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [notice, setNotice] = useState('Chargement de la carte…');
  const [busy, setBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');

  async function loadReports() {
    const response = await fetch(`${API_URL}/api/reports`);
    if (!response.ok) throw new Error('Impossible de charger les signalements.');
    const data = await response.json();
    setReports(data.reports || []);
    setNotice(`${(data.reports || []).length} signalement(s) publié(s).`);
  }

  useEffect(() => { loadReports().catch((error) => setNotice(error.message)); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/reports`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: selected[0], longitude: selected[1], kind: form.get('kind'), description: form.get('description'), source_url: form.get('source_url') })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Échec de l’envoi.');
      setSelected(null);
      setNotice('Merci ! Votre signalement est en attente de modération.');
      event.currentTarget.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Échec de l’envoi.');
    } finally { setBusy(false); }
  }

  async function loadPending() {
    const response = await fetch(`${API_URL}/api/admin/reports`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Accès refusé.');
    setPending(data.reports || []);
  }

  async function moderate(id: string, status: 'approved' | 'rejected') {
    const response = await fetch(`${API_URL}/api/admin/reports/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) { setNotice(data.error || 'Action impossible.'); return; }
    setPending((items) => items.filter((item) => item.id !== id));
    if (status === 'approved') await loadReports();
  }

  return <main className="app-shell">
    <header className="topbar">
      <div><p className="eyebrow">CARTOGRAPHIE CITOYENNE · FRANCE</p><h1>Surveillance de masse</h1></div>
      <button className="secondary" onClick={() => setShowAdmin((value) => !value)}>{showAdmin ? 'Fermer modération' : 'Modération'}</button>
    </header>
    <section className="intro"><div><h2>Observer. Documenter. Débattre.</h2><p>Carte communautaire de signalements publics. Les contributions sont vérifiées avant publication.</p></div><div className="legend"><span><i className="dot" /> Signalement publié</span><span>OpenStreetMap</span></div></section>
    <p className="notice" role="status">{notice}</p>
    <section className="map-frame" aria-label="Carte interactive des signalements">
      <MapContainer center={[46.603354, 1.888334]} zoom={6} scrollWheelZoom style={{ height: 'min(68vh, 760px)', minHeight: 420 }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClick onSelect={setSelected} />
        {reports.map((report) => <Marker key={report.id} position={[report.latitude, report.longitude]} icon={icon}><Popup><strong>{report.kind}</strong>{report.description && <p>{report.description}</p>}{report.source_url && <a href={report.source_url} target="_blank" rel="noreferrer">Consulter la source</a>}</Popup></Marker>)}
        {selected && <Marker position={selected} icon={icon} />}
      </MapContainer>
    </section>
    {selected && <section className="panel submit-panel"><div><h2>Proposer un signalement</h2><p>Position choisie : {selected[0].toFixed(5)}, {selected[1].toFixed(5)}</p></div>
      <form onSubmit={submit}>
        <label>Type<select name="kind"><option value="ANPR">Lecture automatisée de plaques (ANPR)</option><option value="CAMERA">Caméra</option><option value="UNKNOWN">Type inconnu</option></select></label>
        <label>Description publique<textarea name="description" maxLength={1000} placeholder="Décrivez uniquement l’installation, sans données personnelles." /></label>
        <label>Source publique (facultatif)<input name="source_url" type="url" maxLength={2000} placeholder="https://…" /></label>
        <p className="privacy-note">Ne publiez ni visages, ni plaques, ni déplacements de véhicules, ni informations personnelles. Ne pénétrez pas sur une propriété privée.</p>
        <button disabled={busy}>{busy ? 'Envoi…' : 'Envoyer pour modération'}</button>
      </form>
    </section>}
    {showAdmin && <section className="panel admin-panel"><h2>Modération</h2><p>Le jeton est utilisé uniquement en mémoire dans cette page et n’est pas enregistré.</p><form onSubmit={(event) => { event.preventDefault(); loadPending().then(() => setNotice('Signalements en attente chargés.')).catch((error) => setNotice(error.message)); }}><label>Jeton administrateur<input type="password" autoComplete="off" value={adminToken} onChange={(event) => setAdminToken(event.target.value)} required /></label><button>Charger les signalements en attente</button></form>
      {pending.map((report) => <article className="pending-item" key={report.id}><strong>{report.kind}</strong><p>{report.latitude.toFixed(5)}, {report.longitude.toFixed(5)} · {report.description || 'Sans description'}</p>{report.source_url && <a href={report.source_url} target="_blank" rel="noreferrer">Source</a>}<div className="actions"><button onClick={() => moderate(report.id, 'approved')}>Approuver</button><button className="danger" onClick={() => moderate(report.id, 'rejected')}>Refuser</button></div></article>)}
    </section>}
    <footer><span>Projet libre · AGPL-3.0</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Données cartographiques © contributeurs OpenStreetMap</a><a href="https://github.com/0day-x/surveillance-de-masse">Code source</a></footer>
  </main>;
}
