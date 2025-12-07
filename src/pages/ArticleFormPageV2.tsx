import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, Plus, Sparkles, Trash2, Send, CheckCircle, Edit } from 'lucide-react';
import { Condition, Season, ArticleStatus } from '../types/article';
import { Toast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VINTED_CATEGORIES } from '../constants/categories';
import { COLORS, MATERIALS } from '../constants/articleAttributes';
import { analyzeProductImage } from '../lib/openaiService';

const CONDITION_LABELS: Record<Condition, string> = {
  new_with_tag: 'New with tag',
  new_without_tag: 'New without tag',
  new_with_tags: 'New with tags',
  new_without_tags: 'New without tags',
  very_good: 'Very Good',
  good: 'Good',
  satisfactory: 'Satisfactory',
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
  'all-seasons': 'All seasons',
  undefined: 'Undefined',
};

export function ArticleFormPageV2() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [familyMembers, setFamilyMembers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    writing_style: string | null;
  } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    size: '',
    condition: 'very_good' as Condition,
    main_category: '',
    subcategory: '',
    item_category: '',
    price: '',
    season: 'all-seasons' as Season,
    suggested_period: '',
    photos: [] as string[],
    color: '',
    material: '',
    seller_id: null as string | null,
    reference_number: '',
    hashtags: [] as string[],
    caption: '',
  });

  useEffect(() => {
    loadUserProfile();
    loadFamilyMembers();
    if (id) {
      fetchArticle();
    }
  }, [id, user]);

  const loadUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('writing_style')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setUserProfile({
          writing_style: data.writing_style || null,
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadFamilyMembers = async () => {
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
      console.error('Error loading family members:', error);
    }
  };

  const fetchArticle = async () => {
    if (!id || !user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          brand: data.brand || '',
          size: data.size || '',
          condition: data.condition || 'very_good',
          main_category: data.main_category || '',
          subcategory: data.subcategory || '',
          item_category: data.item_category || '',
          price: data.price?.toString() || '',
          season: (data.season === 'all_seasons' ? 'all-seasons' : data.season) || 'all-seasons',
          suggested_period: data.suggested_period || '',
          photos: data.photos || [],
          color: data.color || '',
          material: data.material || '',
          seller_id: data.seller_id || null,
          reference_number: data.reference_number || '',
          hashtags: [],
          caption: '',
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setToast({ type: 'error', text: 'Error loading article' });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    try {
      setLoading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('article-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('article-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      setFormData((prev) => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls],
      }));

      if (uploadedUrls.length === 1 && !analyzingWithAI) {
        analyzeWithAI(uploadedUrls[0]);
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      setToast({ type: 'error', text: 'Error uploading photos' });
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async (photoUrl: string) => {
    if (!photoUrl) return;

    try {
      setAnalyzingWithAI(true);

      const response = await fetch(photoUrl);
      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(blob);
      });

      const mimeType = blob.type;
      const writingStyle = userProfile?.writing_style || undefined;

      const products = await analyzeProductImage(base64, mimeType, writingStyle);

      if (products && products.length > 0) {
        const product = products[0];

        const priceMatch = product.priceEstimate?.match(/\d+/);
        const estimatedPrice = priceMatch ? priceMatch[0] : '';

        setFormData((prev) => ({
          ...prev,
          title: product.title || prev.title,
          description: product.description || prev.description,
          brand: product.brand || prev.brand,
          color: product.color || prev.color,
          material: product.material || prev.material,
          size: product.size || prev.size,
          price: estimatedPrice || prev.price,
        }));

        setToast({ type: 'success', text: 'AI analysis completed!' });
      }
    } catch (error) {
      console.error('Error analyzing with AI:', error);
      setToast({ type: 'error', text: 'AI analysis failed' });
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.title || !formData.price) {
      setToast({ type: 'error', text: 'Title and price are required' });
      return;
    }

    try {
      setLoading(true);
      const { hashtags, caption, ...articleFormData } = formData;

      const referenceNumber = articleFormData.reference_number || `REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

      const articleData = {
        ...articleFormData,
        reference_number: referenceNumber,
        price: parseFloat(formData.price),
        season: formData.season === 'all-seasons' ? 'all_seasons' : formData.season,
        user_id: user.id,
        status: 'draft' as ArticleStatus,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        const { error } = await supabase
          .from('articles')
          .update(articleData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        setToast({ type: 'success', text: 'Article updated successfully' });
      } else {
        const { error } = await supabase
          .from('articles')
          .insert([{ ...articleData, created_at: new Date().toISOString() }]);

        if (error) throw error;
        setToast({ type: 'success', text: 'Article created successfully' });
      }

      setTimeout(() => navigate('/dashboard-v2'), 1500);
    } catch (error) {
      console.error('Error saving article:', error);
      setToast({ type: 'error', text: 'Error saving article' });
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
    if (selectedPhotoIndex >= formData.photos.length - 1) {
      setSelectedPhotoIndex(Math.max(0, formData.photos.length - 2));
    }
  };

  const handleDelete = async () => {
    if (!id || !user) return;

    try {
      if (formData.photos && formData.photos.length > 0) {
        const filePaths = formData.photos
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
        text: 'Article deleted successfully',
      });

      setDeleteModalOpen(false);
      setTimeout(() => {
        navigate('/dashboard-v2');
      }, 1000);
    } catch (error) {
      console.error('Error deleting article:', error);
      setToast({
        type: 'error',
        text: 'Error deleting article',
      });
    }
  };

  const selectedCategory = VINTED_CATEGORIES.find((c) => c.name === formData.main_category);
  const selectedSubcategory = selectedCategory?.subcategories.find((s) => s.name === formData.subcategory);

  if (loading && id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Photo */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden aspect-[3/4] relative">
              {formData.photos.length > 0 ? (
                <>
                  <img
                    src={formData.photos[selectedPhotoIndex]}
                    alt="Product"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => analyzeWithAI(formData.photos[selectedPhotoIndex])}
                    disabled={analyzingWithAI}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white rounded-xl px-4 py-2 shadow-lg flex items-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-4 h-4 ${analyzingWithAI ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium">
                      {analyzingWithAI ? 'Analyzing...' : 'AI Studio'}
                    </span>
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                  <Plus className="w-16 h-16 text-slate-300 mb-4" />
                  <span className="text-slate-400 font-medium">Add Photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {formData.photos.map((photo, index) => (
                <div
                  key={index}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                    selectedPhotoIndex === index
                      ? 'border-emerald-600 ring-2 ring-emerald-100'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setSelectedPhotoIndex(index)}
                >
                  <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(index);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {formData.photos.length > 0 && (
                <label className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors">
                  <Plus className="w-6 h-6 text-slate-400" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-slate-900">Item Details</h1>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/dashboard-v2')}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500">Review the AI-generated information</p>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xl font-semibold text-slate-900 border-0 border-b-2 border-slate-100 focus:border-emerald-500 focus:ring-0 px-0 py-2 transition-colors"
                  placeholder="Item title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={6}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-3 transition-colors resize-none"
                  placeholder="Describe your item..."
                />
              </div>

              {/* Brand & Size */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                    placeholder="Unknown"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Size
                  </label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                    placeholder="M"
                  />
                </div>
              </div>

              {/* Condition & Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as Condition })}
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                  >
                    {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Price (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full text-sm font-bold text-emerald-600 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                    placeholder="35.00"
                  />
                </div>
              </div>

              {/* Color & Material */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Color
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                  >
                    <option value="">Select color</option>
                    {COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Material
                  </label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                  >
                    <option value="">Select material</option>
                    {MATERIALS.map((material) => (
                      <option key={material} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Category
                </label>
                <select
                  value={formData.main_category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      main_category: e.target.value,
                      subcategory: '',
                      item_category: '',
                    })
                  }
                  className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                >
                  <option value="">Select category</option>
                  {VINTED_CATEGORIES.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              {selectedCategory && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Subcategory
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subcategory: e.target.value,
                        item_category: '',
                      })
                    }
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                  >
                    <option value="">Select subcategory</option>
                    {selectedCategory.subcategories.map((sub) => (
                      <option key={sub.name} value={sub.name}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Item Category */}
              {selectedSubcategory && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Item Type
                  </label>
                  <select
                    value={formData.item_category}
                    onChange={(e) => setFormData({ ...formData, item_category: e.target.value })}
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                  >
                    <option value="">Select item type</option>
                    {selectedSubcategory.items.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Season */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Season
                </label>
                <select
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value as Season })}
                  className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                >
                  {Object.entries(SEASON_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seller */}
              {familyMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Seller
                  </label>
                  <select
                    value={formData.seller_id || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, seller_id: e.target.value || null })
                    }
                    className="w-full text-sm text-slate-900 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 px-4 py-2.5 transition-colors"
                  >
                    <option value="">Me</option>
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
        </div>

        {/* Action Buttons */}
        {id && (
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
                onClick={() => navigate(`/articles/${id}/preview`)}
                className="px-6 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-100 transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Prévisualiser
              </button>

              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Sauvegarder
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'article"
        message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
