import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Eye, ClipboardEdit, Trash2, MoreVertical, ChevronLeft, ChevronRight, FileText, CheckCircle2, Clock, Send, DollarSign } from 'lucide-react';
import { Lot, LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import LotBuilder from '../components/LotBuilder';
import { useAuth } from '../contexts/AuthContext';
import { LotStatusModal } from '../components/LotStatusModal';
import { LotSoldModal } from '../components/LotSoldModal';

const STATUS_LABELS: Record<LotStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<LotStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ready: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-purple-100 text-purple-700',
  sold: 'bg-green-100 text-green-700',
};

export default function LotsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LotStatus>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string }[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | undefined>(undefined);
  const [comeFromAdmin, setComeFromAdmin] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    lotId: string | null;
  }>({
    isOpen: false,
    lotId: null,
  });
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    lotId: string | null;
    currentStatus: LotStatus | null;
  }>({
    isOpen: false,
    lotId: null,
    currentStatus: null,
  });
  const [soldModal, setSoldModal] = useState<{
    isOpen: boolean;
    lotId: string | null;
    lotName: string;
    lotPrice: number;
    sellerId?: string | null;
  }>({
    isOpen: false,
    lotId: null,
    lotName: '',
    lotPrice: 0,
    sellerId: null,
  });
  const [photoIndexes, setPhotoIndexes] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchLots();
    fetchFamilyMembers();
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit');
    const create = searchParams.get('create');

    if (editId) {
      setEditingLotId(editId);
      setBuilderOpen(true);
      setComeFromAdmin(false);
      searchParams.delete('edit');
      setSearchParams(searchParams);
    } else if (create === 'true') {
      setEditingLotId(undefined);
      setBuilderOpen(true);
      setComeFromAdmin(true);
      searchParams.delete('create');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const fetchFamilyMembers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const fetchLots = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          lot_items (
            article_id,
            articles (
              id,
              title,
              brand,
              price,
              photos,
              size
            )
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'sold')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLots(data || []);
    } catch (error) {
      console.error('Error fetching lots:', error);
      setToast({ type: 'error', text: 'Erreur lors du chargement des lots' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status: LotStatus) => {
    if (!statusModal.lotId) return;

    try {
      const { error } = await supabase
        .from('lots')
        .update({ status })
        .eq('id', statusModal.lotId);

      if (error) throw error;

      setToast({ type: 'success', text: `Statut changé en "${STATUS_LABELS[status]}"` });
      fetchLots();
    } catch (error) {
      console.error('Error updating status:', error);
      setToast({ type: 'error', text: 'Erreur lors du changement de statut' });
    }
  };

  const handleMarkAsSold = async (saleData: {
    soldPrice: number;
    soldAt: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
    sellerId?: string | null;
  }) => {
    if (!soldModal.lotId) return;

    try {
      const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

      const updateData: any = {
        status: 'sold',
        price: saleData.soldPrice,
        published_at: saleData.soldAt,
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
        .eq('id', soldModal.lotId);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot marqué comme vendu' });
      fetchLots();
      setSoldModal({ isOpen: false, lotId: null, lotName: '', lotPrice: 0, sellerId: null });
    } catch (error) {
      console.error('Error marking lot as sold:', error);
      setToast({ type: 'error', text: 'Erreur lors du marquage comme vendu' });
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.lotId) return;

    try {
      const { error } = await supabase
        .from('lots')
        .delete()
        .eq('id', deleteModal.lotId);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot supprimé avec succès' });
      fetchLots();
    } catch (error) {
      console.error('Error deleting lot:', error);
      setToast({ type: 'error', text: 'Erreur lors de la suppression du lot' });
    } finally {
      setDeleteModal({ isOpen: false, lotId: null });
    }
  };

  const filteredLots = lots.filter((lot) => {
    const matchesSearch = lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lot.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    const matchesSeller = sellerFilter === 'all' ? true : lot.seller_id === sellerFilter;

    return matchesSearch && matchesStatus && matchesSeller;
  });

  const getArticleCount = (lot: any) => {
    return lot.lot_items?.length || 0;
  };

  const getAllPhotos = (lot: any): string[] => {
    const photos: string[] = [];

    if (lot.lot_items && lot.lot_items.length > 0) {
      lot.lot_items.forEach((item: any) => {
        if (item.articles?.photos && Array.isArray(item.articles.photos)) {
          photos.push(...item.articles.photos);
        }
      });
    }

    return photos;
  };

  const handlePreviousPhoto = (e: React.MouseEvent, lotId: string, totalPhotos: number) => {
    e.stopPropagation();
    setPhotoIndexes(prev => ({
      ...prev,
      [lotId]: ((prev[lotId] || 0) - 1 + totalPhotos) % totalPhotos
    }));
  };

  const handleNextPhoto = (e: React.MouseEvent, lotId: string, totalPhotos: number) => {
    e.stopPropagation();
    setPhotoIndexes(prev => ({
      ...prev,
      [lotId]: ((prev[lotId] || 0) + 1) % totalPhotos
    }));
  };

  const renderStatusIcon = (status: LotStatus) => {
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

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes lots</h1>
          <p className="text-sm text-gray-600 mt-1">
            Créez des packs d'articles pour des ventes groupées. ({filteredLots.length} {filteredLots.length === 1 ? 'lot' : 'lots'})
          </p>
        </div>

        <Button
          onClick={() => setBuilderOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Créer un lot
        </Button>
      </div>

      <div className="mb-5 space-y-3">
        <div className="relative max-w-2xl w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un lot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm transition-all hover:shadow"
          />
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
            <h3 className="text-xs font-semibold text-gray-900">Statut</h3>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm scale-[1.02]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              Tous
            </button>
            {(['draft', 'ready', 'scheduled', 'published'] as LotStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all ${
                  statusFilter === status
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm scale-[1.02]'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                {renderStatusIcon(status)}
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {familyMembers.length > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 shadow-sm">
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
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      ) : filteredLots.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lot</h3>
          <p className="text-sm text-gray-500 mb-6">Créez votre premier lot pour vendre plusieurs articles ensemble</p>
          <Button onClick={() => setBuilderOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Créer un lot
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLots.map((lot: any) => {
            const photos = getAllPhotos(lot);
            const articleCount = getArticleCount(lot);
            const currentPhotoIndex = photoIndexes[lot.id] || 0;
            const currentPhoto = photos[currentPhotoIndex];

            return (
              <div
                key={lot.id}
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                onClick={() => navigate(`/lots/${lot.id}/preview`)}
              >
                <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden group">
                  {currentPhoto ? (
                    <img
                      src={currentPhoto}
                      alt={lot.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}

                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={(e) => handlePreviousPhoto(e, lot.id, photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleNextPhoto(e, lot.id, photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-medium">{articleCount} articles</span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusModal({ isOpen: true, lotId: lot.id, currentStatus: lot.status });
                      }}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-all hover:shadow-md active:scale-95 ${STATUS_COLORS[lot.status]}`}
                    >
                      {STATUS_LABELS[lot.status]}
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{lot.name}</h3>
                  {lot.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lot.description}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Prix du lot</p>
                      <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                        {lot.price.toFixed(0)}€
                      </p>
                    </div>

                    {lot.discount_percentage > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-gray-500 mb-1">Remise</p>
                        <p className="text-lg font-bold text-emerald-600">
                          -{lot.discount_percentage}%
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Valeur totale: {lot.original_total_price.toFixed(0)}€
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModal({ isOpen: true, lotId: lot.id });
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LotBuilder
        isOpen={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingLotId(undefined);
          if (comeFromAdmin) {
            navigate('/admin');
          }
        }}
        onSuccess={() => {
          fetchLots();
          setToast({ type: 'success', text: editingLotId ? 'Lot modifié avec succès' : 'Lot créé avec succès' });
          setEditingLotId(undefined);
          if (comeFromAdmin) {
            navigate('/admin');
          }
        }}
        existingLotId={editingLotId}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, lotId: null })}
        onConfirm={handleDelete}
        title="Supprimer le lot"
        message="Êtes-vous sûr de vouloir supprimer ce lot ? Les articles ne seront pas supprimés."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {statusModal.currentStatus && (
        <LotStatusModal
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ isOpen: false, lotId: null, currentStatus: null })}
          currentStatus={statusModal.currentStatus}
          onStatusChange={handleStatusChange}
          onOpenSoldModal={() => {
            if (statusModal.lotId) {
              const lot = lots.find(l => l.id === statusModal.lotId);
              if (lot) {
                setSoldModal({
                  isOpen: true,
                  lotId: lot.id,
                  lotName: lot.name,
                  lotPrice: lot.price,
                  sellerId: lot.seller_id || null,
                });
              }
            }
          }}
        />
      )}

      {soldModal.lotId && (
        <LotSoldModal
          isOpen={soldModal.isOpen}
          onClose={() => setSoldModal({ isOpen: false, lotId: null, lotName: '', lotPrice: 0, sellerId: null })}
          onConfirm={handleMarkAsSold}
          lot={{
            id: soldModal.lotId,
            name: soldModal.lotName,
            price: soldModal.lotPrice,
            seller_id: soldModal.sellerId,
          }}
        />
      )}

      {toast && (
        <Toast
          type={toast.type}
          message={toast.text}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
