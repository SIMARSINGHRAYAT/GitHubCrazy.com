import { useEffect, useMemo, useState } from 'react';
import type { GitHubRepo } from '../types';
import { ArrowRight, ExternalLink, Loader2, Pencil, Plus, Star, Trash2, Trophy, X } from 'lucide-react';

interface Submission {
  id: string;
  githubRepoId: string;
  repositoryName: string;
  repositoryOwner: string;
  repositoryUrl: string;
  repositoryAvatar?: string | null;
  githubStars: number;
  description?: string | null;
  discoveryStars: number;
}

interface IncreaseStarsProps {
  token: string;
  user: { login: string; avatar_url: string };
  repos: GitHubRepo[];
}

const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

export function IncreaseStars({ token, user, repos }: IncreaseStarsProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [feed, setFeed] = useState<Submission[]>([]);
  const [selected, setSelected] = useState<GitHubRepo[]>([]);
  const [selectedDescriptions, setSelectedDescriptions] = useState<Record<string, string>>({});
  const [editingSelectedId, setEditingSelectedId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Submission | null>(null);
  const [description, setDescription] = useState('');
  const [starsUsed, setStarsUsed] = useState(0);
  const [starsRemaining, setStarsRemaining] = useState(50);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const availableRepos = useMemo(() => repos.filter(repo => !repo.private && !submissions.some(item => item.githubRepoId === String(repo.id)) && !selected.some(item => item.id === repo.id)), [repos, submissions, selected]);
  const current = feed[0];

  const load = async () => {
    try {
      const response = await fetch('/api/stars', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load community feed');
      setSubmissions(data.submissions || []); setFeed(data.feed || []); setStarsUsed(data.starsUsed || 0); setStarsRemaining(data.starsRemaining ?? 50); setLeaderboard(data.leaderboard || []);
    } catch (err: any) { setError(err.message || 'Failed to load community feed'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const submitSelected = async () => {
    if (!selected.length) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/stars', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'submit', repositories: selected.map(repo => ({ ...repo, discoveryDescription: selectedDescriptions[String(repo.id)] || '' })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We could not submit these repositories.');
      setSelected([]); setSelectedDescriptions({}); await load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const saveDescription = async () => {
    if (!editing || wordCount(description) > 50) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/stars', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'update', submissionId: editing.id, description }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update description.');
      setEditing(null); await load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const deleteSubmission = async (submissionId: string) => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/stars', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'delete', submissionId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not delete submission.');
      await load();
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  const interact = async (interaction: 'STAR' | 'SKIP') => {
    if (!current || (interaction === 'STAR' && starsRemaining <= 0)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/stars', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: 'interact', submissionId: current.id, interaction }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not process this repository.');
      setFeed(items => items.slice(1));
      if (interaction === 'STAR') { setStarsUsed(data.starsUsed); setStarsRemaining(data.starsRemaining); }
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto min-w-0 space-y-8">
    <div className="text-center">
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Increase Stars</h2>
      <p className="text-base text-gray-400 mt-3">Submit repositories and discover work from other developers.</p>
    </div>
    {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">{error}</div>}

    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 items-start">
      <section className="glass-card p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <h3 className="text-base font-black text-white uppercase tracking-widest">Selected Repositories</h3>
          <span className="text-sm text-gray-400">{submissions.length} live</span>
        </div>
        <div className="space-y-4">
          {submissions.map(item => <div key={item.id} className="p-4 bg-white/5 border border-white/10 flex items-start gap-3">
            <Star className="w-5 h-5 text-green-400 mt-1 shrink-0" />
            <div className="min-w-0 flex-1"><a href={item.repositoryUrl} target="_blank" rel="noreferrer" className="text-base font-bold text-white hover:text-green-400 break-words">{item.repositoryOwner} / {item.repositoryName}</a><p className="text-sm text-gray-400 mt-2 break-words">{item.description || 'No description provided.'}</p><p className="text-xs text-gray-500 mt-2">Discovery stars: {item.discoveryStars} · GitHub stars: {item.githubStars}</p></div>
            <button onClick={() => { setEditing(item); setDescription(item.description || ''); }} aria-label={`Edit ${item.repositoryName}`} title="Edit" className="p-2 text-gray-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => deleteSubmission(item.id)} disabled={busy} aria-label={`Delete ${item.repositoryName}`} title="Delete" className="p-2 text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
          </div>)}
          {selected.map(repo => { const repoDescription = selectedDescriptions[String(repo.id)] || ''; const isEditing = editingSelectedId === repo.id; return <div key={repo.id} className="p-4 border border-green-400/30 bg-green-400/5"><div className="flex items-center gap-3"><Star className="w-5 h-5 text-green-400" /><span className="text-sm font-bold text-white flex-1">{repo.full_name}</span><button onClick={() => setEditingSelectedId(isEditing ? null : repo.id)} aria-label={`Edit ${repo.name}`} title="Edit"><Pencil className="w-4 h-4 text-gray-400 hover:text-white" /></button><button onClick={() => { setSelected(items => items.filter(item => item.id !== repo.id)); setSelectedDescriptions(items => { const next = { ...items }; delete next[String(repo.id)]; return next; }); }} aria-label={`Remove ${repo.name}`} title="Delete"><Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" /></button></div>{isEditing ? <><textarea value={repoDescription} onChange={event => setSelectedDescriptions(items => ({ ...items, [String(repo.id)]: event.target.value }))} rows={3} placeholder="Add a short description" className="w-full mt-4 bg-black/40 border border-white/10 p-3 text-sm text-white" /><p className={`text-xs mt-2 ${wordCount(repoDescription) > 50 ? 'text-red-400' : 'text-gray-400'}`}>{wordCount(repoDescription)} / 50 words</p></> : <p className="text-sm text-gray-400 mt-3">{repoDescription || 'No description provided. Select Edit to add one.'}</p>}</div>; })}
        </div>
        <div className="mt-6 space-y-4">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Add another repository</label>
          <select value="" onChange={event => { const repo = repos.find(item => String(item.id) === event.target.value); if (repo) setSelected(items => [...items, repo]); }} className="w-full bg-black/40 border border-white/10 px-4 py-3 text-base text-white"><option value="">+ Add Another Repository</option>{availableRepos.map(repo => <option key={repo.id} value={repo.id}>{repo.full_name}</option>)}</select>
          <button onClick={submitSelected} disabled={!selected.length || busy || selected.some(repo => wordCount(selectedDescriptions[String(repo.id)] || '') > 50)} className="w-full py-4 premium-gradient-green text-gray-950 font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />} Submit for Discovery</button>
        </div>
      </section>

      <section className="glass-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6"><div><h3 className="text-xl font-black text-white uppercase tracking-widest">Community Feed</h3><p className="text-sm text-gray-400 mt-2">One repository at a time</p></div><div className="text-right"><p className="text-xs text-gray-400 uppercase tracking-widest">Daily Star Limit</p><p className="text-xl font-black text-green-400 mt-1">{starsUsed} / 50</p><p className="text-xs text-gray-500">Remaining: {starsRemaining}</p></div></div>
        {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 text-green-400 animate-spin" /></div> : !current ? <div className="py-20 text-center"><Star className="w-14 h-14 text-gray-600 mx-auto mb-5" /><p className="text-lg font-bold text-gray-300">No repositories are currently available for discovery.</p><p className="text-sm text-gray-500 mt-3">Check back later.</p></div> : <div className="border border-green-400/30 bg-black/30 p-6 sm:p-8"><div className="flex items-start gap-5"><img src={current.repositoryAvatar || user.avatar_url} alt="" className="w-16 h-16 border border-white/10" /><div className="min-w-0"><a href={current.repositoryUrl} target="_blank" rel="noreferrer" className="text-xl sm:text-2xl font-black text-white hover:text-green-400 break-words">{current.repositoryOwner} / {current.repositoryName}</a><p className="text-base text-gray-300 mt-4 leading-relaxed">{current.description || 'No description provided.'}</p><p className="text-sm text-gray-500 mt-5">GitHub stars: {current.githubStars} · Discovery stars: {current.discoveryStars}</p><a href={current.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-green-400 mt-4 hover:underline">View repository <ExternalLink className="w-4 h-4" /></a></div></div><div className="grid grid-cols-2 gap-4 mt-8"><button onClick={() => interact('SKIP')} disabled={busy} className="py-4 border border-white/20 text-gray-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><X className="w-4 h-4" /> Cancel</button><button onClick={() => interact('STAR')} disabled={busy || starsRemaining <= 0} className="py-4 premium-gradient-green text-gray-950 font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"><Star className="w-4 h-4" /> Star <ArrowRight className="w-4 h-4" /></button></div>{starsRemaining <= 0 && <p className="text-sm text-red-400 mt-5 text-center">You have reached today's limit of 50 repository stars.</p>}</div>}
      </section>
    </div>

    <section className="glass-card p-6 sm:p-8"><h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><Trophy className="w-5 h-5 text-yellow-400" /> Repository Star Leaderboard</h3><div className="grid md:grid-cols-3 gap-4 mt-5">{leaderboard.map((entry, index) => <div key={entry.username} className="p-4 bg-white/5 border border-white/10"><p className="text-xs text-gray-500">#{index + 1}</p><p className="text-base text-white font-bold mt-2">@{entry.username}</p><p className="text-sm text-green-400 mt-2">Discovery stars received: {entry.discoveryStarsReceived}</p><p className="text-xs text-gray-400 mt-1">Repositories starred: {entry.repositoriesStarred}</p></div>)}</div></section>

    {editing && <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-5"><div className="glass-card p-6 sm:p-8 w-full max-w-xl"><div className="flex items-center justify-between mb-5"><h3 className="text-lg font-black text-white uppercase">Edit Description</h3><button onClick={() => setEditing(null)} aria-label="Close editor"><X className="w-5 h-5 text-gray-400" /></button></div><p className="text-sm text-gray-300 mb-3">{editing.repositoryOwner} / {editing.repositoryName}</p><textarea value={description} onChange={event => setDescription(event.target.value)} rows={5} className="w-full bg-black/40 border border-white/10 p-4 text-base text-white resize-y" /><p className={`text-sm mt-2 ${wordCount(description) > 50 ? 'text-red-400' : 'text-gray-400'}`}>{wordCount(description)} / 50 words</p><button onClick={saveDescription} disabled={busy || wordCount(description) > 50} className="w-full mt-5 py-4 premium-gradient-green text-gray-950 font-black text-xs uppercase tracking-widest disabled:opacity-40">Save Description</button></div></div>}
  </div>;
}
