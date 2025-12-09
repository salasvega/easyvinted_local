import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, ClipboardEdit, MoreVertical, Copy, Trash2, DollarSign, Calendar, Clock,
  CheckCircle2, FileText, Send, Flower2, Sun, Leaf, Snowflake, CloudSun, Upload,
  Package, Plus, Layers, ShoppingBag, TrendingUp
} from 'lucide-react';
import { Article, ArticleStatus, Season } from '../types/article';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { LotSoldModal } from '../components/LotSoldModal';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { AdminStatsCard } from '../components/admin/AdminStatsCard';
import { AdminFilters } from '../components/admin/AdminFilters';
import { AdminItemCard } from '../components/admin/AdminItemCard';
import { AdminDetailDrawer } from '../components/admin/AdminDetailDrawer';

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Brouillon',
  ready: 'Pret',
  scheduled: 'Planifie',
  published: 'Publie',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<ArticleStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  ready: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-violet-100 text-violet-700',
  sold: 'bg-emerald-100 text-emerald-700',
};

interface AdminItem {
  id: string;
  type: 'article' | 'lot';
  title: string;
  brand?: string;
  price: number;
  status: ArticleStatus;
  photos: string[];
  created_at: string;
  season?: Season;
  scheduled_for?: string;
  seller_id?: string;
  seller_name?: string;
  published_at?: string;
  sold_at?: string;
  sold_price?: number;
  net_profit?: number;
  reference_number?: string;
  lot_article_count?: number;
}

export function AdminPageV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'article' | 'lot'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [items, setItems] = useState<AdminItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    item: AdminItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
    item: AdminItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    item: AdminItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  const [soldModal, setSoldModal] = useState<{
    isOpen: boolean;
    item: AdminItem | null;
  }>({
    isOpen: false,
    item: null,
  });

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null);
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const fetchAllData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [articlesResult, lotsResult, membersResult] = await Promise.all([
        supabase
          .from('articles')
          .select(`
            *,
            family_members:seller_id (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('lots')
          .select(`
            *,
            lot_items!inner(article_id),
            family_members:seller_id (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('family_members')
          .select('id, name')
          .eq('user_id', user.id)
          .order('name')
      ]);

      if (articlesResult.error) throw articlesResult.error;
      if (lotsResult.error) throw lotsResult.error;
      if (membersResult.error) throw membersResult.error;

      const articles = articlesResult.data || [];
      const lots = lotsResult.data || [];
      const members = membersResult.data || [];

      setFamilyMembers(members);

      const articleItems: AdminItem[] = articles.map((article: any) => ({
        id: article.id,
        type: 'article',
        title: article.title,
        brand: article.brand,
        price: parseFloat(article.price),
        status: article.status,
        photos: article.photos || [],
        created_at: article.created_at,
        season: (article.season === 'all_seasons' ? 'all-seasons' : article.season) as Season,
        scheduled_for: article.scheduled_for,
        seller_id: article.seller_id,
        seller_name: article.family_members?.name || null,
        published_at: article.published_at,
        sold_at: article.sold_at,
        sold_price: article.sold_price ? parseFloat(article.sold_price) : undefined,
        net_profit: article.net_profit ? parseFloat(article.net_profit) : undefined,
        reference_number: article.reference_number,
      }));

      const lotItems: AdminItem[] = lots.map((lot: any) => ({
        id: lot.id,
        type: 'lot',
        title: lot.name,
        brand: `Lot (${lot.lot_items?.length || 0} articles)`,
        price: parseFloat(lot.price),
        status: lot.status,
        photos: lot.photos || [],
        created_at: lot.created_at,
        scheduled_for: lot.scheduled_for,
        seller_id: lot.seller_id,
        seller_name: lot.family_members?.name || null,
        published_at: lot.published_at,
        sold_at: lot.sold_at,
        sold_price: lot.price ? parseFloat(lot.price) : undefined,
        net_profit: lot.net_profit ? parseFloat(lot.net_profit) : undefined,
        reference_number: lot.reference_number,
        lot_article_count: lot.lot_items?.length || 0,
      }));

      const allItems = [...articleItems, ...lotItems].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching data:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors du chargement des donnees',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'all' ? true : item.status === statusFilter;
    const matchesSeller = sellerFilter === 'all'
      ? true
      : sellerFilter === 'none'
      ? !item.seller_id
      : item.seller_id === sellerFilter;
    const matchesType = typeFilter === 'all' ? true : item.type === typeFilter;

    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.brand?.toLowerCase().includes(query) ||
      item.reference_number?.toLowerCase().includes(query);

    return matchesStatus && matchesSeller && matchesType && matchesQuery;
  });

  const formatDate = (date?: string) => {
    if (!date) return 'Non defini';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getItemDate = (item: AdminItem): string => {
    if (item.status === 'sold' && item.sold_at) {
      return item.sold_at;
    }
    if (item.status === 'scheduled' && item.scheduled_for) {
      return item.scheduled_for;
    }
    return item.created_at;
  };

  const getDateLabel = (item: AdminItem): string => {
    if (item.status === 'sold') {
      return 'Vendu le';
    }
    if (item.status === 'scheduled') {
      return 'Planifie le';
    }
    return 'Cree le';
  };

  const renderStatusIcon = (status: ArticleStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-3.5 h-3.5" />;
      case 'ready':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'scheduled':
        return <Clock className="w-3.5 h-3.5" />;
      case 'published':
        return <Send className="w-3.5 h-3.5" />;
      case 'sold':
        return <DollarSign className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const renderSeasonIcon = (season?: Season) => {
    switch (season) {
      case 'spring':
        return <Flower2 className="w-4 h-4 text-pink-500" title="Printemps" />;
      case 'summer':
        return <Sun className="w-4 h-4 text-orange-500" title="Ete" />;
      case 'autumn':
        return <Leaf className="w-4 h-4 text-amber-600" title="Automne" />;
      case 'winter':
        return <Snowflake className="w-4 h-4 text-blue-500" title="Hiver" />;
      case 'all-seasons':
        return <CloudSun className="w-4 h-4 text-slate-600" title="Toutes saisons" />;
      default:
        return <CloudSun className="w-4 h-4 text-slate-400" title="Non defini" />;
    }
  };

  const handleDuplicate = async (item: AdminItem) => {
    try {
      if (item.type === 'article') {
        const { data: article } = await supabase
          .from('articles')
          .select('*')
          .eq('id', item.id)
          .single();

        if (!article) throw new Error('Article not found');

        const { id, created_at, updated_at, reference_number, ...rest } = article;

        const { error } = await supabase
          .from('articles')
          .insert([
            {
              ...rest,
              status: 'draft',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (error) throw error;
      }

      setToast({
        type: 'success',
        text: `${item.type === 'article' ? 'Article' : 'Lot'} duplique avec succes`,
      });
      setDrawerOpen(false);
      fetchAllData();
    } catch (error) {
      console.error('Error duplicating:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la duplication',
      });
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.item || !user) return;

    try {
      const item = deleteModal.item;

      if (item.type === 'article') {
        const { data: article, error: fetchError } = await supabase
          .from('articles')
          .select('photos')
          .eq('id', item.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (article?.photos && article.photos.length > 0) {
          const filePaths = article.photos
            .map((photoUrl: string) => {
              const urlParts = photoUrl.split('/article-photos/');
              return urlParts.length === 2 ? urlParts[1] : null;
            })
            .filter((path: string | null): path is string => path !== null);

          if (filePaths.length > 0) {
            await supabase.storage.from('article-photos').remove(filePaths);
          }
        }

        const { error } = await supabase
          .from('articles')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lots')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      }

      setToast({
        type: 'success',
        text: `${item.type === 'article' ? 'Article' : 'Lot'} supprime avec succes`,
      });
      setDeleteModal({ isOpen: false, item: null });
      setDrawerOpen(false);
      fetchAllData();
    } catch (error) {
      console.error('Error deleting:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la suppression',
      });
    }
  };

  const handleEdit = (item: AdminItem) => {
    if (item.status === 'sold') {
      setSoldModal({ isOpen: true, item });
    } else if (item.type === 'article') {
      navigate(`/articles/${item.id}/edit-v2`);
    } else {
      navigate(`/lots?edit=${item.id}`);
    }
  };

  const handleView = (item: AdminItem) => {
    if (item.type === 'article') {
      navigate(`/articles/${item.id}/preview`);
    } else {
      navigate(`/lots/${item.id}/preview`);
    }
  };

  const handlePublish = (item: AdminItem) => {
    if (item.type === 'article') {
      navigate(`/articles/${item.id}/structure`);
    } else {
      navigate(`/lots/${item.id}/structure`);
    }
  };

  const openItemDrawer = (item: AdminItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const stats = {
    total: items.length,
    articles: items.filter(i => i.type === 'article').length,
    lots: items.filter(i => i.type === 'lot').length,
    draft: items.filter(i => i.status === 'draft').length,
    ready: items.filter(i => i.status === 'ready').length,
    scheduled: items.filter(i => i.status === 'scheduled').length,
    published: items.filter(i => i.status === 'published').length,
    sold: items.filter(i => i.status === 'sold').length,
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Chargement des donnees...</p>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Modal
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Administration</h1>
              <p className="text-slate-500 mt-1">Gerez vos articles et lots en un seul endroit</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/articles/new-v2')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm shadow-lg shadow-slate-900/20"
              >
                <Plus className="w-4 h-4" />
                Nouvel article
              </button>
              <button
                onClick={() => navigate('/lots')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm"
              >
                <Layers className="w-4 h-4" />
                Nouveau lot
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <AdminStatsCard
              label="Total"
              value={stats.total}
              icon={Package}
              color="slate"
            />
            <AdminStatsCard
              label="Articles"
              value={stats.articles}
              icon={ShoppingBag}
              color="blue"
              onClick={() => setTypeFilter(typeFilter === 'article' ? 'all' : 'article')}
              isActive={typeFilter === 'article'}
            />
            <AdminStatsCard
              label="Lots"
              value={stats.lots}
              icon={Layers}
              color="violet"
              onClick={() => setTypeFilter(typeFilter === 'lot' ? 'all' : 'lot')}
              isActive={typeFilter === 'lot'}
            />
            <AdminStatsCard
              label="Prets"
              value={stats.ready}
              icon={CheckCircle2}
              color="blue"
              onClick={() => setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready')}
              isActive={statusFilter === 'ready'}
            />
            <AdminStatsCard
              label="Vendus"
              value={stats.sold}
              icon={TrendingUp}
              color="emerald"
              onClick={() => setStatusFilter(statusFilter === 'sold' ? 'all' : 'sold')}
              isActive={statusFilter === 'sold'}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <AdminFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            sellerFilter={sellerFilter}
            onSellerFilterChange={setSellerFilter}
            familyMembers={familyMembers}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{filteredItems.length}</span> element{filteredItems.length !== 1 ? 's' : ''} trouve{filteredItems.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Content */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucun element trouve</h3>
            <p className="text-slate-500 mb-6">Essayez de modifier vos filtres ou creez un nouvel article</p>
            <button
              onClick={() => navigate('/articles/new-v2')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" />
              Creer un article
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <AdminItemCard
                key={`${item.type}-${item.id}`}
                item={item}
                onView={() => handleView(item)}
                onEdit={() => handleEdit(item)}
                onPublish={() => handlePublish(item)}
                onStatusClick={() => setStatusModal({ isOpen: true, item })}
                onMenuClick={() => openItemDrawer(item)}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Article / Lot</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Details</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Vendeur</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Saison</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="group hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => openItemDrawer(item)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold ${
                          item.type === 'lot'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.type === 'lot' ? 'LOT' : 'ARTICLE'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {item.photos && item.photos.length > 0 ? (
                              <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="font-medium text-slate-900 truncate group-hover:text-slate-700">{item.title}</p>
                          <p className="text-xs text-slate-500 truncate">{item.brand || 'Sans marque'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-slate-900">{item.price.toFixed(0)}€</span>
                            <span className="text-[10px] text-slate-400">{getDateLabel(item)} {formatDate(getItemDate(item))}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusModal({ isOpen: true, item });
                          }}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium ${STATUS_COLORS[item.status]} hover:scale-105 transition-transform`}
                        >
                          {renderStatusIcon(item.status)}
                          {STATUS_LABELS[item.status]}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {item.seller_name ? (
                          <span className="text-xs font-medium text-slate-700">{item.seller_name}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.type === 'article' ? (
                          <div className="flex items-center justify-center">
                            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                              {renderSeasonIcon(item.season)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {(item.status === 'ready' || item.status === 'scheduled') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePublish(item);
                              }}
                              className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              title="Envoyer a Vinted"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            title="Modifier"
                          >
                            <ClipboardEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openItemDrawer(item);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            title="Plus d'actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      <AdminDetailDrawer
        item={selectedItem}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedItem(null);
        }}
        onView={() => selectedItem && handleView(selectedItem)}
        onEdit={() => selectedItem && handleEdit(selectedItem)}
        onPublish={() => selectedItem && handlePublish(selectedItem)}
        onDuplicate={() => selectedItem && handleDuplicate(selectedItem)}
        onSchedule={() => {
          if (selectedItem) {
            setScheduleModal({ isOpen: true, item: selectedItem });
            setDrawerOpen(false);
          }
        }}
        onMarkSold={() => {
          if (selectedItem) {
            setSoldModal({ isOpen: true, item: selectedItem });
            setDrawerOpen(false);
          }
        }}
        onDelete={() => {
          if (selectedItem) {
            setDeleteModal({ isOpen: true, item: selectedItem });
            setDrawerOpen(false);
          }
        }}
        onStatusChange={() => {
          if (selectedItem) {
            setStatusModal({ isOpen: true, item: selectedItem });
          }
        }}
        formatDate={formatDate}
      />

      {/* Modals */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={handleDelete}
        title={`Supprimer ${deleteModal.item?.type === 'lot' ? 'le lot' : "l'article"}`}
        message={`Etes-vous sur de vouloir supprimer cet ${deleteModal.item?.type === 'lot' ? 'lot' : 'article'} ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        variant="danger"
      />

      {soldModal.item && (
        soldModal.item.type === 'lot' ? (
          <LotSoldModal
            isOpen={soldModal.isOpen}
            onClose={() => setSoldModal({ isOpen: false, item: null })}
            onConfirm={async (saleData) => {
              try {
                const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

                const updateData: any = {
                  status: 'sold',
                  price: saleData.soldPrice,
                  sold_at: saleData.soldAt,
                  shipping_cost: saleData.shippingCost,
                  fees: saleData.fees,
                  net_profit: netProfit,
                  buyer_name: saleData.buyerName || null,
                  sale_notes: saleData.notes || null,
                  updated_at: new Date().toISOString(),
                };

                if (saleData.sellerId) {
                  updateData.seller_id = saleData.sellerId;
                }

                const { error } = await supabase
                  .from('lots')
                  .update(updateData)
                  .eq('id', soldModal.item!.id);

                if (error) throw error;

                setToast({ type: 'success', text: 'Lot marque comme vendu' });
                setSoldModal({ isOpen: false, item: null });
                fetchAllData();
              } catch (error) {
                console.error('Error marking lot as sold:', error);
                setToast({ type: 'error', text: 'Erreur lors de la mise a jour' });
              }
            }}
            lot={{ id: soldModal.item.id, name: soldModal.item.title, price: soldModal.item.price, seller_id: soldModal.item.seller_id } as any}
          />
        ) : (
          <ArticleSoldModal
            isOpen={soldModal.isOpen}
            onClose={() => setSoldModal({ isOpen: false, item: null })}
            onConfirm={async (saleData) => {
              try {
                const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

                const updateData: any = {
                  status: 'sold',
                  sold_price: saleData.soldPrice,
                  sold_at: saleData.soldAt,
                  platform: saleData.platform,
                  fees: saleData.fees,
                  shipping_cost: saleData.shippingCost,
                  buyer_name: saleData.buyerName,
                  sale_notes: saleData.notes,
                  net_profit: netProfit,
                  updated_at: new Date().toISOString(),
                };

                if (saleData.sellerId) {
                  updateData.seller_id = saleData.sellerId;
                }

                const { error } = await supabase
                  .from('articles')
                  .update(updateData)
                  .eq('id', soldModal.item!.id);

                if (error) throw error;

                setToast({ type: 'success', text: 'Article marque comme vendu' });
                setSoldModal({ isOpen: false, item: null });
                fetchAllData();
              } catch (error) {
                console.error('Error marking article as sold:', error);
                setToast({ type: 'error', text: 'Erreur lors de la mise a jour' });
              }
            }}
            article={{
              id: soldModal.item.id,
              title: soldModal.item.title,
              brand: soldModal.item.brand,
              price: soldModal.item.price,
              photos: soldModal.item.photos,
              seller_id: soldModal.item.seller_id,
            } as any}
          />
        )
      )}

      {statusModal.item && (
        <Modal
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ isOpen: false, item: null })}
          title="Changer le statut"
        >
          <div className="space-y-2">
            {(['draft', 'ready', 'scheduled', 'published', 'sold'] as ArticleStatus[]).map((status) => (
              <button
                key={status}
                onClick={async () => {
                  try {
                    if (status === 'sold') {
                      setStatusModal({ isOpen: false, item: null });
                      setSoldModal({ isOpen: true, item: statusModal.item });
                      return;
                    }

                    const updateData: any = { status };

                    if (status === 'published' && !statusModal.item?.published_at) {
                      updateData.published_at = new Date().toISOString();
                    }

                    const table = statusModal.item!.type === 'article' ? 'articles' : 'lots';
                    const { error } = await supabase
                      .from(table)
                      .update(updateData)
                      .eq('id', statusModal.item!.id);

                    if (error) throw error;

                    setToast({
                      type: 'success',
                      text: `Statut change en "${STATUS_LABELS[status]}"`,
                    });
                    fetchAllData();
                    setStatusModal({ isOpen: false, item: null });
                  } catch (error) {
                    console.error('Error updating status:', error);
                    setToast({
                      type: 'error',
                      text: 'Erreur lors du changement de statut',
                    });
                  }
                }}
                disabled={statusModal.item?.status === status}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                  statusModal.item?.status === status
                    ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[status]}`}>
                  {renderStatusIcon(status)}
                  {STATUS_LABELS[status]}
                </span>
                {statusModal.item?.status === status && (
                  <span className="ml-auto text-xs text-slate-500">(Actuel)</span>
                )}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {scheduleModal.item && (
        <ScheduleModal
          isOpen={scheduleModal.isOpen}
          onClose={() => setScheduleModal({ isOpen: false, item: null })}
          article={scheduleModal.item.type === 'article' ? { id: scheduleModal.item.id, title: scheduleModal.item.title } as any : undefined}
          lot={scheduleModal.item.type === 'lot' ? { id: scheduleModal.item.id, name: scheduleModal.item.title } : undefined}
          onScheduled={() => {
            setToast({ type: 'success', text: `${scheduleModal.item?.type === 'lot' ? 'Lot' : 'Article'} programme avec succes` });
            setScheduleModal({ isOpen: false, item: null });
            fetchAllData();
          }}
        />
      )}
    </>
  );
}
