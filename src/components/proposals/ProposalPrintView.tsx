import React, { useRef, useState } from 'react';
import { Proposal } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Printer, ArrowLeft, HardHat, Download, Loader2, Edit2 } from 'lucide-react';
import { downloadElementAsPdf, generateProposalDirectPdf } from '../../utils/pdfGenerator';
import { ProposalEditorModal } from './ProposalEditorModal';

interface ProposalPrintViewProps {
  proposal: Proposal;
  onBack: () => void;
}

export const ProposalPrintView: React.FC<ProposalPrintViewProps> = ({
  proposal: initialProposal,
  onBack,
}) => {
  const { companySettings, proposals } = useApp();
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Keep live reference to proposal in case of edits
  const proposal = proposals.find((p) => p.id === initialProposal.id) || initialProposal;

  const handleDownloadPdf = async () => {
    const filename = `Orcamento_${proposal.number.replace(/[\/\\]/g, '_')}.pdf`;
    setIsGeneratingPdf(true);
    try {
      let success = false;
      if (documentRef.current) {
        try {
          success = await downloadElementAsPdf(documentRef.current, filename, setIsGeneratingPdf);
        } catch (canvasErr) {
          console.warn('Canvas export failed, falling back to direct PDF:', canvasErr);
        }
      }
      if (!success) {
        generateProposalDirectPdf(proposal, companySettings, filename);
      }
    } catch (err) {
      console.error('Erro ao descarregar documento PDF:', err);
      generateProposalDirectPdf(proposal, companySettings, filename);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  const vatRateUsed =
    proposal.items?.[0]?.vatRate !== undefined
      ? proposal.items[0].vatRate
      : companySettings.defaultVatRate || 23;

  return (
    <div className="space-y-6">
      {/* Top action bar (hidden on print) */}
      <div className="flex items-center justify-between print:hidden rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Orçamentos
        </button>

        <div className="flex items-center gap-2">
          {/* Editar Orçamento em caso de engano */}
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-colors cursor-pointer"
            title="Editar este orçamento para corrigir qualquer engano ou alteração"
          >
            <Edit2 className="h-4 w-4 text-amber-600" />
            <span>Editar Orçamento</span>
          </button>

          {/* Transferir PDF para o computador */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Transferir ficheiro PDF diretamente para o computador"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <Download className="h-4 w-4 text-slate-950" />
            )}
            <span>{isGeneratingPdf ? 'A Transferir...' : 'Transferir PDF'}</span>
          </button>

          {/* Imprimir / Pré-visualizar no navegador */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            title="Imprimir ou gerar PDF através do navegador"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Document Sheet (Styled for Screen and A4 Print) */}
      <div
        ref={documentRef}
        id="proposal-document"
        className="mx-auto max-w-4xl bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-200 print:border-none print:shadow-none print:p-8 print:m-0 print:max-w-none text-slate-900"
      >
        {/* 1. Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b-2 border-slate-900 pb-6">
          {/* Company Brand & Details (Nome da empresa por baixo do logótipo) */}
          <div className="space-y-3 max-w-lg">
            {/* Logótipo em cima */}
            {companySettings.logoUrl ? (
              <div className="pb-1">
                <img
                  src={companySettings.logoUrl}
                  alt="Logo"
                  className="h-32 sm:h-40 w-auto max-h-44 max-w-[340px] object-contain shrink-0"
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0 mb-1">
                <HardHat className="h-11 w-11" />
              </div>
            )}

            {/* Nome da empresa por baixo do logótipo */}
            <div>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                {companySettings.name || 'Empresa de Construção'}
              </h1>
              {companySettings.commercialName && (
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mt-0.5">
                  {companySettings.commercialName}
                </p>
              )}
            </div>

            <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
              <p>
                {companySettings.address}
                {companySettings.postalCode ? `, ${companySettings.postalCode}` : ''}{' '}
                {companySettings.city}
              </p>
              {companySettings.nif && (
                <p>
                  NIF:{' '}
                  <strong className="text-slate-900 font-mono">
                    {companySettings.nif}
                  </strong>
                </p>
              )}
              <p>
                {companySettings.phone || companySettings.mobile ? (
                  <span>
                    Tel: {companySettings.phone || companySettings.mobile}{' '}
                  </span>
                ) : null}
                {companySettings.email && <span>• Email: {companySettings.email}</span>}
              </p>
              {companySettings.website && <p>{companySettings.website}</p>}
              {companySettings.otherContacts && (
                <p className="text-[11px] text-slate-500 font-medium">
                  {companySettings.otherContacts}
                </p>
              )}
            </div>
          </div>

          {/* Proposal Identification (Sem Estado, Apenas Orçamento) */}
          <div className="text-left sm:text-right space-y-1">
            <div className="inline-block bg-slate-950 text-white px-5 py-2 rounded-xl text-[13px] font-black tracking-wider uppercase mb-1 shadow-xs">
              Orçamento
            </div>
            <div className="text-[20px] font-black font-mono text-slate-950">
              {proposal.number}
            </div>
            <div className="text-xs text-slate-600">
              Data de Emissão:{' '}
              <strong className="text-slate-900">
                {formatDate(proposal.date)}
              </strong>
            </div>
            <div className="text-xs text-slate-600">
              Validade da Proposta:{' '}
              <strong className="text-slate-900">
                {formatDate(proposal.validUntil)}
              </strong>
            </div>
          </div>
        </div>

        {/* 2. Informações do Cliente */}
        <div className="my-6">
          <div className="rounded-xl border border-slate-300 bg-slate-50/80 p-5 space-y-1.5 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Exmo.(a) Senhor(a) / Cliente:
            </span>
            <p className="text-base font-black text-slate-950">{proposal.clientName}</p>
            {proposal.clientNif && (
              <p className="text-slate-700 font-mono">
                NIF: <strong>{proposal.clientNif}</strong>
              </p>
            )}
            {proposal.clientAddress && (
              <p className="text-slate-700">Morada: {proposal.clientAddress}</p>
            )}
            {(proposal.clientPhone || proposal.clientEmail) && (
              <p className="text-slate-600">
                {proposal.clientPhone && <span>Tel: {proposal.clientPhone} </span>}
                {proposal.clientEmail && <span>• Email: {proposal.clientEmail}</span>}
              </p>
            )}
          </div>
        </div>

        {/* 3. Por baixo das informações do cliente seguido um quadro com a descrição escrita ao criar o orçamento (Sem título) */}
        <div className="my-6">
          <div className="rounded-xl border-2 border-slate-300 overflow-hidden bg-white shadow-2xs">
            <div className="p-6 text-xs text-slate-900 leading-relaxed whitespace-pre-wrap font-normal">
              {proposal.description || 'Execução dos trabalhos orçamentados conforme instruções.'}
            </div>
          </div>
        </div>

        {/* 4. Por baixo: Condições de Pagamento */}
        <div className="my-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-800 space-y-2">
          <strong className="text-slate-950 block font-bold uppercase tracking-wider text-[11px]">
            Condições de Pagamento:
          </strong>
          <div className="font-medium whitespace-pre-wrap leading-relaxed text-slate-700">
            {proposal.paymentTerms ||
              companySettings.defaultPaymentTerms ||
              'A combinar entre as partes / Conforme autos de medição da obra.'}
          </div>

          {companySettings.defaultProposalText && (
            <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200">
              {companySettings.defaultProposalText}
            </p>
          )}

          {companySettings.defaultNotes && (
            <p className="text-[10px] text-slate-400">
              {companySettings.defaultNotes}
            </p>
          )}
        </div>

        {/* 5. No fim: Lado direito descriminação dos valores (Sem 'pela empresa' e sem assinatura/carimbo) */}
        <div className="mt-10 pt-6 border-t-2 border-slate-900 flex justify-end">
          {/* LADO DIREITO: Descriminação dos Valores */}
          <div className="w-full sm:w-80 space-y-2 text-xs bg-slate-50/90 rounded-xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Valor Base:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(proposal.subtotal)}
              </span>
            </div>

            {proposal.discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Desconto Comercial:</span>
                <span className="font-mono font-medium">
                  -{formatCurrency(proposal.discountTotal)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span className="font-medium">IVA ({vatRateUsed}%):</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(proposal.vatTotal)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-black text-slate-950 pt-3 border-t-2 border-slate-900">
              <span>VALOR TOTAL:</span>
              <span className="font-mono text-base text-slate-950">
                {formatCurrency(proposal.total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Modal for in-place corrections */}
      <ProposalEditorModal
        proposal={proposal}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};
