import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar } from 'lucide-react';
import { Article, ArticleStatus } from '../types/article';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  scheduled: 'Scheduled',
  published: 'Published',
  sold: 'Sold',
};

const STATUS_COLORS: Record<ArticleStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  ready: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-green-100 text-green-700',
};

export function DashboardPageV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, [user]);

  const fetchArticles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setArticles(
        (data || []).map((article) => ({
          ...article,
          price: parseFloat(article.price),
          season: article.season === 'all_seasons' ? 'all-seasons' : article.season,
        }))
      );
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesStatus = statusFilter === 'all' ? true : article.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.brand?.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-slate-900">My Stock</h1>
            <button
              onClick={() => navigate('/articles/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
          <p className="text-slate-500">
            Manage your inventory ({filteredArticles.length} {filteredArticles.length === 1 ? 'item' : 'items'})
          </p>
        </div>

        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-base border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Items
          </button>
          {(['draft', 'ready', 'published', 'sold'] as ArticleStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg font-medium text-slate-900 mb-2">No items found</p>
            <p className="text-sm text-slate-500">Start by creating your first article</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                onClick={() => navigate(`/articles/${article.id}/preview`)}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                  {article.photos && article.photos.length > 0 ? (
                    <img
                      src={article.photos[0]}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[article.status]}`}>
                      {STATUS_LABELS[article.status]}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className="inline-block px-3 py-1.5 bg-white rounded-lg text-sm font-bold text-slate-900 shadow-sm">
                      {article.price.toFixed(2)}€
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-base font-semibold text-slate-900 mb-1 truncate group-hover:text-emerald-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-2">
                    {article.brand || 'Unknown'} • {article.size || 'M'}
                  </p>
                  <div className="flex items-center text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {formatDate(article.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
