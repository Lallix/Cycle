import { useState, useEffect } from 'react';
import { Shield, Users, Tag, Download, RefreshCw, Trash2, UserX, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

// ─── Utility ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function StatusBadge({ active }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
      active ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
    }`}>
      {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

// ─── Users Panel ─────────────────────────────────────────────────────────────

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast(error.message, 'error');
    else setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Joined', 'Cycle Start Day'];
    const rows = users.map(u => [
      u.full_name || '',
      u.email || '',
      u.role || 'user',
      formatDate(u.created_at),
      u.cycle_start_day || 25,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cycle-users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Users exported', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{u.full_name || 'Unnamed'}</p>
                    <StatusBadge active={true} />
                    {u.is_admin && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5 truncate">{u.email}</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs text-muted">Joined: {formatDate(u.created_at)}</span>
                    <span className="text-xs text-muted">Cycle day: {u.cycle_start_day || 25}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center text-sm font-bold text-gold">
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Categories Panel ─────────────────────────────────────────────────────────

function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    // Get all categories with usage counts
    const { data: cats, error } = await supabase
      .from('cycle_categories')
      .select('*, cycle_transactions(count)')
      .order('type')
      .order('name');
    if (error) toast(error.message, 'error');
    else setCategories(cats || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (cat) => {
    const count = cat.cycle_transactions?.[0]?.count || 0;
    if (count > 0) {
      toast(`Cannot delete — ${count} transaction(s) use this category`, 'error');
      return;
    }
    setDeleting(cat.id);
    const { error } = await supabase.from('cycle_categories').delete().eq('id', cat.id);
    if (error) toast(error.message, 'error');
    else {
      toast('Category deleted', 'success');
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    }
    setDeleting(null);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Type', 'Icon', 'Colour', 'Budget', 'Transactions'];
    const rows = categories.map(c => [
      c.name, c.type, c.icon || '', c.colour || '',
      c.budget_amount || '', c.cycle_transactions?.[0]?.count || 0,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cycle-categories-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Categories exported', 'success');
  };

  const grouped = categories.reduce((acc, c) => {
    const key = c.type || 'uncategorised';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="text-muted animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">{categories.length} categories</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} className="mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {Object.entries(grouped).map(([type, cats]) => (
        <div key={type} className="mb-6">
          <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">
            {type.replace('_', ' ')}
          </p>
          <div className="space-y-2">
            {cats.map(cat => {
              const txCount = cat.cycle_transactions?.[0]?.count || 0;
              return (
                <div key={cat.id} className="card p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl w-8 text-center shrink-0">{cat.icon || '📦'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{cat.name}</p>
                      <p className="text-xs text-muted">
                        {txCount} transaction{txCount !== 1 ? 's' : ''}
                        {cat.budget_amount ? ` · Budget R${cat.budget_amount.toLocaleString()}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(cat)}
                    disabled={deleting === cat.id || txCount > 0}
                    className="shrink-0 p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={txCount > 0 ? 'In use — cannot delete' : 'Delete category'}
                  >
                    {deleting === cat.id
                      ? <RefreshCw size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <EmptyState icon={Tag} title="No categories found" />
      )}
    </div>
  );
}

// ─── Stats Panel ──────────────────────────────────────────────────────────────

function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [
          { count: userCount },
          { count: txCount },
          { data: totalData },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('cycle_transactions').select('*', { count: 'exact', head: true }),
          supabase.from('cycle_transactions').select('amount'),
        ]);

        const totalSpend = (totalData || []).reduce((s, t) => s + (t.amount || 0), 0);

        setStats({ userCount, txCount, totalSpend });
      } catch (e) {
        toast('Failed to load stats', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="text-muted animate-spin" />
      </div>
    );
  }

  const items = [
    { label: 'Total Users', value: stats?.userCount ?? '—' },
    { label: 'Total Transactions', value: stats?.txCount ?? '—' },
    { label: 'Total Spend Recorded', value: stats?.totalSpend != null ? `R ${stats.totalSpend.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : '—' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map(item => (
        <div key={item.label} className="card p-5">
          <p className="text-xs text-muted uppercase tracking-widest mb-1">{item.label}</p>
          <p className="text-2xl font-bold money">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'stats', label: 'Overview', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'categories', label: 'Categories', icon: Tag },
];

export default function AdminPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');

  if (!profile?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <UserX size={48} className="text-muted mb-4" />
        <h2 className="text-lg font-semibold mb-1">Access Denied</h2>
        <p className="text-sm text-muted">This area is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Admin"
        subtitle="System management"
        icon={<Shield size={18} className="text-gold" />}
      />

      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-bg border-b border-border px-4">
        <div className="flex gap-1 py-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gold/10 text-gold'
                    : 'text-muted hover:text-fg hover:bg-surface-2'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4">
        {activeTab === 'stats' && <StatsPanel />}
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'categories' && <CategoriesPanel />}
      </div>
    </div>
  );
}
