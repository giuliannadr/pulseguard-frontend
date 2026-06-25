'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function ImportPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  
  // Import state
  const [selectedRepo, setSelectedRepo] = useState<any | null>(null);
  const [url, setUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const tok = session?.access_token ?? null;
      // provider_token is only available right after OAuth — persist it so it survives page refresh
      const freshGToken = session?.provider_token ?? null;
      if (freshGToken) {
        localStorage.setItem('gh_provider_token', freshGToken);
      }
      const gToken = freshGToken ?? localStorage.getItem('gh_provider_token');

      setToken(tok);
      setGithubToken(gToken);

      if (tok && gToken) {
        api.github.repos(tok, gToken)
          .then(data => {
            setRepos(data);
            setLoadingRepos(false);
          })
          .catch(e => {
            console.error(e);
            // Token might be stale — clear it so user can reconnect
            if (e.message?.includes('401') || e.message?.includes('403')) {
              localStorage.removeItem('gh_provider_token');
            }
            setError(e.message || 'Failed to load repositories');
            setLoadingRepos(false);
          });
      } else {
        setLoadingRepos(false);
      }
    });
  }, []);

  async function handleConnectGithub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/import`,
        scopes: 'repo write:repo_hook read:user'
      }
    });
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !githubToken || !selectedRepo || !url) return;
    
    setError('');
    setImporting(true);
    
    try {
      // 1. Create monitor
      const monitor = await api.monitors.create({
        name: selectedRepo.name,
        url: url,
        expectedStatus: 200,
        intervalMinutes: 5,
      }, token);
      
      // 2. Connect webhook
      const [owner, repoName] = selectedRepo.full_name.split('/');
      await api.github.connect(monitor.id, owner, repoName, token, githubToken);
      
      // 3. Redirect to monitor details
      router.push(`/monitors/${monitor.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to import repository');
      setImporting(false);
    }
  }

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4A4A4A' }}>
        <Link href="/dashboard" style={{ color: '#4A4A4A', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span>/</span>
        <span style={{ color: '#CAFF00' }}>Import Git Repository</span>
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#F0F0F0', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
        Let's build something new.
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#888', margin: '0 0 32px' }}>
        To deploy a new Project, import an existing Git Repository.
      </p>

      {/* Main Container */}
      <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#F0F0F0"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#F0F0F0', fontFamily: 'var(--font-display)' }}>
            Import Git Repository
          </h2>
        </div>

        {/* List of Repos */}
        <div style={{ padding: '0' }}>
          {loadingRepos ? (
             <div style={{ padding: '40px', textAlign: 'center', color: '#4A4A4A', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
               Loading repositories...
             </div>
          ) : repos.length === 0 ? (
             <div style={{ padding: '60px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#F0F0F0', margin: '0 0 12px' }}>
                 {githubToken ? "No public repositories found." : "Connect your GitHub Account"}
               </h3>
               <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#666', margin: '0 0 24px', maxWidth: 400 }}>
                 {githubToken 
                   ? "We couldn't find any repositories. If your repositories are private, you may need to reconnect to grant the correct permissions." 
                   : "To import a project and set up DevSecOps, you need to connect your GitHub account so we can fetch your repositories and configure webhooks."}
               </p>
               {error && (
                 <div style={{ background: 'rgba(255,23,68,0.1)', color: '#FF1744', padding: '10px', borderRadius: 4, marginBottom: 20, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                   Error: {error}
                 </div>
               )}
               <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#4A4A4A', marginBottom: 20 }}>
                 Debug: Token={token ? 'Yes' : 'No'} | GithubToken={githubToken ? 'Yes' : 'No'}
               </div>
               <button onClick={handleConnectGithub} className="btn-strict-secondary" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', fontSize: 14 }}>
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                   <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                 </svg>
                 {githubToken ? "Reconnect GitHub" : "Connect GitHub"}
               </button>
             </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column' }}>
               {repos.map((repo, idx) => {
                 const isSelected = selectedRepo?.id === repo.id;
                 return (
                   <div key={repo.id} style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     justifyContent: 'space-between',
                     padding: '16px 24px',
                     borderBottom: idx < repos.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                     background: isSelected ? 'rgba(202, 255, 0, 0.03)' : 'transparent'
                   }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F0F0F0', fontWeight: 'bold', fontSize: 14 }}>
                         {repo.owner.login.charAt(0).toUpperCase()}
                       </div>
                       <div>
                         <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#F0F0F0', fontWeight: 600 }}>
                           {repo.name}
                         </div>
                         <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#666', marginTop: 4 }}>
                           {repo.private ? 'Private' : 'Public'} • Updated {new Date(repo.updated_at).toLocaleDateString()}
                         </div>
                       </div>
                     </div>
                     
                     {!isSelected ? (
                       <button 
                         onClick={() => setSelectedRepo(repo)}
                         style={{
                           background: '#fff',
                           color: '#000',
                           border: 'none',
                           borderRadius: 4,
                           padding: '6px 16px',
                           fontFamily: 'var(--font-mono)',
                           fontSize: 12,
                           fontWeight: 600,
                           cursor: 'pointer',
                         }}
                       >
                         Import
                       </button>
                     ) : (
                       <button 
                         onClick={() => setSelectedRepo(null)}
                         style={{
                           background: 'transparent',
                           color: '#888',
                           border: '1px solid #333',
                           borderRadius: 4,
                           padding: '6px 16px',
                           fontFamily: 'var(--font-mono)',
                           fontSize: 12,
                           cursor: 'pointer',
                         }}
                       >
                         Cancel
                       </button>
                     )}
                   </div>
                 );
               })}
             </div>
          )}
        </div>
      </div>

      {/* Configuration Section if selected */}
      {selectedRepo && (
        <div style={{ marginTop: 24, background: '#080808', border: '1px solid #CAFF00', borderRadius: 6, padding: 24, animation: 'pg-fade-in 0.2s ease-out both' }}>
          <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-display)', fontSize: 18, color: '#F0F0F0' }}>
            Configure Project
          </h3>
          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>Project Name</label>
              <input 
                className="input-strict" 
                value={selectedRepo.name} 
                disabled 
                style={{ opacity: 0.6 }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase' }}>Deployed URL <span style={{ color: '#CAFF00' }}>*</span></label>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#666', margin: '0 0 12px' }}>Enter the production or staging URL where this repository is hosted.</p>
              <input 
                className="input-strict" 
                placeholder="https://my-api.vercel.app" 
                type="url"
                required
                value={url}
                onChange={e => setUrl(e.target.value)}
                autoFocus
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(202, 255, 0, 0.05)', padding: 12, borderRadius: 4, border: '1px solid rgba(202, 255, 0, 0.15)' }}>
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CAFF00" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
               <div>
                 <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#CAFF00', fontWeight: 'bold' }}>DevSecOps Webhook</span>
                 <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#aaa' }}>A webhook will be auto-configured in GitHub to scan every push for vulnerabilities.</span>
               </div>
            </div>

            {error && (
              <div style={{ color: '#FF1744', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{error}</div>
            )}

            <button type="submit" disabled={importing} className="btn-strict-primary" style={{ marginTop: 8, width: '100%', height: 44, fontSize: 14 }}>
              {importing ? 'Importing & Configuring...' : 'Deploy Project'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
