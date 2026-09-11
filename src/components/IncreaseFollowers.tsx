import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Heart, Loader2, Trophy, UserPlus, X } from 'lucide-react';

interface ProfileCard {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  profileUrl: string;
  followersCount: number;
}

interface IncreaseFollowersProps {
  token: string;
  user: { login: string; avatar_url: string };
}

export function IncreaseFollowers({ token }: IncreaseFollowersProps) {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [followsUsed, setFollowsUsed] = useState(0);
  const [followsRemaining, setFollowsRemaining] = useState(10);
  const [receivedLeaderboard, setReceivedLeaderboard] = useState<any[]>([]);
  const [activityLeaderboard, setActivityLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = profiles[0];

  const load = async () => {
    try {
      const response = await fetch('/api/followers', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load profiles');
      setProfiles(data.profiles || []); setFollowsUsed(data.followsUsed || 0); setFollowsRemaining(data.followsRemaining ?? 10); setReceivedLeaderboard(data.receivedLeaderboard || []); setActivityLeaderboard(data.activityLeaderboard || []);
    } catch (err: any) { setError(err.message || 'Failed to load profiles'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const interact = async (action: 'follow' | 'skip') => {
    if (!current || (action === 'follow' && followsRemaining <= 0)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/followers', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, profileId: current.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not process this profile.');
      setProfiles(items => items.slice(1));
      if (action === 'follow') { setFollowsUsed(data.followsUsed); setFollowsRemaining(data.followsRemaining); }
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  };

  return <div className="max-w-6xl mx-auto min-w-0 space-y-8">
    <div className="text-center"><h2 className="text-3xl font-black text-white uppercase tracking-tighter">Increase Followers</h2><p className="text-base text-gray-400 mt-3">Discover and support other GitHub developers.</p></div>
    {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">{error}</div>}
    <section className="glass-card p-6 sm:p-10 max-w-3xl mx-auto">
      <div className="flex flex-wrap justify-between gap-4 border-b border-white/10 pb-5 mb-8"><div><h3 className="text-xl font-black text-white uppercase tracking-widest">Community Feed</h3><p className="text-sm text-gray-400 mt-2">One profile at a time</p></div><div className="text-right"><p className="text-xs text-gray-400 uppercase tracking-widest">Daily Follow Limit</p><p className="text-xl font-black text-blue-400 mt-1">{followsUsed} / 10</p><p className="text-xs text-gray-500">Remaining: {followsRemaining}</p></div></div>
      {loading ? <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 text-blue-400 animate-spin" /></div> : !current ? <div className="py-20 text-center"><UserPlus className="w-14 h-14 text-gray-600 mx-auto mb-5" /><p className="text-lg font-bold text-gray-300">No profiles are currently available for discovery.</p><p className="text-sm text-gray-500 mt-3">Check back later.</p></div> : <div className="border border-blue-400/30 bg-black/30 p-8 text-center"><img src={current.avatarUrl || ''} alt={current.username} className="w-24 h-24 mx-auto border-2 border-blue-400/40" /><p className="text-2xl font-black text-white mt-6">{current.name || current.username}</p><p className="text-base text-blue-400 mt-2">@{current.username}</p>{current.bio && <p className="text-base text-gray-300 leading-relaxed mt-6 max-w-xl mx-auto">{current.bio}</p>}<p className="text-sm text-gray-400 mt-6">Followers: {current.followersCount}</p><a href={current.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-400 mt-4 hover:underline">View GitHub profile <ExternalLink className="w-4 h-4" /></a><div className="grid grid-cols-2 gap-4 mt-8"><button onClick={() => interact('skip')} disabled={busy} className="py-4 border border-white/20 text-gray-300 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"><X className="w-4 h-4" /> Cancel</button><button onClick={() => interact('follow')} disabled={busy || followsRemaining <= 0} className="py-4 premium-gradient-green text-gray-950 font-black text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"><Heart className="w-4 h-4" /> Follow <ArrowRight className="w-4 h-4" /></button></div>{followsRemaining <= 0 && <p className="text-sm text-red-400 mt-5">You have reached today's limit of 10 profile follows.</p>}</div>}
    </section>
    <div className="grid lg:grid-cols-2 gap-8"><section className="glass-card p-6"><h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><Trophy className="w-5 h-5 text-yellow-400" /> Followers Received</h3><div className="space-y-3 mt-5">{receivedLeaderboard.map((entry, index) => <div key={entry.username} className="p-4 bg-white/5 border border-white/10 flex justify-between"><span className="text-white font-bold">#{index + 1} @{entry.username}</span><span className="text-blue-400">{entry.followersReceived}</span></div>)}</div></section><section className="glass-card p-6"><h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3"><Trophy className="w-5 h-5 text-yellow-400" /> Profiles Followed</h3><div className="space-y-3 mt-5">{activityLeaderboard.map((entry, index) => <div key={entry.username} className="p-4 bg-white/5 border border-white/10 flex justify-between"><span className="text-white font-bold">#{index + 1} @{entry.username}</span><span className="text-green-400">{entry.profilesFollowed}</span></div>)}</div></section></div>
  </div>;
}
