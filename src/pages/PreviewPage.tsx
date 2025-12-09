import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Edit,
  Send,
  Package,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Calendar,
  DollarSign,
  Trash2,
  X,
  Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article } from '../types/article';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PublishInstructionsModal } from '../components/PublishInstructionsModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { LabelModal } from '../components/LabelModal';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

export function PreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [publishInstructionsModal, setPublishInstructionsModal] = useState<{
    isOpen: boolean;
    articleId: string;
  }>({ isOpen: false, articleId: '' });

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [saleDetailModalOpen, setSaleDetailModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  async function fetchArticle() {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select(
          `
          *,
          family_members!articles_seller_id_fkey(name)
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setArticle({
          ...data,
          price: parseFloat(data.price),
        });

        if (data.family_members) {
          setSellerName(data.family_members.name);
        }
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors du chargement de l'article",
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateAndSend() {
    if (!id) return;

    try {
      setPublishing(true);
      setPublishInstructionsModal({
        isOpen: true,
        articleId: id,
      });
    } catch (error) {
      console.error('Error preparing article:', error);
      setToast({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : "Erreur lors de la préparation de l'article",
      });
    } finally {
      setPublishing(false);
    }
  }

  async function handleMarkAsReady() {
    if (!id) return;

    try {
      setMarkingReady(true);

      const { error } = await supabase
        .from('articles')
        .update({ status: 'ready' })
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme prêt pour Vinted',
      });

      await fetchArticle();
    } catch (error) {
      console.error('Error marking article as ready:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut',
      });
    } finally {
      setMarkingReady(false);
    }
  }

  function handleOpenSoldModal() {
    setSoldModalOpen(true);
  }

  async function handleDelete() {
    if (!id || !article || !user) return;

    try {
      if (article.photos && article.photos.length > 0) {
        const filePaths = article.photos
          .map((photoUrl: string) => {
            const urlParts = photoUrl.split('/article-photos/');
            return urlParts.length === 2 ? urlParts[1] : null;
          })
          .filter((path: string | null): path is string => path !== null);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('article-photos')
            .remove(filePaths);

          if (storageError) {
            console.error('Error deleting photos from storage:', storageError);
          }
        }
      }

      try {
        const folderPath = `${user.id}/${id}`;
        const { data: folderContents } = await supabase.storage
          .from('article-photos')
          .list(folderPath);

        if (folderContents && folderContents.length > 0) {
          const filesToDelete = folderContents.map(
            (file) => `${folderPath}/${file.name}`
          );
          await supabase.storage.from('article-photos').remove(filesToDelete);
        }
      } catch (folderError) {
        console.log('No folder to clean up or error cleaning folder:', folderError);
      }

      const { error } = await supabase.from('articles').delete().eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article supprimé avec succès',
      });

      setDeleteModalOpen(false);
      setTimeout(() => {
        navigate('/stock');
      }, 1000);
    } catch (error) {
      console.error('Error deleting article:', error);
      setToast({
        type: 'error',
        text: "Erreur lors de la suppression de l'article",
      });
    }
  }

  async function handleMarkAsSold(saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
    sellerId?: string;
  }) {
    if (!id || !article) return;

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
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme vendu',
      });

      setSoldModalOpen(false);
      await fetchArticle();
    } catch (error) {
      console.error('Error marking article as sold:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut',
      });
    }
  }

  const CONDITION_LABELS: Record<string, string> = {
    new_with_tags: 'Neuf avec étiquette',
    new_without_tags: 'Neuf sans étiquette',
    very_good: 'Très bon état',
    good: 'Bon état',
    satisfactory: 'Satisfaisant',
  };

  const handlePreviousPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? article.photos.length - 1 : prev - 1
    );
  };

  const handleNextPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) =>
      prev === article.photos.length - 1 ? 0 : prev + 1
    );
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Article non trouvé</h2>
          <p className="text-sm text-slate-500">
            Impossible de charger cette annonce. Elle a peut-être été supprimée.
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (article.status) {
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
            En cours
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />

      <PublishInstructionsModal
        isOpen={publishInstructionsModal.isOpen}
        onClose={() => setPublishInstructionsModal({ isOpen: false, articleId: '' })}
        articleId={publishInstructionsModal.articleId}
      />

      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        article={article}
        onScheduled={() => {
          setToast({
            type: 'success',
            text: 'Article programmé avec succès',
          });
          fetchArticle();
        }}
      />

      <ArticleSoldModal
        isOpen={soldModalOpen}
        onClose={() => setSoldModalOpen(false)}
        onConfirm={handleMarkAsSold}
        article={article}
      />

      {saleDetailModalOpen && article.status === 'sold' && (
        <SaleDetailModal
          sale={{
            id: article.id,
            title: article.title,
            brand: article.brand || '',
            price: article.price || 0,
            sold_price: article.sold_price || article.price || 0,
            sold_at: article.sold_at || new Date().toISOString(),
            platform: article.platform || 'Vinted',
            shipping_cost: article.shipping_cost || 0,
            fees: article.fees || 0,
            net_profit: article.net_profit || 0,
            photos: article.photos || [],
            buyer_name: article.buyer_name,
            sale_notes: article.sale_notes,
            seller_name: sellerName || undefined,
          }}
          onClose={() => setSaleDetailModalOpen(false)}
        />
      )}

      {article.reference_number && (
        <LabelModal
          isOpen={labelModalOpen}
          onClose={() => setLabelModalOpen(false)}
          article={{
            reference_number: article.reference_number,
            title: article.title,
            brand: article.brand,
            size: article.size,
            color: article.color,
            price: article.price,
          }}
          sellerName={sellerName || undefined}
        />
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'article"
        message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Photos */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden aspect-[3/4] relative">
              {article.photos && article.photos.length > 0 ? (
                <>
                  <img
                    src={article.photos[currentPhotoIndex]}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                  {article.photos.length > 1 && (
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
                        {currentPhotoIndex + 1} / {article.photos.length}
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
            {article.photos && article.photos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {article.photos.map((photo, index) => (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                      currentPhotoIndex === index
                        ? 'border-emerald-600 ring-2 ring-emerald-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setCurrentPhotoIndex(index)}
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
                <h1 className="text-2xl font-bold text-slate-900">Prévisualisation</h1>
                <button
                  onClick={() => navigate('/dashboard-v2')}
                  className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500">Visualisez votre annonce avant publication</p>
            </div>

            <div className="space-y-6">
              {/* 1. Status Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <Package className="w-10 h-10 text-slate-900 bg-white rounded-full p-2 border border-slate-200" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        Statut :  {getStatusBadge()}
                      </h2>
                      {getStatusBadge()}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {article.status === 'draft' &&
                    "Cette annonce est en cours de préparation. Complétez les champs obligatoires avant de l'envoyer sur Vinted."}
                  {article.status === 'ready' &&
                    'Tous les champs requis sont remplis. Vous pouvez maintenant envoyer cette annonce sur Vinted.'}
                  {article.status === 'published' &&
                    'Cette annonce est actuellement en ligne sur Vinted.'}
                  {article.status === 'sold' && 'Cet article a été vendu avec succès.'}
                  {article.status === 'scheduled' &&
                    'Cette annonce est planifiée pour une publication ultérieure sur Vinted.'}
                </p>
              </div>

              {/* 2. Seller */}
              {sellerName && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Vendeur
                  </label>
                  <div className="text-sm font-medium text-slate-900">{sellerName}</div>
                </div>
              )}

              {/* 3. Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Titre
                </label>
                <div className="text-xl font-semibold text-slate-900 py-2">
                  {article.title}
                </div>
              </div>

              {/* 4. Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Description
                </label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {article.description || 'Aucune description fournie.'}
                  </p>
                </div>
              </div>

              {/* 5. Marque */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Marque
                </label>
                <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-sm font-medium text-slate-900">
                    {article.brand || 'Non spécifiée'}
                  </span>
                </div>
              </div>

              {/* 6. Prix */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Prix (€)
                </label>
                <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-sm font-bold text-emerald-600">
                    {article.price.toFixed(2)} €
                  </span>
                </div>
              </div>

              {/* 7. Season & Suggested Period */}
              {(article.season || article.suggested_period) && (
                <div className="grid grid-cols-2 gap-4">
                  {article.season && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Season
                      </label>
                      <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-sm font-medium text-slate-900">
                          {article.season === 'all_seasons' ? 'All seasons' : article.season}
                        </span>
                      </div>
                    </div>
                  )}
                  {article.suggested_period && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Période conseillée
                      </label>
                      <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="text-sm font-medium text-slate-900">
                          {article.suggested_period}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 8. Package Label */}
              {article.reference_number && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Étiquette de colis
                      </h3>
                      <p className="text-xs text-slate-500">
                        Référence : <span className="font-mono font-semibold">{article.reference_number}</span>
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
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-6 py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-medium hover:bg-rose-100 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>

            <button
              onClick={() => navigate(`/articles/${id}/edit-v2`)}
              className="px-6 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Modifier
            </button>

            {article.status === 'draft' && (
              <button
                onClick={handleMarkAsReady}
                disabled={markingReady}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {markingReady ? 'Enregistrement…' : 'Prêt pour Vinted'}
              </button>
            )}

            {article.status === 'ready' && (
              <button
                onClick={() => navigate(`/articles/${article.id}/structure`)}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Envoyer à Vinted
              </button>
            )}

            {(article.status === 'published' || article.status === 'scheduled') && (
              <>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="px-6 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Programmer
                </button>
                <button
                  onClick={handleOpenSoldModal}
                  className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Marquer vendu
                </button>
              </>
            )}

            {article.status === 'sold' && (
              <button
                onClick={() => setSaleDetailModalOpen(true)}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Voir la vente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
