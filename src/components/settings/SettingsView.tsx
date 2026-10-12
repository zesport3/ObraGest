import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Upload,
  CheckCircle2,
  Percent,
  FileText,
  CreditCard,
  HardHat,
  RefreshCw,
  Image as ImageIcon,
  Download,
  Database,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { RestoreBackupModal } from '../common/RestoreBackupModal';

export const SettingsView: React.FC = () => {
  const { companySettings, updateCompanySettings, exportBackup } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const [form, setForm] = useState(companySettings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  // Keep form in sync if companySettings change or load
  React.useEffect(() => {
    setForm(companySettings);
  }, [companySettings]);

  const handleDownloadBackup = () => {
    exportBackup();
    setBackupSuccess('Cópia de segurança descarregada com sucesso para o seu dispositivo!');
    setTimeout(() => setBackupSuccess(null), 4000);
  };

  const handleChange = (field: keyof typeof companySettings, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSavedSuccess(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith('image/')) {
        setLogoError('Por favor selecione um ficheiro de imagem válido (PNG, JPG, SVG ou WEBP).');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setLogoError('A imagem excede 2 MB. Por favor selecione uma imagem mais leve para garantir o bom funcionamento do armazenamento local.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          handleChange('logoUrl', reader.result as string);
        }
      };
      reader.onerror = () => {
        setLogoError('Ocorreu um erro ao carregar o ficheiro de imagem.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateCompanySettings(form);
    setSavedSuccess(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Top Header with prominent Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Configurações da Empresa</h2>
          <p className="text-xs text-slate-500">Identificação, logótipo, contactos e cópia de segurança</p>
        </div>
        <button
          type="button"
          onClick={() => handleSubmit()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Guardar Configurações</span>
        </button>
      </div>

      {/* Feedback banner */}
      {savedSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Configurações guardadas com sucesso! Todos os orçamentos e cabeçalhos foram atualizados.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity & Fiscal Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Identificação & Dados Fiscais da Empresa</h3>
              <p className="text-xs text-slate-500">
                Estes dados figuram no cabeçalho legal dos orçamentos e documentos emitidos
              </p>
            </div>
          </div>

          {/* Logo upload block */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Logótipo"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <HardHat className="h-10 w-10 text-amber-500" />
              )}
            </div>

            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold text-slate-800">Logótipo da Empresa</h4>
              <p className="text-[11px] text-slate-500">
                Formatos recomendados: PNG ou JPG com fundo transparente. Apresentado em orçamentos e relatórios.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Carregar Imagem
                </button>
                {form.logoUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange('logoUrl', '')}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 cursor-pointer"
                  >
                    Remover
                  </button>
                )}
              </div>
              {logoError && (
                <p className="text-xs text-rose-600 font-medium pt-1">{logoError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Denominação Social (Firma)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="ex: Construções & Obras Lda."
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Nome Comercial / Marca</label>
              <input
                type="text"
                value={form.commercialName}
                onChange={(e) => handleChange('commercialName', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">NIF / NIPC</label>
              <input
                type="text"
                value={form.nif}
                onChange={(e) => handleChange('nif', e.target.value)}
                placeholder="ex: 509123456"
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block">Morada da Sede / Armazém</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="ex: Zona Industrial Lote 14"
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Código Postal</label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Localidade / Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Telefone Fixo</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Telemóvel</label>
              <input
                type="text"
                value={form.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Email Geral</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block">Alvará / Outros Registos Oficiais</label>
            <input
              type="text"
              value={form.otherContacts}
              onChange={(e) => handleChange('otherContacts', e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800"
              placeholder="ex: Alvará IMPIC N.º 78942-PAR"
            />
          </div>
        </div>

        {/* Submit bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-pulse">
              <CheckCircle2 className="h-4 w-4" />
              Guardado com sucesso!
            </span>
          )}
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Guardar Configurações</span>
          </button>
        </div>
      </form>

      {/* Backup & Restore Center */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cópia de Segurança dos Dados (Backup)</h3>
            <p className="text-xs text-slate-500">
              Guarde uma cópia de segurança completa no seu computador ou restaure dados guardados
            </p>
          </div>
        </div>

        {backupSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{backupSuccess}</span>
          </div>
        )}

        {backupError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2 shadow-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{backupError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Download Backup */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors"
          >
            <Download className="h-4 w-4 text-amber-400" />
            <span>Descarregar Cópia de Segurança (.json)</span>
          </button>

          {/* Trigger Restore Modal */}
          <button
            type="button"
            onClick={() => setIsRestoreModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="h-4 w-4 text-slate-500" />
            <span>Restaurar a partir de Ficheiro</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          O ficheiro descarregado inclui todas as faturas, inventário, orçamentos, obras, despesas e dados da empresa num formato seguro.
        </p>

        {/* Security & Local Storage Disclosure */}
        <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Segurança e Privacidade dos Dados (Armazenamento Local)</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Esta aplicação funciona no seu navegador de forma privada e segura. Os dados são mantidos
            exclusivamente no armazenamento local deste dispositivo (localStorage), não sendo transmitidos nem expostos
            em servidores externos.
          </p>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
            ⚠️ <strong>Aviso Importante:</strong> A publicação no GitHub Pages fornece o alojamento estático da aplicação,
            mas não constitui uma base de dados na nuvem. Os dados não são sincronizados automaticamente entre diferentes
            dispositivos e podem ser perdidos se limpar a cache/histórico do navegador. Descarregue cópias de segurança (.json) regulares.
          </p>
        </div>
      </div>

      {/* Restore Backup Modal */}
      <RestoreBackupModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
      />
    </div>
  );
};
