import React, { useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';

/**
 * T18 — VisitRegistrationModal
 * Opens after a "visita" appointment is marked as "concluído".
 * Collects: feedback, objection, next step, and optional notes.
 * Cannot be dismissed without filling feedback + next step.
 */

const FEEDBACK_OPTIONS = [
  { value: 'Sim', emoji: '😊', label: 'Sim' },
  { value: 'Parcial', emoji: '😐', label: 'Parcial' },
  { value: 'Não', emoji: '😞', label: 'Não' },
];

const OBJECTION_OPTIONS = [
  { value: 'preco', label: 'Preço' },
  { value: 'localizacao', label: 'Localização' },
  { value: 'tamanho', label: 'Tamanho' },
  { value: 'documentacao', label: 'Documentação' },
  { value: 'nenhuma', label: 'Nenhuma' },
  { value: 'outro', label: 'Outra' },
];

const NEXT_STEP_OPTIONS = [
  { value: 'proposta', label: '📋 Enviar proposta', color: 'text-emerald-700' },
  { value: 'outra_visita', label: '🏠 Agendar outra visita', color: 'text-blue-700' },
  { value: 'pensar', label: '🤔 Lead vai pensar', color: 'text-amber-700' },
  { value: 'desistiu', label: '👋 Desistiu', color: 'text-red-700' },
];

function OptionButton({ selected, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        min-h-[48px] px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all
        active:scale-95 touch-manipulation text-center leading-tight
        ${selected
          ? 'border-[#C4A265] bg-[#C4A265] text-white shadow-sm'
          : 'border-[#E8E2D8] bg-white text-[#1B2B3A] hover:border-[#C4A265]/50 hover:bg-[#FAF8F5]'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default function VisitRegistrationModal({ appointment, onSave, onCancel }) {
  const [feedback, setFeedback] = useState(null);
  const [objection, setObjection] = useState(null);
  const [nextStep, setNextStep] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = feedback && nextStep;

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError('Por favor, preencha pelo menos o feedback e o próximo passo.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({ feedback, objection: objection || 'nenhuma', nextStep, notes });
    } catch (e) {
      console.error(e);
      setError('Erro ao salvar. Tente novamente.');
      setSaving(false);
    }
  };

  const leadName = appointment.lead_name || 'Lead';
  const propertyTitle = appointment.property_title || appointment.title || 'Visita';

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
      <div
        className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[95vh] overflow-y-auto custom-scrollbar animate-slide-up md:animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[#E8E2D8] bg-[#FAF8F5] sticky top-0 z-10 md:rounded-t-2xl rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2B3A] rounded-xl flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-[#C4A265]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold font-serif text-[#1B2B3A] leading-tight">
                📋 Registro da visita
              </h2>
              <p className="text-xs text-[#8A8A8A] truncate">
                {leadName} — {propertyTitle}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-5 space-y-5">

          {/* 1. Feedback */}
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2.5">
              O lead gostou? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {FEEDBACK_OPTIONS.map(opt => (
                <OptionButton
                  key={opt.value}
                  selected={feedback === opt.value}
                  onClick={() => setFeedback(opt.value)}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span className="text-xs">{opt.label}</span>
                </OptionButton>
              ))}
            </div>
          </div>

          {/* 2. Objection */}
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2.5">
              Principal objeção?
              <span className="text-[#8A8A8A] font-normal text-xs ml-1">(opcional)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {OBJECTION_OPTIONS.map(opt => (
                <OptionButton
                  key={opt.value}
                  selected={objection === opt.value}
                  onClick={() => setObjection(prev => prev === opt.value ? null : opt.value)}
                >
                  {opt.label}
                </OptionButton>
              ))}
            </div>
          </div>

          {/* 3. Next Step */}
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2.5">
              Próximo passo? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {NEXT_STEP_OPTIONS.map(opt => (
                <OptionButton
                  key={opt.value}
                  selected={nextStep === opt.value}
                  onClick={() => setNextStep(opt.value)}
                  className={`text-left px-4 ${nextStep === opt.value ? '' : opt.color}`}
                >
                  {opt.label}
                </OptionButton>
              ))}
            </div>
          </div>

          {/* 4. Notes */}
          <div>
            <label className="block text-sm font-semibold text-[#1B2B3A] mb-2">
              Observações
              <span className="text-[#8A8A8A] font-normal text-xs ml-1">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Gostou do imóvel, mas quer comparar com outro..."
              rows={2}
              className="w-full p-3 rounded-xl border border-[#E8E2D8] focus:border-[#C4A265] outline-none resize-none text-sm bg-[#FAF8F5] focus:bg-white transition-colors placeholder:text-[#C0B9AE]"
            />
          </div>

          {/* Validation error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canSubmit}
            className={`
              w-full min-h-[52px] rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
              ${canSubmit && !saving
                ? 'bg-[#1B2B3A] text-white hover:bg-[#263f55] active:scale-[0.98] shadow-lg'
                : 'bg-[#E8E2D8] text-[#8A8A8A] cursor-not-allowed'
              }
            `}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <ClipboardList className="w-4 h-4" />
                Salvar registro
              </>
            )}
          </button>

          {/* Required note */}
          <p className="text-center text-[10px] text-[#8A8A8A]">
            * Campos obrigatórios. Preencha para registrar a visita.
          </p>
        </div>
      </div>
    </div>
  );
}
