import React, { useRef, useState } from 'react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';
import {
  Upload,
  FileCheck,
  AlertCircle,
  CheckCircle,
  Database,
  ArrowRight,
  FolderOpen,
} from 'lucide-react';

interface RestoreBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RestoreBackupModal: React.FC<RestoreBackupModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { importBackup } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    appName?: string;
    version?: number;
    exportedAt?: string;
    worksCount?: number;
    invoicesCount?: number;
    workersCount?: number;
    proposalsCount?: number;
  } | null>(null);

  const [status, setStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const resetState = () => {
    setSelectedFile(null);
    setFileContent(null);
    setPreviewInfo(null);
    setStatus({ type: 'idle' });
  };

  const handleSelectFile = (file: File) => {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.json')) {
      setStatus({
        type: 'error',
        message: 'Apenas são aceites ficheiros de cópia de segurança no formato .json.',
      });
      return;
    }

    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setStatus({
        type: 'error',
        message: 'O ficheiro selecionado é demasiado grande (limite de 15 MB).',
      });
      return;
    }

    setSelectedFile(file);
    setStatus({ type: 'idle' });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setFileContent(text);
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          setPreviewInfo({
            appName: parsed.appName || 'Obragest',
            version: parsed.version,
            exportedAt: parsed.exportedAt,
            worksCount: Array.isArray(parsed.works) ? parsed.works.length : 0,
            invoicesCount: Array.isArray(parsed.invoices) ? parsed.invoices.length : 0,
            workersCount: Array.isArray(parsed.workers) ? parsed.workers.length : 0,
            proposalsCount: Array.isArray(parsed.proposals) ? parsed.proposals.length : 0,
          });
        }
      } catch {
        setStatus({
          type: 'error',
          message: 'O ficheiro selecionado não é um ficheiro JSON válido ou está corrompido.',
        });
      }
    };
    reader.onerror = () => {
      setStatus({
        type: 'error',
        message: 'Erro ao ler o ficheiro no computador.',
      });
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!fileContent) return;

    const res = importBackup(fileContent);
    if (res.success) {
      setStatus({
        type: 'success',
        message: 'Cópia de segurança reposta com sucesso! A carregar os dados...',
      });
      setTimeout(() => {
        resetState();
        onClose();
        window.location.reload();
      }, 1500);
    } else {
      setStatus({
        type: 'error',
        message: res.error || 'Erro ao restaurar a cópia de segurança.',
      });
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Repor Cópia de Segurança"
      subtitle="Escolha o ficheiro (.json) guardado anteriormente para restaurar todos os dados"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* File chooser dropzone / input */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleSelectFile(f);
            }}
            className="border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50/70 rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 border border-amber-200 shadow-xs">
              <FolderOpen className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900">
                Escolha o ficheiro de cópia de segurança (.json)
              </h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Clique no botão abaixo para abrir a janela do seu computador e selecionar o ficheiro guardado anteriormente, ou arraste o ficheiro para aqui.
              </p>
            </div>

            {/* Native styled file input button */}
            <label
              htmlFor="backup-file-upload-input"
              className="mt-2 inline-flex items-center gap-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white px-6 py-3 text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Upload className="h-4 w-4 text-amber-400" />
              <span>Procurar e Abrir Ficheiro (.json)</span>
              <input
                id="backup-file-upload-input"
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleSelectFile(f);
                  e.target.value = '';
                }}
              />
            </label>

            <span className="text-[11px] text-slate-400">
              Formato aceite: ficheiros de texto JSON exportados da aplicação
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileCheck className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Ficheiro Selecionado
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 break-all mt-1">
                    {selectedFile.name}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Tamanho: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <label
                htmlFor="backup-file-upload-input-replace"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 hover:underline shrink-0 cursor-pointer pt-1"
              >
                Trocar Ficheiro
                <input
                  id="backup-file-upload-input-replace"
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectFile(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {/* Preview of data inside backup */}
            {previewInfo && (
              <div className="pt-2 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Obras
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {previewInfo.worksCount}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Faturas
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {previewInfo.invoicesCount}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Orçamentos
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {previewInfo.proposalsCount}
                  </span>
                </div>
                <div className="bg-white rounded-lg p-2 border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">
                    Equipa
                  </span>
                  <span className="font-extrabold text-slate-800">
                    {previewInfo.workersCount}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning info */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <Database className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Atenção:</strong> Ao repor uma cópia de segurança, todas as informações existentes na aplicação serão atualizadas e substituídas pelo conteúdo do ficheiro selecionado.
          </p>
        </div>

        {/* Status feedback */}
        {status.type === 'error' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        {status.type === 'success' && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{status.message}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedFile || !fileContent || status.type === 'success'}
            onClick={handleConfirmRestore}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-bold text-slate-950 shadow-xs transition-colors"
          >
            <span>Confirmar e Repor Dados</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
