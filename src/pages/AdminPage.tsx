import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ClipboardEdit, MoreVertical, Search, Copy, Trash2, DollarSign, Calendar, Clock, CheckCircle2, FileText, Send, Flower2, Sun, Leaf, Snowflake, CloudSun, Upload, Package, Filter } from 'lucide-react';
import { Article, ArticleStatus, Season } from '../types/article';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { LotSoldModal } from '../components/LotSoldModal';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<ArticleStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ready: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-purple-100 text-purple-700',
  sold: 'bg-green-100 text-green-700',
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
  'all-seasons': 'Toutes saisons',
  undefined: 'Non défini',
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

export function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'article' | 'lot'>('all');
  const [items, setItems] = useState<AdminItem[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showFilters, setShowFilters] = useState(true);

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
        message: 'Erreur lors du chargement des données',
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
    if (!date) return 'Non défini';
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
      return 'Planifié le';
    }
    return 'Créé le';
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
        return <Sun className="w-4 h-4 text-orange-500" title="Été" />;
      case 'autumn':
        return <Leaf className="w-4 h-4 text-amber-600" title="Automne" />;
      case 'winter':
        return <Snowflake className="w-4 h-4 text-blue-500" title="Hiver" />;
      case 'all-seasons':
        return <CloudSun className="w-4 h-4 text-gray-600" title="Toutes saisons" />;
      default:
        return <CloudSun className="w-4 h-4 text-gray-400" title="Non défini" />;
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
        text: `${item.type === 'article' ? 'Article' : 'Lot'} dupliqué avec succès`,
      });
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
        text: `${item.type === 'article' ? 'Article' : 'Lot'} supprimé avec succès`,
      });
      setDeleteModal({ isOpen: false, item: null });
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

  const stats = {
    total: filteredItems.length,
    articles: filteredItems.filter(i => i.type === 'article').length,
    lots: filteredItems.filter(i => i.type === 'lot').length,
    sold: filteredItems.filter(i => i.status === 'sold').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
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

      <div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Administration (Page AdminPage)</h1>
            <p className="text-sm text-gray-600 mt-1">
              Vue d'ensemble et gestion complète de tous vos articles et lots
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-[10px] text-gray-500 uppercase font-semibold">Total</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-blue-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{stats.articles}</div>
              <div className="text-[10px] text-blue-600 uppercase font-semibold">Articles</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-purple-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{stats.lots}</div>
              <div className="text-[10px] text-purple-600 uppercase font-semibold">Lots</div>
            </div>
            <div className="bg-white rounded-xl border-2 border-emerald-200 p-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-emerald-600">{stats.sold}</div>
              <div className="text-[10px] text-emerald-600 uppercase font-semibold">Vendus</div>
            </div>
          </div>
        </div>

        <div className="mb-5 space-y-3">
          <div className="relative max-w-2xl w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, marque, référence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm transition-all hover:shadow"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </button>
          </div>

          {showFilters && (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 shadow-sm">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
                    <h3 className="text-xs font-semibold text-gray-900">Type</h3>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
                    {[
                      { value: 'all', label: 'Tous' },
                      { value: 'article', label: 'Articles' },
                      { value: 'lot', label: 'Lots' },
                    ].map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setTypeFilter(type.value as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                          typeFilter === type.value
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm scale-[1.02]'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-0.5 h-3 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                    <h3 className="text-xs font-semibold text-gray-900">Statut</h3>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                        statusFilter === 'all'
                          ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      Tous
                    </button>
                    {(['draft', 'ready', 'scheduled', 'published', 'sold'] as ArticleStatus[]).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all ${
                          statusFilter === status
                            ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm scale-[1.02]'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {renderStatusIcon(status)}
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-0.5 h-3 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                    <h3 className="text-xs font-semibold text-gray-900">Vendeur</h3>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
                    <button
                      onClick={() => setSellerFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                        sellerFilter === 'all'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      Tous
                    </button>
                    {familyMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSellerFilter(member.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                          sellerFilter === member.id
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm scale-[1.02]'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setSellerFilter('none')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                        sellerFilter === 'none'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      Non défini
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto overflow-y-visible min-h-[600px]">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-200/50">
                  <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Article / Lot
                  </th>
                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Détails
                  </th>
                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Vendeur
                  </th>
                  <th className="px-4 py-3.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Saison
                  </th>
                  <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="max-w-sm mx-auto">
                        <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">Aucun élément trouvé</p>
                        <p className="text-sm text-gray-500">Essayez de modifier vos filtres de recherche</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr
                      key={`${item.type}-${item.id}`}
                      className="group hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                      onClick={() => handleView(item)}
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          item.type === 'lot'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.type === 'lot' ? 'LOT' : 'ARTICLE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-200/50 group-hover:ring-emerald-300 transition-all">
                            {item.photos && item.photos.length > 0 ? (
                              <img
                                src={item.photos[0]}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-7 h-7 text-gray-300" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors mb-1">
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500 truncate mb-1">
                            {item.brand || 'Sans marque'}
                          </div>
                          {item.reference_number && (
                            <div className="text-[10px] text-gray-400 font-mono">
                              #{item.reference_number}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                              {item.price.toFixed(0)}€
                            </span>
                            <span className={`text-[10px] ${
                              item.status === 'sold' ? 'text-emerald-600 font-medium' :
                              item.status === 'scheduled' ? 'text-blue-600 font-medium' :
                              'text-gray-400'
                            }`}>
                              • {getDateLabel(item)} {formatDate(getItemDate(item))}
                            </span>
                            {item.status === 'sold' && item.net_profit !== undefined && (
                              <span className={`text-xs font-semibold ${
                                item.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                ({item.net_profit >= 0 ? '+' : ''}{item.net_profit.toFixed(0)}€)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusModal({ isOpen: true, item });
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:shadow-lg hover:scale-105 active:scale-95 ${STATUS_COLORS[item.status]}`}
                        >
                          {renderStatusIcon(item.status)}
                          {STATUS_LABELS[item.status]}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        {item.seller_name ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 border border-blue-200/50 rounded-lg text-[11px] font-medium text-blue-700">
                            {item.seller_name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Non défini</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {item.type === 'article' ? (
                          <div className="flex items-center justify-center">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200/50 flex items-center justify-center group-hover:border-emerald-300 transition-all">
                              {renderSeasonIcon(item.season)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap relative">
                        <div className="flex items-center justify-end gap-1">
                          {(item.status === 'ready' || item.status === 'scheduled') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePublish(item);
                              }}
                              className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                              title="Envoyer à Vinted"
                            >
                              <Upload className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(item);
                            }}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                            title="Modifier"
                          >
                            <ClipboardEdit className="w-4 h-4" />
                          </button>
                          <div
                            className="relative"
                            ref={openMenuId === `${item.type}-${item.id}` ? desktopMenuRef : null}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(
                                  openMenuId === `${item.type}-${item.id}` ? null : `${item.type}-${item.id}`
                                );
                              }}
                              className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                              title="Plus d'actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openMenuId === `${item.type}-${item.id}` && (
                              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-200/50 py-2 z-[9999] backdrop-blur-sm">
                                {item.type === 'article' && (
                                  <button
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicate(item);
                                    }}
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span className="font-medium">Dupliquer</span>
                                  </button>
                                )}
                                <div className="h-px bg-gray-200 my-1.5 mx-2"></div>
                                {item.status !== 'sold' && (
                                  <>
                                    <button
                                      className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setScheduleModal({ isOpen: true, item });
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <Calendar className="w-4 h-4" />
                                      <span className="font-medium">Programmer</span>
                                    </button>
                                    <button
                                      className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSoldModal({ isOpen: true, item });
                                        setOpenMenuId(null);
                                      }}
                                    >
                                      <DollarSign className="w-4 h-4" />
                                      <span className="font-medium">Marquer vendu</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteModal({ isOpen: true, item });
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="font-medium">Supprimer</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, item: null })}
          onConfirm={handleDelete}
          title={`Supprimer ${deleteModal.item?.type === 'lot' ? 'le lot' : "l'article"}`}
          message={`Êtes-vous sûr de vouloir supprimer cet ${deleteModal.item?.type === 'lot' ? 'lot' : 'article'} ? Cette action est irréversible.`}
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

                  setToast({ type: 'success', text: 'Lot marqué comme vendu' });
                  setSoldModal({ isOpen: false, item: null });
                  fetchAllData();
                } catch (error) {
                  console.error('Error marking lot as sold:', error);
                  setToast({ type: 'error', text: 'Erreur lors de la mise à jour' });
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

                  setToast({ type: 'success', text: 'Article marqué comme vendu' });
                  setSoldModal({ isOpen: false, item: null });
                  fetchAllData();
                } catch (error) {
                  console.error('Error marking article as sold:', error);
                  setToast({ type: 'error', text: 'Erreur lors de la mise à jour' });
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
                        text: `Statut changé en "${STATUS_LABELS[status]}"`,
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
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${
                    statusModal.item?.status === status
                      ? 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60'
                      : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                    {renderStatusIcon(status)}
                    {STATUS_LABELS[status]}
                  </span>
                  {statusModal.item?.status === status && (
                    <span className="ml-auto text-xs text-gray-500">(Actuel)</span>
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
              setToast({ type: 'success', text: `${scheduleModal.item?.type === 'lot' ? 'Lot' : 'Article'} programmé avec succès` });
              setScheduleModal({ isOpen: false, item: null });
              fetchAllData();
            }}
          />
        )}
      </div>
    </>
  );
}
