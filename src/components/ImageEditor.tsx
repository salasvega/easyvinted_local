import { useState } from 'react';
import { Sparkles, Wand2, X, Palette, Store, User, Shirt } from 'lucide-react';
import { editProductImage as editWithGemini } from '../lib/geminiService';
import { editProductImage as editWithOpenAI } from '../lib/openaiService';

interface ImageEditorProps {
  imageUrl: string;
  onImageEdited: (newImageDataUrl: string) => void;
  onClose: () => void;
}

const SMART_BACKGROUND_PROMPT = `
Analyze the garment (color, material, style) and how it is presented (on hanger, flatlay, etc.) in the image, then change the background strictly following these rules:

1. **Light / white clothing**: Use a slightly textured, light neutral surface (light concrete, cool beige, or light pearl grey) to avoid "white on white" disappearance. Ensure soft contrast.
2. **Dark clothing (black, navy, charcoal)**: Use pure white, off-white, or light cream. Optionally add very subtle texture.
3. **Natural textiles (linen, wool, organic)**: Use light wood, beige linen fabric, or kraft/light brown paper to create visual continuity.
4. **Streetwear / Sport**: Use light concrete, soft metal texture, or a simple neutral urban wall. Style should be modern/editorial but clean.
5. **Elegant pieces (dresses, suits)**: Use sophisticated neutrals (light grey, warm beige) with very light texture. Avoid busy patterns.
6. **Photos on hanger/rack**: Use pure white, light beige, or a very simple clean wall. Keep vertical silhouette clear.
7. **Flatlay photos**: Use white photo paper, matte white cardboard, light wood, or very light linen fabric.

**Conflict Resolution**: If multiple rules apply, prioritize in this order:
1. Presentation type (hanger vs flatlay)
2. Style (streetwear/elegant)
3. Color (light vs dark)
4. Material.

**Default**: If unsure, use a clean, pure white studio background with a very soft, realistic shadow.

**Goal**: High readability, clean modern background, no visual noise, strict preservation of the product and labels.
`;

const ACTION_PROMPTS = {
  PLACE: `Action: Place. Place the product in the most appropriate setting, surface, or environment (hanger, clothing rack, wooden table, clean bedspread, minimalist boutique shelf, neutral interior) to showcase it in the most flattering and realistic way. Identify the garment type, style, color. Select a background that enhances it. Keep style realistic, clean, natural. Add soft consistent shadows. Strictly preserve the product details (logos, text, shapes).`,
  FOLD: `Action: Fold. Fold the garment naturally according to standard retail presentation and place it on the most appropriate support (wooden table, white matte board, linen fabric, shelf, bedspread). Maintain perfect realism, correct lighting, natural shadows. The folded shape must remain true to the garment's real proportions. Strictly preserve the product details (logos, text, shapes).`,
  TRY_ON: `Action: Real-Life Try-On. Display the garment worn or held by a realistic human model, in a natural, everyday context (street, neutral interior). Determine correct model type. Keep model realistic, neutral. Integrate garment with perfect physical accuracy (fit, drape, fabric behavior). NO distortion. Strictly preserve the product details.`
};

export function ImageEditor({ imageUrl, onImageEdited, onClose }: ImageEditorProps) {
  const [instruction, setInstruction] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async (customPrompt?: string) => {
    const promptToUse = customPrompt || instruction;

    if (!promptToUse.trim()) {
      setError('Veuillez entrer une instruction');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(imageUrl);
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

      let editedImageBase64: string;

      const hasGeminiKey = import.meta.env.VITE_GEMINI_API_KEY;

      try {
        if (hasGeminiKey) {
          editedImageBase64 = await editWithGemini(base64, mimeType, promptToUse);
        } else {
          throw new Error('Gemini not configured');
        }
      } catch (geminiError: any) {
        console.log('Gemini failed, trying OpenAI...', geminiError);

        if (geminiError.message?.includes('not configured') ||
            geminiError.message?.includes('not found') ||
            geminiError.message?.includes('404') ||
            geminiError.message?.includes('pas disponible')) {
          throw new Error('L\'édition d\'images IA n\'est actuellement pas disponible. Gemini ne supporte pas encore cette fonctionnalité de manière stable. Utilisez des outils externes comme remove.bg ou Canva pour éditer vos images.');
        }

        throw geminiError;
      }

      const editedImageDataUrl = `data:${mimeType};base64,${editedImageBase64}`;
      onImageEdited(editedImageDataUrl);

      setInstruction('');
      onClose();
    } catch (err) {
      console.error('Error editing image:', err);

      let errorMessage = 'Erreur lors de l\'édition de l\'image';

      if (err instanceof Error) {
        if (err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED')) {
          errorMessage = 'Quota Gemini dépassé. Le modèle de génération d\'images Gemini nécessite un compte avec facturation activée. Veuillez activer la facturation sur console.cloud.google.com ou utiliser une clé API avec crédit disponible.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Édition d'image IA</h2>
              <p className="text-sm text-slate-500">Propulsé par Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden relative">
            <img
              src={imageUrl}
              alt="Image à éditer"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>IA Gemini</span>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              AI Magic Editor
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <button
                onClick={() => handleEdit(SMART_BACKGROUND_PROMPT)}
                disabled={processing}
                className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <Palette size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-700 text-center">Smart Bg</span>
              </button>

              <button
                onClick={() => handleEdit(ACTION_PROMPTS.PLACE)}
                disabled={processing}
                className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
              >
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <Store size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Place</span>
              </button>

              <button
                onClick={() => handleEdit(ACTION_PROMPTS.TRY_ON)}
                disabled={processing}
                className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
              >
                <div className="p-2 bg-pink-50 text-pink-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <User size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Try-On</span>
              </button>

              <button
                onClick={() => handleEdit(ACTION_PROMPTS.FOLD)}
                disabled={processing}
                className="flex flex-col items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
              >
                <div className="p-2 bg-violet-50 text-violet-600 rounded-lg group-hover:scale-110 transition-transform duration-200">
                  <Shirt size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-700">Fold</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-2 mb-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ou personnalisé</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Instruction personnalisée
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex: Ajoute un arrière-plan avec des plantes..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={processing}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={processing}
              className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={handleEdit}
              disabled={processing || !instruction.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Édition en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Éditer avec Gemini</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Studio Photo IA - Gemini 2.5 Flash Image</p>
                <p className="text-blue-800 leading-relaxed">
                  Décrivez les modifications que vous souhaitez. Gemini peut remplacer l'arrière-plan
                  (fond blanc studio, béton gris, bois clair), améliorer la luminosité, centrer le produit,
                  ou placer le vêtement à plat. L'IA préserve l'aspect original du produit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
