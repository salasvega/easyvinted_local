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
  FileText,
  CheckCircle2,
  Clock,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';

import { LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { LabelModal } from '../components/LabelModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';

const STATUS_LABELS: Record<LotStatus, string> = {
  draft: 'Brouillon',
  ready: 'Pret',
  scheduled: 'Planifie',
  published: 'Publie',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<LotStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  ready: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  scheduled: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  published: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  sold: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const renderStatusIcon = (status: LotStatus) => {
  const iconClass = 'w-4 h-4';
  switch (status) {
    case 'draft': return <FileText className={iconClass} />;
    case 'ready': return <CheckCircle2 className={iconClass} />;
    case 'scheduled': return <Clock className={iconClass} />;
    case 'published': return <Send className={iconClass} />;
    case 'sold': return <DollarSign className={iconClass} />;
    default: return null;
  }
};

export default function LotPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lot, setLot] = useState<any | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [sellerName, setSellerName] = useState<string | null>(null);

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
        .select(`
          *,
          family_members!lots_seller_id_fkey(name)
        `)
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

      if (lotData.family_members) {
        setSellerName(lotData.family_members.name);
      }

      setCurrentPhotoIndex(0);
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

      setToast({ type: 'success', text: 'Lot supprime avec succes' });
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

      setToast({ type: 'success', text: 'Lot programme avec succes' });
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
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
    sellerId?: string | null;
  }) => {
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
      };

      if (saleData.sellerId) {
        updateData.seller_id = saleData.sellerId;
      }

      const { error } = await supabase
        .from('lots')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      const articleIds = articles.map((a) => a.id);
      const pricePerArticle = saleData.soldPrice / articleIds.length;
      const feesPerArticle = saleData.fees / articleIds.length;
      const shippingPerArticle = saleData.shippingCost / articleIds.length;

      const articleUpdateData: any = {
        status: 'sold',
        sold_at: saleData.soldAt,
        sold_price: pricePerArticle,
        fees: feesPerArticle,
        shipping_cost: shippingPerArticle,
        buyer_name: saleData.buyerName,
        sale_notes: saleData.notes,
      };

      if (saleData.sellerId) {
        articleUpdateData.seller_id = saleData.sellerId;
      }

      const { error: articlesError } = await supabase
        .from('articles')
        .update(articleUpdateData)
        .in('id', articleIds);

      if (articlesError) throw articlesError;

      setToast({ type: 'success', text: 'Lot marque comme vendu' });
      setSoldModalOpen(false);
      fetchLot();
    } catch (error) {
      console.error('Error marking lot as sold:', error);
      setToast({ type: 'error', text: 'Erreur lors de la mise a jour' });
    }
  };

  const getStatusMessage = () => {
    if (!lot) return '';
    switch (lot.status) {
      case 'draft':
        return "Ce lot est en cours de preparation. Completez les champs obligatoires avant de l'envoyer.";
      case 'ready':
        return 'Tous les champs requis sont remplis. Vous pouvez maintenant envoyer ce lot sur Vinted.';
      case 'published':
        return 'Ce lot est actuellement en ligne sur Vinted.';
      case 'sold':
        return 'Ce lot a ete vendu avec succes.';
      case 'scheduled':
        return 'Ce lot est planifie pour une publication ulterieure sur Vinted.';
      default:
        return '';
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
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Lot non trouve</h2>
          <p className="text-sm text-slate-500">
            Impossible de charger ce lot. Il a peut-etre ete supprime.
          </p>
        </div>
      </div>
    );
  }

  const allPhotos = articles.flatMap((a) => a.photos || []).filter(Boolean) as string[];
  const statusColors = STATUS_COLORS[lot.status as LotStatus];

  const handleNextPhoto = () => {
    if (!allPhotos.length) return;
    setCurrentPhotoIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const handlePreviousPhoto = () => {
    if (!allPhotos.length) return;
    setCurrentPhotoIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le lot"
        message="Etes-vous sur de vouloir supprimer ce lot ? Les articles qu'il contient ne seront pas supprimes. Cette action est irreversible."
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
            reference_number: lot.reference_number || 'Non definie',
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
            <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden aspect-square relative">
              {allPhotos.length > 0 ? (
                <>
                  <img
                    src={allPhotos[currentPhotoIndex]}
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
              <div className="flex gap-2 overflow-x-auto p-3 bg-white rounded-2xl border border-slate-200">
                {allPhotos.map((photo, index) => (
                  <div
                    key={index}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                      currentPhotoIndex === index
                        ? 'border-blue-500 ring-2 ring-blue-100'
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
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-[10px] font-bold uppercase rounded-lg bg-violet-100 text-violet-700">
                    Lot
                  </span>
                  <h2 className="font-semibold text-slate-900">Details</h2>
                </div>
                <button
                  onClick={() => navigate('/lots')}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* 1. Title + Reference */}
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{lot.name}</h3>
                {lot.reference_number && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 font-mono">Ref. #{lot.reference_number}</span>
                  </div>
                )}
              </div>

              {/* 2. Description */}
              {lot.description && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Description</h4>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {lot.description}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. Articles List */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">
                  Articles inclus dans ce lot
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => navigate(`/articles/${article.id}/preview`)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors text-left"
                    >
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                        {article.photos?.[0] ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {article.brand || 'Sans marque'}
                          {article.size && ` - ${article.size}`}
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

              {/* 4. Articles Statistics */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                      Articles inclus
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-slate-900">{articles.length}</span>
                </div>
              </div>

              {/* 5. Prix et Remise */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">Prix du lot</p>
                  <p className="text-lg font-bold text-emerald-600">{lot.price.toFixed(2)} €</p>
                </div>
                {lot.discount_percentage !== undefined && lot.discount_percentage > 0 && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Remise</p>
                    <div className="flex items-center gap-1.5">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                      <p className="text-lg font-bold text-slate-900">{lot.discount_percentage}%</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Seller + Original Total */}
              <div className="grid grid-cols-2 gap-3">
                {sellerName && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Vendeur</p>
                    <p className="text-sm font-medium text-slate-900">{sellerName}</p>
                  </div>
                )}
                {lot.original_total_price && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Valeur totale</p>
                    <p className="text-sm font-medium text-slate-900">{lot.original_total_price.toFixed(2)} €</p>
                  </div>
                )}
              </div>

              {/* 7. Sale Details (if sold) */}
              {lot.status === 'sold' && (lot.fees !== undefined || lot.shipping_cost !== undefined || lot.buyer_name) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h4 className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-3">Details de la vente</h4>
                  <div className="space-y-2">
                    {lot.buyer_name && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-emerald-700">Acheteur</span>
                        <span className="text-sm font-medium text-emerald-900">{lot.buyer_name}</span>
                      </div>
                    )}
                    {lot.fees !== undefined && (
                      <div className="flex items-center justify-between py-1.5 border-t border-emerald-200">
                        <span className="text-sm text-emerald-700">Frais</span>
                        <span className="text-sm font-medium text-emerald-900">{lot.fees.toFixed(2)} €</span>
                      </div>
                    )}
                    {lot.shipping_cost !== undefined && (
                      <div className="flex items-center justify-between py-1.5 border-t border-emerald-200">
                        <span className="text-sm text-emerald-700">Frais de port</span>
                        <span className="text-sm font-medium text-emerald-900">{lot.shipping_cost.toFixed(2)} €</span>
                      </div>
                    )}
                    {lot.net_profit !== undefined && (
                      <div className="flex items-center justify-between py-1.5 border-t border-emerald-200">
                        <span className="text-sm text-emerald-700 font-semibold">Profit net</span>
                        <span className={`text-sm font-bold ${lot.net_profit >= 0 ? 'text-emerald-900' : 'text-rose-600'}`}>
                          {lot.net_profit >= 0 ? '+' : ''}{lot.net_profit.toFixed(2)} €
                        </span>
                      </div>
                    )}
                    {lot.sale_notes && (
                      <div className="pt-2 border-t border-emerald-200">
                        <p className="text-xs text-emerald-700 mb-1 font-semibold">Notes</p>
                        <p className="text-sm text-emerald-900">{lot.sale_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 8. Vinted URL */}
              {lot.vinted_url && (
                <a
                  href={lot.vinted_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl hover:from-teal-100 hover:to-cyan-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-teal-900">Voir sur Vinted</p>
                      <p className="text-xs text-teal-600">Ouvrir l&apos;annonce</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-teal-500 group-hover:translate-x-1 transition-transform" />
                </a>
              )}

              {/* 9. Status Section */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="mb-2">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${statusColors.bg} ${statusColors.text} ${statusColors.border} text-sm font-semibold`}
                  >
                    {renderStatusIcon(lot.status)}
                    <span>{STATUS_LABELS[lot.status as LotStatus]}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{getStatusMessage()}</p>
              </div>

              {/* 10. Package Label */}
              {lot.reference_number && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Etiquette de colis
                    </h3>
                    <button
                      onClick={() => setLabelModalOpen(true)}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Generer l&apos;etiquette
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

            {lot.status !== 'sold' && lot.status !== 'published' && (
              <button
                onClick={() => navigate(`/lots?edit=${id}`)}
                className="px-6 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
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
                    setToast({ type: 'success', text: 'Lot marque comme pret' });
                    fetchLot();
                  } catch (error) {
                    console.error('Error:', error);
                    setToast({ type: 'error', text: 'Erreur lors de la mise a jour' });
                  }
                }}
                className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Pret pour Vinted
              </button>
            )}

            {lot.status === 'ready' && (
              <button
                onClick={() => navigate(`/lots/${id}/structure`)}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Envoyer a Vinted
              </button>
            )}

            {(lot.status === 'published' || lot.status === 'scheduled') && (
              <>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="px-6 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Programmer
                </button>
                <button
                  onClick={() => setSoldModalOpen(true)}
                  className="px-6 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2"
                >
                  <DollarSign className="w-4 h-4" />
                  Marquer vendu
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
