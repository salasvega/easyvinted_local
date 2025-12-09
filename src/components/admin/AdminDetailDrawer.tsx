import { X, Package, Eye, ClipboardEdit, Upload, Copy, Calendar, DollarSign, Trash2, FileText, CheckCircle2, Clock, Send, Flower2, Sun, Leaf, Snowflake, CloudSun, ExternalLink, ChevronLeft, ChevronRight, Tag, Layers, TrendingDown, ArrowLeft } from 'lucide-react';
import { ArticleStatus, Season } from '../../types/article';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface LotArticle {
  id: string;
  title: string;
  brand?: string;
  price: number;
  photos: string[];
  size?: string;
}

interface FullArticleDetails {
  id: string;
  title: string;
  brand?: string;
  price: number;
  photos: string[];
  size?: string;
  color?: string;
  material?: string;
  condition?: string;
  description?: string;
  season?: Season;
  main_category?: string;
  subcategory?: string;
  item_category?: string;
  reference_number?: string;
  status?: ArticleStatus;
}

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
  description?: string;
  suggested_period?: string;
  vinted_url?: string;
  fees?: number;
  shipping_cost?: number;
  buyer_name?: string;
  sale_notes?: string;
  size?: string;
  color?: string;
  material?: string;
  condition?: string;
  main_category?: string;
  subcategory?: string;
  item_category?: string;
  original_total_price?: number;
  discount_percentage?: number;
  articles?: LotArticle[];
}

interface AdminDetailDrawerProps {
  item: AdminItem | null;
  isOpen: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onSchedule: () => void;
  onMarkSold: () => void;
  onDelete: () => void;
  onStatusChange: () => void;
  onLabelOpen: () => void;
  formatDate: (date?: string) => string;
}

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Brouillon',
  ready: 'Pret',
  scheduled: 'Planifie',
  published: 'Publie',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<ArticleStatus, { bg: string; text: string; border: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  ready: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  scheduled: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  published: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  sold: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Ete',
  autumn: 'Automne',
  winter: 'Hiver',
  'all-seasons': 'Toutes saisons',
  undefined: 'Non defini',
};

const CONDITION_LABELS: Record<string, string> = {
  new_with_tag: 'Neuf avec étiquette',
  new_without_tag: 'Neuf sans étiquette',
  new_with_tags: 'Neuf avec étiquette',
  new_without_tags: 'Neuf sans étiquette',
  very_good: 'Très bon état',
  good: 'Bon état',
  satisfactory: 'Satisfaisant',
};

const renderStatusIcon = (status: ArticleStatus) => {
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

const renderSeasonIcon = (season?: Season) => {
  const iconClass = 'w-4 h-4';
  switch (season) {
    case 'spring': return <Flower2 className={`${iconClass} text-pink-500`} />;
    case 'summer': return <Sun className={`${iconClass} text-orange-500`} />;
    case 'autumn': return <Leaf className={`${iconClass} text-amber-600`} />;
    case 'winter': return <Snowflake className={`${iconClass} text-blue-500`} />;
    case 'all-seasons': return <CloudSun className={`${iconClass} text-slate-500`} />;
    default: return <CloudSun className={`${iconClass} text-slate-300`} />;
  }
};

export function AdminDetailDrawer({
  item,
  isOpen,
  onClose,
  onView,
  onEdit,
  onPublish,
  onDuplicate,
  onSchedule,
  onMarkSold,
  onDelete,
  onStatusChange,
  onLabelOpen,
  formatDate,
}: AdminDetailDrawerProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<FullArticleDetails | null>(null);
  const [articlePhotoIndex, setArticlePhotoIndex] = useState(0);
  const [loadingArticle, setLoadingArticle] = useState(false);

  useEffect(() => {
    setCurrentPhotoIndex(0);
    setSelectedArticle(null);
    setArticlePhotoIndex(0);
  }, [item?.id]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedArticle(null);
      setArticlePhotoIndex(0);
    }
  }, [isOpen]);

  const fetchArticleDetails = async (articleId: string) => {
    setLoadingArticle(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSelectedArticle({
          id: data.id,
          title: data.title,
          brand: data.brand,
          price: parseFloat(data.price),
          photos: data.photos || [],
          size: data.size,
          color: data.color,
          material: data.material,
          condition: data.condition,
          description: data.description,
          season: data.season === 'all_seasons' ? 'all-seasons' : data.season,
          main_category: data.main_category,
          subcategory: data.subcategory,
          item_category: data.item_category,
          reference_number: data.reference_number,
          status: data.status,
        });
        setArticlePhotoIndex(0);
      }
    } catch (error) {
      console.error('Error fetching article details:', error);
    } finally {
      setLoadingArticle(false);
    }
  };

  if (!item) return null;

  const statusColors = STATUS_COLORS[item.status];

  const handlePreviousPhoto = () => {
    if (!item?.photos) return;
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? item.photos.length - 1 : prev - 1
    );
  };

  const handleNextPhoto = () => {
    if (!item?.photos) return;
    setCurrentPhotoIndex((prev) =>
      prev === item.photos.length - 1 ? 0 : prev + 1
    );
  };

  const getStatusMessage = () => {
    switch (item.status) {
      case 'draft':
        return "Cette annonce est en cours de préparation. Complétez les champs obligatoires avant de l'envoyer.";
      case 'ready':
        return 'Tous les champs requis sont remplis. Vous pouvez maintenant envoyer cette annonce sur Vinted.';
      case 'published':
        return 'Cette annonce est actuellement en ligne sur Vinted.';
      case 'sold':
        return 'Cet article a été vendu avec succès.';
      case 'scheduled':
        return 'Cette annonce est planifiée pour une publication ultérieure sur Vinted.';
      default:
        return '';
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-lg ${
                item.type === 'lot' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {item.type === 'lot' ? 'Lot' : 'Article'}
              </span>
              <h2 className="font-semibold text-slate-900">Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="aspect-square bg-slate-100 relative">
              {item.photos && item.photos.length > 0 ? (
                <>
                  <img
                    src={item.photos[currentPhotoIndex]}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  {item.photos.length > 1 && (
                    <>
                      <button
                        onClick={handlePreviousPhoto}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-900" />
                      </button>
                      <button
                        onClick={handleNextPhoto}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-900" />
                      </button>
                      <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                        {currentPhotoIndex + 1} / {item.photos.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20 text-slate-300" />
                </div>
              )}
            </div>

            {item.photos && item.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50 border-b border-slate-200">
                {item.photos.map((photo, index) => (
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

            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm font-medium text-slate-600">
                  {item.brand || 'Sans marque'}
                  {item.size && ` • ${item.size}`}
                </p>
                {item.reference_number && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 font-mono">Ref. #{item.reference_number}</span>
                  </div>
                )}
              </div>

              {item.description && (
                <div>
                  <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Description</h4>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {item.description}
                    </p>
                  </div>
                </div>
              )}

              {item.type === 'lot' && item.articles && item.articles.length > 0 && (
                <>
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">
                      Articles inclus dans ce lot
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {item.articles.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => fetchArticleDetails(article.id)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-200 transition-colors text-left group"
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
                            <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {article.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {article.brand || 'Sans marque'}
                              {article.size && ` • ${article.size}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0 flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              {article.price.toFixed(0)} €
                            </p>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Articles Statistics */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-600" />
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                          Articles inclus
                        </p>
                      </div>
                      <span className="text-2xl font-bold text-slate-900">{item.articles.length}</span>
                    </div>
                  </div>

                  {/* Prix et Remise */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">Prix du lot</p>
                      <p className="text-lg font-bold text-emerald-600">{item.price.toFixed(2)} €</p>
                    </div>
                    {item.discount_percentage !== undefined && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Remise</p>
                        <div className="flex items-center gap-1.5">
                          <TrendingDown className="w-4 h-4 text-rose-500" />
                          <p className="text-lg font-bold text-slate-900">{item.discount_percentage}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {item.type === 'article' && (
                <div className="grid grid-cols-2 gap-3">
                  {item.brand && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Marque</p>
                      <p className="text-sm font-medium text-slate-900">{item.brand}</p>
                    </div>
                  )}
                  {item.size && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Taille</p>
                      <p className="text-sm font-medium text-slate-900">{item.size}</p>
                    </div>
                  )}
                  {item.color && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Couleur</p>
                      <p className="text-sm font-medium text-slate-900">{item.color}</p>
                    </div>
                  )}
                  {item.material && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Matière</p>
                      <p className="text-sm font-medium text-slate-900">{item.material}</p>
                    </div>
                  )}
                  {item.condition && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">État</p>
                      <p className="text-sm font-medium text-slate-900">{CONDITION_LABELS[item.condition] || item.condition}</p>
                    </div>
                  )}
                  {item.season && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Saison</p>
                      <div className="flex items-center gap-2">
                        {renderSeasonIcon(item.season)}
                        <span className="text-sm font-medium text-slate-900">{SEASON_LABELS[item.season]}</span>
                      </div>
                    </div>
                  )}
                  {item.suggested_period && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Période conseillée</p>
                      <p className="text-sm font-medium text-slate-900">{item.suggested_period}</p>
                    </div>
                  )}
                  {item.main_category && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Catégorie</p>
                      <p className="text-sm font-medium text-slate-900">
                        {item.main_category}
                        {item.subcategory && ` > ${item.subcategory}`}
                        {item.item_category && ` > ${item.item_category}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {item.type === 'article' && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">Prix</p>
                    <p className="text-lg font-bold text-emerald-600">{item.price.toFixed(2)}€</p>
                  </div>
                )}
                {item.seller_name && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Vendeur</p>
                    <p className="text-sm font-medium text-slate-900">{item.seller_name}</p>
                  </div>
                )}
              </div>

              {item.status === 'sold' && (item.fees !== undefined || item.shipping_cost !== undefined || item.buyer_name) && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <h4 className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-3">Détails de la vente</h4>
                  <div className="space-y-2">
                    {item.buyer_name && (
                      <div className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-emerald-700">Acheteur</span>
                        <span className="text-sm font-medium text-emerald-900">{item.buyer_name}</span>
                      </div>
                    )}
                    {item.fees !== undefined && (
                      <div className="flex items-center justify-between py-1.5 border-t border-emerald-200">
                        <span className="text-sm text-emerald-700">Frais</span>
                        <span className="text-sm font-medium text-emerald-900">{item.fees.toFixed(2)}€</span>
                      </div>
                    )}
                    {item.shipping_cost !== undefined && (
                      <div className="flex items-center justify-between py-1.5 border-t border-emerald-200">
                        <span className="text-sm text-emerald-700">Frais de port</span>
                        <span className="text-sm font-medium text-emerald-900">{item.shipping_cost.toFixed(2)}€</span>
                      </div>
                    )}
                    {item.sale_notes && (
                      <div className="pt-2 border-t border-emerald-200">
                        <p className="text-xs text-emerald-700 mb-1 font-semibold">Notes</p>
                        <p className="text-sm text-emerald-900">{item.sale_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.vinted_url && (
                <a
                  href={item.vinted_url}
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

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="mb-2">
                  <button
                    onClick={onStatusChange}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${statusColors.bg} ${statusColors.text} ${statusColors.border} hover:scale-105 transition-transform text-sm font-semibold`}
                  >
                    {renderStatusIcon(item.status)}
                    <span>{STATUS_LABELS[item.status]}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{getStatusMessage()}</p>
              </div>

              {item.reference_number && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Étiquette de colis
                    </h3>
                    <button
                      onClick={onLabelOpen}
                      className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Générer l&apos;étiquette
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-3">Actions rapides</h4>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={onEdit}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
                  >
                    <ClipboardEdit className="w-4 h-4" />
                    Modifier
                  </button>
                  {(item.status === 'ready' || item.status === 'scheduled') && (
                    <button
                      onClick={onPublish}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors font-medium text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Envoyer à Vinted
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50 sticky bottom-0">
            <div className="grid grid-cols-3 gap-2">
              {item.status !== 'sold' && (
                <>
                  <button
                    onClick={onSchedule}
                    className="flex flex-col items-center gap-1 py-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-medium">Planifier</span>
                  </button>
                  <button
                    onClick={onMarkSold}
                    className="flex flex-col items-center gap-1 py-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span className="text-[10px] font-medium">Vendu</span>
                  </button>
                </>
              )}
              <button
                onClick={onDelete}
                className="flex flex-col items-center gap-1 py-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-[10px] font-medium">Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[60] transition-transform duration-300 ease-out ${
          selectedArticle ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {(selectedArticle || loadingArticle) && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <p className="text-xs text-slate-500">Retour au lot</p>
                  <h2 className="font-semibold text-slate-900">Details article</h2>
                </div>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingArticle ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedArticle && (
              <div className="flex-1 overflow-y-auto">
                <div className="aspect-square bg-slate-100 relative">
                  {selectedArticle.photos && selectedArticle.photos.length > 0 ? (
                    <>
                      <img
                        src={selectedArticle.photos[articlePhotoIndex]}
                        alt={selectedArticle.title}
                        className="w-full h-full object-cover"
                      />
                      {selectedArticle.photos.length > 1 && (
                        <>
                          <button
                            onClick={() => setArticlePhotoIndex((prev) =>
                              prev === 0 ? selectedArticle.photos.length - 1 : prev - 1
                            )}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                          >
                            <ChevronLeft className="w-4 h-4 text-slate-900" />
                          </button>
                          <button
                            onClick={() => setArticlePhotoIndex((prev) =>
                              prev === selectedArticle.photos.length - 1 ? 0 : prev + 1
                            )}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-900" />
                          </button>
                          <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                            {articlePhotoIndex + 1} / {selectedArticle.photos.length}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-20 h-20 text-slate-300" />
                    </div>
                  )}
                </div>

                {selectedArticle.photos && selectedArticle.photos.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3 bg-slate-50 border-b border-slate-200">
                    {selectedArticle.photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`relative flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
                          articlePhotoIndex === index
                            ? 'border-blue-500 ring-2 ring-blue-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setArticlePhotoIndex(index)}
                      >
                        <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-5 space-y-5">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{selectedArticle.title}</h3>
                    <p className="text-sm font-medium text-slate-600">
                      {selectedArticle.brand || 'Sans marque'}
                      {selectedArticle.size && ` • ${selectedArticle.size}`}
                    </p>
                    {selectedArticle.reference_number && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-400 font-mono">Ref. #{selectedArticle.reference_number}</span>
                      </div>
                    )}
                  </div>

                  {selectedArticle.description && (
                    <div>
                      <h4 className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Description</h4>
                      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {selectedArticle.description}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">Prix</p>
                      <p className="text-lg font-bold text-emerald-600">{selectedArticle.price.toFixed(2)}€</p>
                    </div>
                    {selectedArticle.status && (
                      <div className={`p-3 rounded-xl border ${STATUS_COLORS[selectedArticle.status].bg} ${STATUS_COLORS[selectedArticle.status].border}`}>
                        <p className="text-[10px] uppercase tracking-wide font-semibold mb-1 opacity-70">Statut</p>
                        <div className="flex items-center gap-1.5">
                          {renderStatusIcon(selectedArticle.status)}
                          <span className={`text-sm font-semibold ${STATUS_COLORS[selectedArticle.status].text}`}>
                            {STATUS_LABELS[selectedArticle.status]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {selectedArticle.brand && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Marque</p>
                        <p className="text-sm font-medium text-slate-900">{selectedArticle.brand}</p>
                      </div>
                    )}
                    {selectedArticle.size && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Taille</p>
                        <p className="text-sm font-medium text-slate-900">{selectedArticle.size}</p>
                      </div>
                    )}
                    {selectedArticle.color && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Couleur</p>
                        <p className="text-sm font-medium text-slate-900">{selectedArticle.color}</p>
                      </div>
                    )}
                    {selectedArticle.material && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Matiere</p>
                        <p className="text-sm font-medium text-slate-900">{selectedArticle.material}</p>
                      </div>
                    )}
                    {selectedArticle.condition && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Etat</p>
                        <p className="text-sm font-medium text-slate-900">{CONDITION_LABELS[selectedArticle.condition] || selectedArticle.condition}</p>
                      </div>
                    )}
                    {selectedArticle.season && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Saison</p>
                        <div className="flex items-center gap-2">
                          {renderSeasonIcon(selectedArticle.season)}
                          <span className="text-sm font-medium text-slate-900">{SEASON_LABELS[selectedArticle.season]}</span>
                        </div>
                      </div>
                    )}
                    {selectedArticle.main_category && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Categorie</p>
                        <p className="text-sm font-medium text-slate-900">
                          {selectedArticle.main_category}
                          {selectedArticle.subcategory && ` > ${selectedArticle.subcategory}`}
                          {selectedArticle.item_category && ` > ${selectedArticle.item_category}`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
