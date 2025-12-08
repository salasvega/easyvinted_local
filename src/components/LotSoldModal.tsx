import { useState, FormEvent } from 'react';
import { Modal } from './ui/Modal';

interface LotSoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (salePrice: number, saleDate: string) => void;
  lotName: string;
  lotPrice: number;
}

export function LotSoldModal({ isOpen, onClose, onConfirm, lotName, lotPrice }: LotSoldModalProps) {
  const [salePrice, setSalePrice] = useState(lotPrice);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(salePrice, saleDate);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Marquer comme vendu">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Lot: <span className="font-medium text-gray-900">{lotName}</span>
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prix de vente final (€)
            </label>
            <input
              type="number"
              required
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(parseFloat(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de vente
            </label>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Prix initial:</span>
            <span className="font-medium">{lotPrice.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Prix de vente:</span>
            <span className="font-medium">{salePrice.toFixed(2)}€</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium shadow-sm"
          >
            Confirmer
          </button>
        </div>
      </form>
    </Modal>
  );
}
