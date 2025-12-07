import { useState } from 'react';
import { Sparkles, Wand2, X } from 'lucide-react';
import { editProductImage } from '../lib/geminiService';

interface ImageEditorProps {
  imageUrl: string;
  onImageEdited: (newImageDataUrl: string) => void;
  onClose: () => void;
}

export function ImageEditor({ imageUrl, onImageEdited, onClose }: ImageEditorProps) {
  const [instruction, setInstruction] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!instruction.trim()) {
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

      const editedImageBase64 = await editProductImage(base64, mimeType, instruction);

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

  const quickInstructions = [
    'Remplace l\'arrière-plan par un fond blanc studio',
    'Remplace l\'arrière-plan par un fond béton gris moderne',
    'Remplace l\'arrière-plan par un fond bois clair naturel',
    'Améliore la luminosité et rends les couleurs plus vives',
    'Centre le produit et améliore la composition',
    'Place le vêtement à plat sur une surface neutre',
  ];

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
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Instruction d'édition
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ex: Supprime l'arrière-plan et rends-le blanc"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={processing}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              Instructions rapides
            </p>
            <div className="flex flex-wrap gap-2">
              {quickInstructions.map((quick, index) => (
                <button
                  key={index}
                  onClick={() => setInstruction(quick)}
                  disabled={processing}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {quick}
                </button>
              ))}
            </div>
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
