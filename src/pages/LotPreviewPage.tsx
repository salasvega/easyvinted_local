import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Package,
  Calendar,
  Tag,
  TrendingDown,
  ChevronRight,
  Trash2,
  Edit,
  DollarSign,
  Send,
  X,
  Layers,
} from 'lucide-react';

import { Lot, LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { LabelModal } from '../components/LabelModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';

const STATUS_LABELS: Record<LotStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

export default function LotPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lot, setLot] = useState<any | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLot();
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('dressing_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchLot = async () => {
    setLoading(true);
    try {
      const { data: lotData, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', id)
        .single();

      if (lotError) throw lotError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('lot_items')
        .select(
          `
          articles (
            id,
            title,
            brand,
            price,
            photos,
            size,
            description
          )
        `
        )
        .eq('lot_id', id);

      if (itemsError) throw itemsError;

      const articlesList = itemsData.map((item: any) => item.articles).filter(Boolean);

      setLot(lotData);
      setArticles(articlesList as Article[]);
      setSelectedPhoto(
        lotData.cover_photo ||
          lotData.photos?.[0] ||
          articlesList[0]?.photos?.[0] ||
          ''
      );
    } catch (error) {
      console.error('Error fetching lot:', error);
      setToast({ type: 'error', text: 'Erreur lors du chargement du lot' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('lots').delete().eq('id', id);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot supprimé avec succès' });
      setDeleteModalOpen(false);
      setTimeout(() => navigate('/lots'), 1200);
    } catch (error) {
      console.error('Error deleting lot:', error);
      setToast({ type: 'error', text: 'Erreur lors de la suppression du lot' });
    }
  };

  const handleSchedule = async (date: Date) => {
    try {
      const { error } = await supabase
        .from('lots')
        .update({
          scheduled_for: date.toISOString(),
          status: 'scheduled',
        })
        .eq('id', id);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot programmé avec succès' });
      setScheduleModalOpen(false);
      fetchLot();
    } catch (error) {
      console.error('Error scheduling lot:', error);
      setToast({ type: 'error', text: 'Erreur lors de la programmation' });
    }
  };

  const handleMarkAsSold = async (saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
  }) => {
    try {
      const { error } = await supabase
        .from('lots')
        .update({
          status: 'sold',
          published_at: saleData.soldAt,
        })
        .eq('id', id);

      if (error) throw error;

      const articleIds = articles.map((a) => a.id);
      const pricePerArticle = saleData.soldPrice / articleIds.length;
      const feesPerArticle = saleData.fees / articleIds.length;
      const shippingPerArticle = saleData.shippingCost / articleIds.length;

      const { error: articlesError } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_at: saleData.soldAt,
          sold_price: pricePerArticle,
          platform: saleData.platform,
          fees: feesPerArticle,
          shipping_cost: shippingPerArticle,
          buyer_name: saleData.buyerName,
          sale_notes: saleData.notes,
        })
        .in('id', articleIds);

      if (articlesError) throw articlesError;

      setToast({ type: 'success', text: 'Lot marqué comme vendu' });
      setSoldModalOpen(false);
      fetchLot();
    } catch (error) {
      console.error('Error marking lot as sold:', error);
      setToast({ type: 'error', text: 'Erreur lors de la mise à jour' });
    }
  };

  const getStatusBadge = () => {
    switch (lot?.status) {
      case 'ready':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Prêt pour Vinted
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Planifié
          </span>
        );
      case 'published':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Publié
          </span>
        );
      case 'sold':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Vendu
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
            Brouillon
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Lot non trouvé</h2>
          <p className="text-sm text-slate-500">
            Impossible de charger ce lot. Il a peut-être été supprimé.
          </p>
        </div>
      </div>
    );
  }

  const allPhotos = articles.flatMap((a) => a.photos || []).filter(Boolean) as string[];
  const currentPhotoIndex = allPhotos.indexOf(selectedPhoto);

  const handleNextPhoto = () => {
    if (!allPhotos.length) return;
    setSelectedPhoto(allPhotos[(currentPhotoIndex + 1) % allPhotos.length]);
  };

  const handlePreviousPhoto = () => {
    if (!allPhotos.length) return;
    setSelectedPhoto(
      allPhotos[(currentPhotoIndex - 1 + allPhotos.length) % allPhotos.length]
    );
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhoto(allPhotos[index]);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le lot"
        message="Êtes-vous sûr de vouloir supprimer ce lot ? Les articles qu'il contient ne seront pas supprimés. Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {scheduleModalOpen && (
        <ScheduleModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          onSchedule={handleSchedule}
          currentDate={lot.scheduled_for ? new Date(lot.scheduled_for) : undefined}
        />
      )}

      {soldModalOpen && (
        <ArticleSoldModal
          isOpen={soldModalOpen}
          onClose={() => setSoldModalOpen(false)}
          onConfirm={handleMarkAsSold}
          article={{
            ...articles[0],
            title: lot.name,
            price: lot.price,
          }}
        />
      )}

      {labelModalOpen && (
        <LabelModal
          isOpen={labelModalOpen}
          onClose={() => setLabelModalOpen(false)}
          article={{
            reference_number: lot.reference_number || 'Non définie',
            title: lot.name,
            brand: '',
            size: '',
            color: '',
            price: lot.price,
          }}
          sellerName={userProfile?.dressing_name}
          lotArticles={articles.map((a) => ({
            title: a.title,
            brand: a.brand,
          }))}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Photos */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden aspect-[3/4] relative">
              {allPhotos.length > 0 ? (
                <>
                  <img
                    src={selectedPhoto}
                    alt={lot.name}
                    className="w-full h-full object-cover"
                  />
                  {allPhotos.length > 1 && (
                    <>
                      <button
                        onClick={handlePreviousPhoto}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-900" />
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-900" />
                      </button>
                      <div className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
                        {currentPhotoIndex + 1} / {allPhotos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                  <Package className="w-16 h-16 text-slate-300 mb-4" />
                  <span className="text-slate-400 font-medium">Aucune photo</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {allPhotos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                      currentPhotoIndex === index
                        ? 'border-emerald-600 ring-2 ring-emerald-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => handlePhotoClick(index)}
                  >
                    <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Details */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-slate-900">Prévisualisation du lot</h1>
                <button
                  onClick={() => navigate('/lots')}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500">Visualisez votre lot avant publication</p>
            </div>

            <div className="space-y-6">
              {/* Status Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <Package className="w-10 h-10 text-slate-900 bg-white rounded-full p-2 border border-slate-200" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        Statut : {STATUS_LABELS[lot.status]}
                      </h2>
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {lot.status === 'draft' &&
                    'Ce lot est en cours de préparation. Complétez les champs obligatoires avant de l\'envoyer sur Vinted.'}
                  {lot.status === 'ready' &&
                    'Tous les champs requis sont remplis. Vous pouvez maintenant envoyer ce lot sur Vinted.'}
                  {lot.status === 'published' && 'Ce lot est actuellement en ligne sur Vinted.'}
                  {lot.status === 'sold' && 'Ce lot a été vendu avec succès.'}
                  {lot.status === 'scheduled' &&
                    'Ce lot est planifié pour une publication ultérieure sur Vinted.'}
                </p>
              </div>

              {/* Reference Number */}
              {lot.reference_number && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Numéro de référence
                  </label>
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-sm font-mono font-medium text-slate-900">
                      {lot.reference_number}
                    </span>
                  </div>
                </div>
              )}

              {/* Nom du lot */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Nom du lot
                </label>
                <div className="text-xl font-semibold text-slate-900 py-2">
                  {lot.name}
                </div>
              </div>

              {/* Description */}
              {lot.description && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Description
                  </label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {lot.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Prix et Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Prix du lot
                  </label>
                  <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-sm font-bold text-emerald-600">
                      {lot.price.toFixed(2)} €
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Remise
                  </label>
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-sm font-semibold text-slate-900">
                      {lot.discount_percentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Articles Statistics */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Articles inclus
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{articles.length}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Valeur totale : <span className="font-semibold text-slate-700">{lot.original_total_price.toFixed(2)} €</span>
                </p>
              </div>

              {/* Package Label */}
              {lot.reference_number && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Étiquette de colis
                      </h3>
                      <p className="text-xs text-slate-500">
                        Référence : <span className="font-mono font-semibold">{lot.reference_number}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setLabelModalOpen(true)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Générer l&apos;étiquette
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="px-4 py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-medium hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>

                {lot.status !== 'sold' && lot.status !== 'published' && (
                  <button
                    onClick={() => navigate(`/lots?edit=${id}`)}
                    className="px-4 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </button>
                )}

                {lot.status === 'draft' && (
                  <button
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('lots')
                          .update({ status: 'ready' })
                          .eq('id', id);
                        if (error) throw error;
                        setToast({ type: 'success', text: 'Lot marqué comme prêt' });
                        fetchLot();
                      } catch (error) {
                        console.error('Error:', error);
                        setToast({ type: 'error', text: 'Erreur lors de la mise à jour' });
                      }
                    }}
                    className="px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Prêt
                  </button>
                )}

                {lot.status === 'ready' && (
                  <button
                    onClick={() => navigate(`/lots/${id}/structure`)}
                    className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Envoyer à Vinted
                  </button>
                )}

                {(lot.status === 'published' || lot.status === 'scheduled') && (
                  <>
                    <button
                      onClick={() => setScheduleModalOpen(true)}
                      className="px-4 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      Programmer
                    </button>
                    <button
                      onClick={() => setSoldModalOpen(true)}
                      className="px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <DollarSign className="w-4 h-4" />
                      Vendu
                    </button>
                  </>
                )}
              </div>

              {/* Articles List */}
              <div className="border-t border-slate-100 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Articles inclus dans ce lot
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => navigate(`/articles/${article.id}/preview`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors text-left"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {article.photos?.[0] ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {article.brand || 'Sans marque'}
                          {article.size && ` • ${article.size}`}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {article.price.toFixed(0)} €
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
