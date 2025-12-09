import { useState, useEffect, DragEvent } from 'react';
import {
  X,
  Check,
  Package,
  AlertCircle,
  Search,
  Percent,
  Layers,
  Tag,
  Image as ImageIcon,
  Trash2,
  Plus,
  TrendingDown,
  Filter,
  Grid3x3,
  Sparkles,
  Euro,
  User,
  FileText,
  Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article, Season } from '../types/article';
import { LotStatus } from '../types/lot';

import {
  Card,
  SoftCard,
  Pill,
  PrimaryButton,
  GhostButton,
  IconButton,
} from './ui/UiKit';

interface LotBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingLotId?: string;
}

interface LotData {
  name: string;
  description: string;
  category_id?: number;
  season?: Season;
  selectedArticles: string[];
  price: number;
  cover_photo?: string;
  photos: string[];
  status: LotStatus;
  seller_id?: string | null;
}

export default function LotBuilder({
  isOpen,
  onClose,
  onSuccess,
  existingLotId,
}: LotBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [articlesInLots, setArticlesInLots] = useState<Set<string>>(new Set());
  const [draggedArticleId, setDraggedArticleId] = useState<string | null>(null);
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null);

  const [lotData, setLotData] = useState<LotData>({
    name: '',
    description: '',
    selectedArticles: [],
    price: 0,
    photos: [],
    status: 'draft',
    seller_id: null,
  });

  const [filters, setFilters] = useState({
    search: '',
    season: 'all',
    brand: 'all',
    size: 'all',
  });

  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchArticles();
      fetchArticlesInLots();
      fetchFamilyMembers();
      if (existingLotId) {
        loadExistingLot();
      } else {
        resetForm();
      }
    }
  }, [isOpen, existingLotId]);

  useEffect(() => {
    applyFilters();
  }, [filters, articles]);

  const resetForm = () => {
    setLotData({
      name: '',
      description: '',
      selectedArticles: [],
      price: 0,
      photos: [],
      status: 'draft',
      seller_id: null,
    });
    setError('');
  };

  const fetchFamilyMembers = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('family_members')
      .select('id, name')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error loading family members:', error);
      return;
    }

    setFamilyMembers(data || []);
  };

  const loadExistingLot = async () => {
    if (!existingLotId) return;

    try {
      const { data: lotData, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', existingLotId)
        .single();

      if (lotError) throw lotError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('lot_items')
        .select('article_id')
        .eq('lot_id', existingLotId);

      if (itemsError) throw itemsError;

      const articleIds = itemsData.map((item) => item.article_id);

      setLotData({
        name: lotData.name,
        description: lotData.description || '',
        category_id: lotData.category_id,
        season: lotData.season,
        selectedArticles: articleIds,
        price: parseFloat(lotData.price) || 0,
        cover_photo: lotData.cover_photo,
        photos: lotData.photos || [],
        status: lotData.status || 'draft',
        seller_id: lotData.seller_id || null,
      });
    } catch (error) {
      console.error('Error loading existing lot:', error);
      setError('Erreur lors du chargement du lot');
    }
  };

  const fetchArticles = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['draft', 'ready', 'scheduled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return;
    }

    setArticles(data || []);
    setFilteredArticles(data || []);
  };

  const fetchArticlesInLots = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('lot_items')
      .select('article_id, lot_id, lots!inner(status)')
      .neq('lots.status', 'sold');

    if (existingLotId) {
      query = query.neq('lot_id', existingLotId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching lot items:', error);
      return;
    }

    const articleIds = new Set(data?.map((item) => item.article_id) || []);
    setArticlesInLots(articleIds);
  };

  const applyFilters = () => {
    let filtered = [...articles];

    if (filters.search) {
      filtered = filtered.filter(
        (article) =>
          article.title
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          article.brand?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.season !== 'all') {
      filtered = filtered.filter((article) => article.season === filters.season);
    }

    if (filters.brand !== 'all') {
      filtered = filtered.filter((article) => article.brand === filters.brand);
    }

    if (filters.size !== 'all') {
      filtered = filtered.filter((article) => article.size === filters.size);
    }

    setFilteredArticles(filtered);
  };

  const syncPhotosFromArticles = () => {
    const selectedArticles = getSelectedArticles();
    const newPhotos = selectedArticles.flatMap((a) => a.photos);

    const existingPhotos = lotData.photos.filter(photo => newPhotos.includes(photo));
    const addedPhotos = newPhotos.filter(photo => !existingPhotos.includes(photo));

    const updatedPhotos = [...existingPhotos, ...addedPhotos];

    setLotData((prev) => ({
      ...prev,
      photos: updatedPhotos,
      cover_photo: prev.cover_photo && updatedPhotos.includes(prev.cover_photo)
        ? prev.cover_photo
        : updatedPhotos[0],
    }));
  };

  const getAvailableBrands = () => {
    const brands = new Set(articles.map((a) => a.brand).filter(Boolean));
    return Array.from(brands).sort();
  };

  const getAvailableSizes = () => {
    const sizes = new Set(articles.map((a) => a.size).filter(Boolean));
    return Array.from(sizes).sort();
  };

  const toggleArticleSelection = (articleId: string) => {
    setLotData((prev) => ({
      ...prev,
      selectedArticles: prev.selectedArticles.includes(articleId)
        ? prev.selectedArticles.filter((id) => id !== articleId)
        : [...prev.selectedArticles, articleId],
    }));
  };

  useEffect(() => {
    if (lotData.selectedArticles.length > 0) {
      syncPhotosFromArticles();
    }
  }, [lotData.selectedArticles.join(',')]);

  const getSelectedArticles = () => {
    return articles.filter((a) => lotData.selectedArticles.includes(a.id));
  };

  const calculateTotalPrice = () => {
    return getSelectedArticles().reduce(
      (sum, article) => sum + article.price,
      0
    );
  };

  const calculateDiscount = () => {
    const total = calculateTotalPrice();
    if (total === 0 || lotData.price === 0) return 0;
    return Math.round(((total - lotData.price) / total) * 100);
  };

  const handleDiscountSlider = (discountPercent: number) => {
    const total = calculateTotalPrice();
    const newPrice = Math.round(total * (1 - discountPercent / 100));
    setLotData({ ...lotData, price: newPrice });
  };

  const generateLotReferenceNumber = async (
    userId: string
  ): Promise<string> => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('dressing_name')
        .eq('id', userId)
        .maybeSingle();

      const { count } = await supabase
        .from('lots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('reference_number', 'is', null);

      const dressingName = (profile?.dressing_name || 'MonDressing').replace(
        /\s+/g,
        '_'
      );
      const lotNumber = (count || 0) + 1;
      const timestamp = Date.now().toString().slice(-6);
      const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();

      return `LOT_${dressingName}_${lotNumber}_${timestamp}${randomSuffix}`;
    } catch (error) {
      console.error('Error generating lot reference number:', error);
      return `LOT_REF-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;
    }
  };

  const handleSubmit = async () => {
    if (!lotData.name.trim()) {
      setError('Le nom du lot est obligatoire');
      return;
    }
    if (lotData.selectedArticles.length < 2) {
      setError('Vous devez sélectionner au moins 2 articles');
      return;
    }
    if (lotData.price <= 0) {
      setError('Le prix du lot doit être supérieur à 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const totalPrice = calculateTotalPrice();
      const discount = calculateDiscount();

      let referenceNumber: string | undefined;
      if (!existingLotId) {
        referenceNumber = await generateLotReferenceNumber(user.id);
      }

      const lotPayload: any = {
        user_id: user.id,
        name: lotData.name,
        description: lotData.description,
        category_id: lotData.category_id,
        season: lotData.season,
        price: lotData.price,
        original_total_price: totalPrice,
        discount_percentage: discount,
        cover_photo: lotData.cover_photo || lotData.photos[0],
        photos: lotData.photos.slice(0, 5),
        status: lotData.status,
        seller_id: lotData.seller_id,
      };

      if (referenceNumber) {
        lotPayload.reference_number = referenceNumber;
      }

      let lotId: string;

      if (existingLotId) {
        const { error: lotError } = await supabase
          .from('lots')
          .update(lotPayload)
          .eq('id', existingLotId);

        if (lotError) throw lotError;
        lotId = existingLotId;

        const { error: deleteError } = await supabase
          .from('lot_items')
          .delete()
          .eq('lot_id', existingLotId);

        if (deleteError) throw deleteError;
      } else {
        const { data: lot, error: lotError } = await supabase
          .from('lots')
          .insert([lotPayload])
          .select()
          .single();

        if (lotError) throw lotError;
        lotId = lot.id;
      }

      const lotItems = lotData.selectedArticles.map((articleId) => ({
        lot_id: lotId,
        article_id: articleId,
      }));

      const { error: itemsError } = await supabase
        .from('lot_items')
        .insert(lotItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving lot:', err);
      setError(
        err.message ||
          `Erreur lors de ${
            existingLotId ? 'la modification' : 'la création'
          } du lot`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: DragEvent, articleId: string) => {
    setDraggedArticleId(articleId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    if (draggedArticleId && !articlesInLots.has(draggedArticleId)) {
      toggleArticleSelection(draggedArticleId);
      setDraggedArticleId(null);
    }
  };

  const handlePhotoDragStart = (e: DragEvent, index: number) => {
    setDraggedPhotoIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePhotoDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null);
      return;
    }

    const newPhotos = [...lotData.photos];
    const [removed] = newPhotos.splice(draggedPhotoIndex, 1);
    newPhotos.splice(targetIndex, 0, removed);

    setLotData({ ...lotData, photos: newPhotos });
    setDraggedPhotoIndex(null);
  };

  const selectBySeason = (season: Season) => {
    const articleIds = articles
      .filter((a) => a.season === season && !articlesInLots.has(a.id))
      .map((a) => a.id);
    setLotData({ ...lotData, selectedArticles: articleIds });
  };

  const selectByBrand = (brand: string) => {
    const articleIds = articles
      .filter((a) => a.brand === brand && !articlesInLots.has(a.id))
      .map((a) => a.id);
    setLotData({ ...lotData, selectedArticles: articleIds });
  };

  if (!isOpen) return null;

  const totalPrice = calculateTotalPrice();
  const discount = calculateDiscount();
  const allPhotos = lotData.photos;
  const isLotValid = lotData.name.trim() && lotData.selectedArticles.length >= 2 && lotData.price > 0;
  const availableBrands = getAvailableBrands();
  const availableSizes = getAvailableSizes();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full h-full sm:h-[95vh] sm:max-w-[1600px] sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                {existingLotId ? 'Modifier le lot' : 'Créer un lot'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {lotData.selectedArticles.length > 0 && (
                  <span className="font-medium">
                    {lotData.selectedArticles.length} article(s) • {totalPrice.toFixed(0)}€
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {discount > 0 && (
              <Pill variant="success" className="hidden md:inline-flex">
                <TrendingDown className="w-3.5 h-3.5" />
                {discount}% de remise
              </Pill>
            )}
            <IconButton icon={X} ariaLabel="Fermer" onClick={onClose} />
          </div>
        </div>

        {/* Main Content - Split View */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT PANEL - Lot Builder */}
          <div className="w-full lg:w-[480px] xl:w-[520px] border-b lg:border-b-0 lg:border-r border-slate-200 bg-slate-50/50 overflow-y-auto">
            <div className="p-4 sm:p-5 space-y-4">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 flex gap-3 items-start">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-800 leading-snug">{error}</p>
                </div>
              )}

              {/* Lot Preview Card */}
              <Card className="bg-gradient-to-br from-white to-slate-50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Aperçu du lot</h3>
                </div>

                {/* Photo Preview */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="aspect-square rounded-2xl overflow-hidden bg-slate-100 border-2 border-dashed border-slate-300 mb-4 flex items-center justify-center relative group"
                >
                  {allPhotos.length > 0 ? (
                    <>
                      <img
                        src={lotData.cover_photo || allPhotos[0]}
                        alt="Aperçu"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 shadow-lg">
                        <ImageIcon className="w-3.5 h-3.5 text-white" />
                        <span className="text-xs font-semibold text-white">Photo principale</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Package className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Glissez des articles ici</p>
                      <p className="text-xs text-slate-400 mt-1">ou sélectionnez-les à droite</p>
                    </div>
                  )}
                  {draggedArticleId && (
                    <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
                      <Plus className="w-10 h-10 text-emerald-600" />
                    </div>
                  )}
                </div>

                {/* Photos Thumbnails with Selection */}
                {allPhotos.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <ImageIcon className="w-3.5 h-3.5" />
                        Photos du lot
                      </label>
                      <button
                        onClick={() => setLotData({ ...lotData, cover_photo: allPhotos[0] })}
                        className="text-xs text-slate-500 hover:text-emerald-600 font-medium transition-colors"
                      >
                        Réinitialiser
                      </button>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 mb-2">
                      <p className="text-xs text-blue-700 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          <strong>Glissez-déposez</strong> pour réorganiser • <strong>Cliquez</strong> pour définir en principal
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {allPhotos.slice(0, 5).map((photo, idx) => {
                        const isMainPhoto = (lotData.cover_photo || allPhotos[0]) === photo;
                        const isDragging = draggedPhotoIndex === idx;
                        return (
                          <div
                            key={idx}
                            draggable
                            onDragStart={(e) => handlePhotoDragStart(e, idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handlePhotoDrop(e, idx)}
                            onClick={() => setLotData({ ...lotData, cover_photo: photo })}
                            className={[
                              'relative aspect-square rounded-xl overflow-hidden border-2 transition-all group',
                              isDragging
                                ? 'opacity-50 scale-95 border-blue-400'
                                : isMainPhoto
                                ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md cursor-grab active:cursor-grabbing'
                                : 'border-slate-200 hover:border-emerald-300 cursor-grab active:cursor-grabbing hover:scale-105',
                            ].join(' ')}
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            {isMainPhoto && (
                              <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 to-transparent flex items-end justify-center pb-1.5">
                                <div className="flex items-center gap-1 text-white">
                                  <Check className="w-3 h-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-wide">Principale</span>
                                </div>
                              </div>
                            )}
                            {!isMainPhoto && !isDragging && (
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <div className="bg-white/90 rounded-full p-1.5 shadow-lg">
                                  <ImageIcon className="w-3 h-3 text-slate-700" />
                                </div>
                              </div>
                            )}
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 flex items-center justify-center text-[11px] font-bold text-white shadow-lg">
                              {idx + 1}
                            </div>
                            {draggedPhotoIndex !== null && draggedPhotoIndex !== idx && (
                              <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-100/80 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <Layers className="w-3.5 h-3.5" />
                      Articles
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                      {lotData.selectedArticles.length}
                    </p>
                  </div>
                  <div className="rounded-xl bg-emerald-100/80 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 mb-1">
                      <Euro className="w-3.5 h-3.5" />
                      Prix du lot
                    </div>
                    <p className="text-xl font-bold text-emerald-700">
                      {lotData.price.toFixed(0)}€
                    </p>
                  </div>
                </div>
              </Card>

              {/* Lot Details Form */}
              <Card>
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      Nom du lot <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lotData.name}
                      onChange={(e) =>
                        setLotData({ ...lotData, name: e.target.value })
                      }
                      placeholder="Ex : Pack fille 8 ans - Été"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                      <FileText className="w-3.5 h-3.5" />
                      Description
                    </label>
                    <textarea
                      value={lotData.description}
                      onChange={(e) =>
                        setLotData({
                          ...lotData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Décrivez le contenu du lot..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        Saison
                      </label>
                      <select
                        value={lotData.season || ''}
                        onChange={(e) =>
                          setLotData({ ...lotData, season: e.target.value as Season })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      >
                        <option value="">Toutes</option>
                        <option value="spring">Printemps</option>
                        <option value="summer">Été</option>
                        <option value="autumn">Automne</option>
                        <option value="winter">Hiver</option>
                        <option value="all-seasons">Multi-saisons</option>
                      </select>
                    </div>

                    {familyMembers.length > 0 && (
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                          <User className="w-3.5 h-3.5" />
                          Vendeur
                        </label>
                        <select
                          value={lotData.seller_id || ''}
                          onChange={(e) =>
                            setLotData({
                              ...lotData,
                              seller_id: e.target.value || null,
                            })
                          }
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        >
                          <option value="">Moi</option>
                          {familyMembers.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Pricing Card with Slider */}
              {totalPrice > 0 && (
                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-900">Prix intelligent</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Prix total individuel</span>
                      <span className="text-lg font-bold text-slate-900">{totalPrice.toFixed(0)}€</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Remise
                        </label>
                        <span className="text-sm font-bold text-emerald-600">{discount}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={discount}
                        onChange={(e) => handleDiscountSlider(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-emerald-200">
                      <span className="text-sm font-medium text-slate-700">Prix du lot</span>
                      <input
                        type="number"
                        step="1"
                        value={lotData.price || ''}
                        onChange={(e) =>
                          setLotData({
                            ...lotData,
                            price: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-24 px-3 py-2 rounded-lg border border-emerald-200 bg-white text-right text-lg font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </Card>
              )}

              {/* Selected Articles List */}
              {lotData.selectedArticles.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Articles sélectionnés</h3>
                    <GhostButton
                      onClick={() => setLotData({ ...lotData, selectedArticles: [] })}
                      className="text-xs gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Tout retirer
                    </GhostButton>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getSelectedArticles().map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 group hover:bg-slate-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                          {article.photos?.[0] ? (
                            <img
                              src={article.photos[0]}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {article.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {article.brand || 'Sans marque'} • {article.price.toFixed(0)}€
                          </p>
                        </div>
                        <button
                          onClick={() => toggleArticleSelection(article.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Action Button */}
              <PrimaryButton
                onClick={handleSubmit}
                disabled={loading || !isLotValid}
                className="w-full gap-2 h-12 text-base"
              >
                {loading ? (
                  'Enregistrement...'
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {existingLotId ? 'Mettre à jour le lot' : 'Créer le lot'}
                  </>
                )}
              </PrimaryButton>
            </div>
          </div>

          {/* RIGHT PANEL - Articles Library */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Filters Bar */}
            <div className="border-b border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                >
                  <Filter className="w-4 h-4" />
                  Filtres
                </button>
                <div className="h-4 w-px bg-slate-300" />
                <span className="text-sm text-slate-600">
                  {filteredArticles.length} article(s) disponible(s)
                </span>
              </div>

              {showFilters && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={filters.search}
                        onChange={(e) =>
                          setFilters({ ...filters, search: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <select
                      value={filters.season}
                      onChange={(e) =>
                        setFilters({ ...filters, season: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Toutes saisons</option>
                      <option value="spring">Printemps</option>
                      <option value="summer">Été</option>
                      <option value="autumn">Automne</option>
                      <option value="winter">Hiver</option>
                      <option value="all-seasons">Multi-saisons</option>
                    </select>

                    <select
                      value={filters.brand}
                      onChange={(e) =>
                        setFilters({ ...filters, brand: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Toutes marques</option>
                      {availableBrands.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filters.size}
                      onChange={(e) =>
                        setFilters({ ...filters, size: e.target.value })
                      }
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">Toutes tailles</option>
                      {availableSizes.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Selection */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Sélection rapide:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setLotData({ ...lotData, selectedArticles: filteredArticles.filter(a => !articlesInLots.has(a.id)).map(a => a.id) })}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 text-xs font-medium text-emerald-700 hover:bg-emerald-200 transition-colors"
                      >
                        Tout sélectionner
                      </button>
                      <button
                        onClick={() => setLotData({ ...lotData, selectedArticles: [] })}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Tout désélectionner
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Articles Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                {filteredArticles.map((article) => {
                  const isSelected = lotData.selectedArticles.includes(article.id);
                  const isInAnotherLot = articlesInLots.has(article.id);

                  return (
                    <div
                      key={article.id}
                      draggable={!isInAnotherLot}
                      onDragStart={(e) => handleDragStart(e, article.id)}
                      onClick={() =>
                        !isInAnotherLot && toggleArticleSelection(article.id)
                      }
                      className={[
                        'group relative rounded-2xl overflow-hidden border-2 bg-white cursor-pointer transition-all hover:shadow-lg',
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-200 shadow-md'
                          : isInAnotherLot
                          ? 'border-slate-200 opacity-40 cursor-not-allowed'
                          : 'border-slate-200 hover:border-emerald-300',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {isInAnotherLot && (
                        <div className="absolute top-2 left-2 z-10 rounded-full bg-amber-500 text-[10px] font-semibold text-white px-2 py-1 shadow">
                          Déjà dans un lot
                        </div>
                      )}

                      <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                        {article.photos && article.photos.length > 0 ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-slate-300" />
                        )}
                      </div>

                      <div className="p-2.5 space-y-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {article.brand || 'Sans marque'}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-bold text-emerald-600">
                            {article.price.toFixed(0)}€
                          </span>
                          {article.size && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {article.size}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredArticles.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <Grid3x3 className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-slate-600 font-medium mb-1">Aucun article disponible</p>
                  <p className="text-sm text-slate-500">
                    Modifiez vos filtres ou ajoutez de nouveaux articles
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
