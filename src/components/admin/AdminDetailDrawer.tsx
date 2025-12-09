import { X, Package, Eye, ClipboardEdit, Upload, Copy, Calendar, DollarSign, Trash2, FileText, CheckCircle2, Clock, Send, Flower2, Sun, Leaf, Snowflake, CloudSun, ExternalLink } from 'lucide-react';
import { ArticleStatus, Season } from '../../types/article';

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
  formatDate,
}: AdminDetailDrawerProps) {
  if (!item) return null;

  const statusColors = STATUS_COLORS[item.status];

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
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
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
                <img
                  src={item.photos[0]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-20 h-20 text-slate-300" />
                </div>
              )}
              {item.photos && item.photos.length > 1 && (
                <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-lg backdrop-blur-sm">
                  +{item.photos.length - 1} photos
                </div>
              )}
            </div>

            <div className="p-5 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-slate-500">{item.brand || 'Sans marque'}</p>
                {item.reference_number && (
                  <p className="text-xs text-slate-400 font-mono mt-1">Ref. #{item.reference_number}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">{item.price.toFixed(0)}€</p>
                  {item.status === 'sold' && item.net_profit !== undefined && (
                    <p className={`text-sm font-semibold mt-0.5 ${item.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.net_profit >= 0 ? '+' : ''}{item.net_profit.toFixed(0)}€ de benefice net
                    </p>
                  )}
                </div>
                <button
                  onClick={onStatusChange}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${statusColors.bg} ${statusColors.text} ${statusColors.border} hover:scale-105 transition-transform`}
                >
                  {renderStatusIcon(item.status)}
                  <span className="font-semibold">{STATUS_LABELS[item.status]}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {item.type === 'article' && item.season && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Saison</p>
                    <div className="flex items-center gap-2">
                      {renderSeasonIcon(item.season)}
                      <span className="text-sm font-medium text-slate-700">{SEASON_LABELS[item.season]}</span>
                    </div>
                  </div>
                )}
                {item.seller_name && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Vendeur</p>
                    <p className="text-sm font-medium text-slate-700">{item.seller_name}</p>
                  </div>
                )}
                {item.type === 'lot' && item.lot_article_count && (
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Articles</p>
                    <p className="text-sm font-medium text-slate-700">{item.lot_article_count} articles</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Dates</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Cree le</span>
                    <span className="text-sm font-medium text-slate-700">{formatDate(item.created_at)}</span>
                  </div>
                  {item.scheduled_for && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">Planifie pour le</span>
                      <span className="text-sm font-medium text-amber-600">{formatDate(item.scheduled_for)}</span>
                    </div>
                  )}
                  {item.published_at && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">Publie le</span>
                      <span className="text-sm font-medium text-violet-600">{formatDate(item.published_at)}</span>
                    </div>
                  )}
                  {item.sold_at && (
                    <div className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-500">Vendu le</span>
                      <span className="text-sm font-medium text-emerald-600">{formatDate(item.sold_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Actions rapides</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onView}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Apercu
                  </button>
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
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors font-medium text-sm col-span-2"
                    >
                      <Upload className="w-4 h-4" />
                      Envoyer a Vinted
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="grid grid-cols-4 gap-2">
              {item.type === 'article' && (
                <button
                  onClick={onDuplicate}
                  className="flex flex-col items-center gap-1 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-[10px] font-medium">Dupliquer</span>
                </button>
              )}
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
    </>
  );
}
