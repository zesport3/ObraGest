import * as htmlToImage from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Proposal, CompanySettings, Material } from '../types';
import { formatCurrency, formatDate } from './formatters';

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 2000);
}

export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  onProgress?: (loading: boolean) => void
): Promise<boolean> {
  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    if (onProgress) onProgress(true);

    let imgData: string | null = null;

    // 1. Primary method: html-to-image (Uses native browser SVG foreignObject rendering,
    //    100% compatible with Tailwind CSS v4, oklch colors, exact fonts, borders, and margins)
    try {
      imgData = await htmlToImage.toPng(element, {
        quality: 1,
        pixelRatio: 2, // 2x for crisp 300DPI print quality
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          boxShadow: 'none',
          border: 'none',
          borderRadius: '0px',
          margin: '0',
        },
      });
    } catch (toImageErr) {
      console.warn('html-to-image capture failed, trying html2canvas fallback:', toImageErr);
      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
        });
        imgData = canvas.toDataURL('image/png');
      } catch (canvasErr) {
        console.error('Canvas capture failed:', canvasErr);
      }
    }

    if (!imgData) {
      return false;
    }

    // Create PDF in A4 format (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const imgProps = pdf.getImageProperties(imgData);
    const contentRatio = imgProps.height / imgProps.width;

    // 6mm page margins for balanced framing
    const marginX = 6;
    const marginY = 6;
    const availableWidth = pdfWidth - marginX * 2; // 198mm
    const availableHeight = pdfHeight - marginY * 2; // 285mm

    let renderWidth = availableWidth;
    let renderHeight = availableWidth * contentRatio;

    // Smart single-page fit: if within 1.25x the available height,
    // scale to fit cleanly on one single A4 page with no awkward cutoff
    if (renderHeight <= availableHeight) {
      pdf.addImage(imgData, 'PNG', marginX, marginY, renderWidth, renderHeight, undefined, 'FAST');
    } else if (renderHeight <= availableHeight * 1.25) {
      const scale = availableHeight / renderHeight;
      const scaledWidth = renderWidth * scale;
      const scaledHeight = availableHeight;
      const offsetX = marginX + (availableWidth - scaledWidth) / 2;
      pdf.addImage(imgData, 'PNG', offsetX, marginY, scaledWidth, scaledHeight, undefined, 'FAST');
    } else {
      // Truly multi-page document
      let heightLeft = renderHeight;
      let position = marginY;

      pdf.addImage(imgData, 'PNG', marginX, position, renderWidth, renderHeight, undefined, 'FAST');
      heightLeft -= availableHeight;

      while (heightLeft > 0) {
        position = marginY - (renderHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginX, position, renderWidth, renderHeight, undefined, 'FAST');
        heightLeft -= availableHeight;
      }
    }

    try {
      const blob = pdf.output('blob');
      triggerBlobDownload(blob, cleanFilename);
    } catch {
      pdf.save(cleanFilename);
    }

    return true;
  } catch (error) {
    console.error('Erro ao gerar ficheiro PDF:', error);
    return false;
  } finally {
    if (onProgress) onProgress(false);
  }
}

/**
 * Direct native jsPDF generator for Proposal (100% identical to on-screen proposal layout)
 */
export function generateProposalDirectPdf(
  proposal: Proposal,
  companySettings: CompanySettings,
  filename?: string
): void {
  const cleanFilename = (filename || `Orcamento_${proposal.number.replace(/[\/\\]/g, '_')}.pdf`)
    .toLowerCase()
    .endsWith('.pdf')
    ? (filename || `Orcamento_${proposal.number.replace(/[\/\\]/g, '_')}.pdf`)
    : `${filename || `Orcamento_${proposal.number.replace(/[\/\\]/g, '_')}`}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2; // 174mm
  let y = 16;

  // 1. Logo (placed at top-left, matching on-screen design)
  if (companySettings.logoUrl && (companySettings.logoUrl.startsWith('data:image/') || companySettings.logoUrl.startsWith('blob:'))) {
    try {
      const format = companySettings.logoUrl.includes('png') ? 'PNG' : 'JPEG';
      doc.addImage(companySettings.logoUrl, format, marginX, y, 46, 22, undefined, 'FAST');
      y += 24;
    } catch {
      // Continue without crashing
    }
  }

  // Company Name directly under logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-950
  doc.text(companySettings.name || 'Empresa de Construção', marginX, y);
  y += 5.2;

  if (companySettings.commercialName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(companySettings.commercialName.toUpperCase(), marginX, y);
    y += 4.5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600

  if (companySettings.address || companySettings.city) {
    const fullAddr = [
      companySettings.address,
      companySettings.postalCode ? `, ${companySettings.postalCode}` : '',
      companySettings.city,
    ].filter(Boolean).join(' ');
    doc.text(fullAddr, marginX, y);
    y += 4;
  }
  if (companySettings.nif) {
    doc.text(`NIF: ${companySettings.nif}`, marginX, y);
    y += 4;
  }
  const contactLine = [
    companySettings.phone || companySettings.mobile ? `Tel: ${companySettings.phone || companySettings.mobile}` : '',
    companySettings.email ? `Email: ${companySettings.email}` : '',
  ].filter(Boolean).join('  •  ');
  if (contactLine) {
    doc.text(contactLine, marginX, y);
    y += 4;
  }
  if (companySettings.website) {
    doc.text(companySettings.website, marginX, y);
    y += 4;
  }
  if (companySettings.otherContacts) {
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(companySettings.otherContacts, marginX, y);
    y += 4;
  }

  // Right-aligned Proposal Title Badge & Details
  // ORÇAMENTO badge in black
  doc.setFillColor(15, 23, 42); // slate-950
  doc.roundedRect(pageWidth - 62, 16, 44, 9, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('ORÇAMENTO', pageWidth - 40, 22.2, { align: 'center' });

  // Proposal Number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(proposal.number, pageWidth - marginX, 32, { align: 'right' });

  // Dates
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Data de Emissão: ${formatDate(proposal.date)}`, pageWidth - marginX, 38, { align: 'right' });
  doc.text(`Validade da Proposta: ${formatDate(proposal.validUntil)}`, pageWidth - marginX, 43, { align: 'right' });

  // Divider line: border-b-2 border-slate-900
  y = Math.max(y + 2, 48);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // 2. Informações do Cliente (Client Box)
  const clientLines: string[] = [];
  if (proposal.clientNif) clientLines.push(`NIF: ${proposal.clientNif}`);
  if (proposal.clientAddress) clientLines.push(`Morada: ${proposal.clientAddress}`);
  const clientContact = [
    proposal.clientPhone ? `Tel: ${proposal.clientPhone}` : '',
    proposal.clientEmail ? `Email: ${proposal.clientEmail}` : '',
  ].filter(Boolean).join('  •  ');
  if (clientContact) clientLines.push(clientContact);

  const clientBoxHeight = 17 + clientLines.length * 4.2;

  doc.setFillColor(248, 250, 252); // slate-50/80
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentWidth, clientBoxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('EXMO.(A) SENHOR(A) / CLIENTE:', marginX + 5, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(proposal.clientName, marginX + 5, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let detailY = y + 16;
  clientLines.forEach((line) => {
    doc.text(line, marginX + 5, detailY);
    detailY += 4.2;
  });

  y += clientBoxHeight + 6;

  // 3. Quadro com a descrição escrita ao criar o orçamento (Sem título, sem tabela de artigos)
  const descText = proposal.description || 'Execução dos trabalhos orçamentados conforme instruções.';
  const descLines = doc.splitTextToSize(descText, contentWidth - 12);
  const descBoxHeight = Math.max(16, descLines.length * 4.4 + 9);

  if (y + descBoxHeight > 265) {
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // border-slate-300
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, y, contentWidth, descBoxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(descLines, marginX + 5, y + 6.5);

  y += descBoxHeight + 6;

  // 4. Por baixo: Condições de Pagamento
  const paymentText =
    proposal.paymentTerms ||
    companySettings.defaultPaymentTerms ||
    'A combinar entre as partes / Conforme autos de medição da obra.';
  const paymentLines = doc.splitTextToSize(paymentText, contentWidth - 12);

  const defaultProposalTextLines = companySettings.defaultProposalText
    ? doc.splitTextToSize(companySettings.defaultProposalText, contentWidth - 12)
    : [];
  const defaultNotesLines = companySettings.defaultNotes
    ? doc.splitTextToSize(companySettings.defaultNotes, contentWidth - 12)
    : [];

  let extraTermsHeight = 0;
  if (defaultProposalTextLines.length > 0) extraTermsHeight += defaultProposalTextLines.length * 3.8 + 4;
  if (defaultNotesLines.length > 0) extraTermsHeight += defaultNotesLines.length * 3.5 + 3;

  const paymentBoxHeight = Math.max(16, 9 + paymentLines.length * 4.2 + extraTermsHeight);

  if (y + paymentBoxHeight > 265) {
    doc.addPage();
    y = 18;
  }

  doc.setFillColor(248, 250, 252); // slate-50/60
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, y, contentWidth, paymentBoxHeight, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CONDIÇÕES DE PAGAMENTO:', marginX + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(paymentLines, marginX + 5, y + 11);

  let curTermsY = y + 11 + paymentLines.length * 4.2;

  if (defaultProposalTextLines.length > 0) {
    curTermsY += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX + 5, curTermsY, marginX + contentWidth - 5, curTermsY);
    curTermsY += 3.5;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(defaultProposalTextLines, marginX + 5, curTermsY);
    curTermsY += defaultProposalTextLines.length * 3.8;
  }

  if (defaultNotesLines.length > 0) {
    curTermsY += 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(defaultNotesLines, marginX + 5, curTermsY);
  }

  y += paymentBoxHeight + 8;

  // 5. No fim: Lado direito discriminação dos valores (Sem 'pela empresa' e sem assinatura/carimbo)
  if (y + 45 > 275) {
    doc.addPage();
    y = 18;
  }

  // Divider line across page: border-t-2 border-slate-900
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 6;

  // Totals box aligned to the right (width 78mm)
  const totalsBoxWidth = 78;
  const totalsBoxX = pageWidth - marginX - totalsBoxWidth;
  const vatRateUsed =
    proposal.items?.[0]?.vatRate !== undefined
      ? proposal.items[0].vatRate
      : companySettings.defaultVatRate || 23;

  const hasDiscount = proposal.discountTotal > 0;
  const totalsBoxHeight = hasDiscount ? 34 : 28;

  doc.setFillColor(248, 250, 252); // slate-50/90
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(totalsBoxX, y, totalsBoxWidth, totalsBoxHeight, 2.5, 2.5, 'FD');

  let curTy = y + 5.5;

  // Valor Base
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Valor Base:', totalsBoxX + 5, curTy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(proposal.subtotal), totalsBoxX + totalsBoxWidth - 5, curTy, { align: 'right' });

  if (hasDiscount) {
    curTy += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(225, 29, 72); // rose-600
    doc.text('Desconto Comercial:', totalsBoxX + 5, curTy);
    doc.text(`-${formatCurrency(proposal.discountTotal)}`, totalsBoxX + totalsBoxWidth - 5, curTy, { align: 'right' });
  }

  curTy += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`IVA (${vatRateUsed}%):`, totalsBoxX + 5, curTy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrency(proposal.vatTotal), totalsBoxX + totalsBoxWidth - 5, curTy, { align: 'right' });

  curTy += 3.5;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(totalsBoxX + 5, curTy, totalsBoxX + totalsBoxWidth - 5, curTy);

  curTy += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('VALOR TOTAL:', totalsBoxX + 5, curTy);
  doc.text(formatCurrency(proposal.total), totalsBoxX + totalsBoxWidth - 5, curTy, { align: 'right' });

  // Save PDF using Blob Trigger for 100% iframe/browser compatibility
  try {
    const blob = doc.output('blob');
    triggerBlobDownload(blob, cleanFilename);
  } catch (blobErr) {
    console.warn('Blob download error, trying direct doc.save:', blobErr);
    doc.save(cleanFilename);
  }
}

export interface InventorySnapshotItem {
  id: string;
  name: string;
  code?: string;
  unit: string;
  averagePrice: number;
  quantityAtDate: number;
  totalValueAtDate: number;
}

/**
 * Direct native jsPDF generator for Inventory Report
 */
export function generateInventoryReportDirectPdf(
  items: InventorySnapshotItem[],
  selectedDate: string,
  companySettings: CompanySettings,
  filename?: string
): void {
  const cleanFilename = (filename || `Relatorio_Inventario_${selectedDate}.pdf`)
    .toLowerCase()
    .endsWith('.pdf')
    ? (filename || `Relatorio_Inventario_${selectedDate}.pdf`)
    : `${filename || `Relatorio_Inventario_${selectedDate}`}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header: Company Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(companySettings.name || 'Empresa de Construção', 20, y);
  y += 6;

  if (companySettings.commercialName) {
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text(companySettings.commercialName.toUpperCase(), 20, y);
    y += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  if (companySettings.address) {
    doc.text(`${companySettings.address}, ${companySettings.postalCode || ''} ${companySettings.city || ''}`, 20, y);
    y += 4;
  }
  if (companySettings.nif) {
    doc.text(`NIF: ${companySettings.nif}`, 20, y);
    y += 4;
  }

  // Right-aligned Document Title & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('MAPA DE INVENTÁRIO', pageWidth - 20, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(217, 119, 6);
  doc.text(`Data do Inventário: ${formatDate(selectedDate)}`, pageWidth - 20, 26, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Emitido em: ${formatDate(new Date().toISOString().split('T')[0])}`, pageWidth - 20, 31, { align: 'right' });

  y = Math.max(y + 4, 38);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 7;

  // KPI Summary Bar
  const totalValuation = items.reduce((sum, item) => sum + item.totalValueAtDate, 0);
  const totalUnits = items.reduce((sum, item) => sum + item.quantityAtDate, 0);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y, pageWidth - 40, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Artigos: ${items.length}`, 26, y + 10);
  doc.text(`Unidades em Stock: ${totalUnits.toLocaleString('pt-PT')}`, 85, y + 10);
  doc.setTextColor(180, 83, 9);
  doc.text(`Valor Total do Stock: ${formatCurrency(totalValuation)}`, pageWidth - 26, y + 10, { align: 'right' });
  y += 23;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(20, y, pageWidth - 40, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('#', 23, y + 5);
  doc.text('Artigo / Material', 32, y + 5);
  doc.text('Unidade', 115, y + 5, { align: 'center' });
  doc.text('Preço Médio', 140, y + 5, { align: 'right' });
  doc.text('Quantidade', 165, y + 5, { align: 'right' });
  doc.text('Valor Total', pageWidth - 25, y + 5, { align: 'right' });
  y += 7.5;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  items.forEach((item, idx) => {
    // Check if new page needed
    if (y > 275) {
      doc.addPage();
      y = 20;
      doc.setFillColor(15, 23, 42);
      doc.rect(20, y, pageWidth - 40, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('#', 23, y + 5);
      doc.text('Artigo / Material', 32, y + 5);
      doc.text('Unidade', 115, y + 5, { align: 'center' });
      doc.text('Preço Médio', 140, y + 5, { align: 'right' });
      doc.text('Quantidade', 165, y + 5, { align: 'right' });
      doc.text('Valor Total', pageWidth - 25, y + 5, { align: 'right' });
      y += 7.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, y, pageWidth - 40, 6.5, 'F');
    }

    doc.setFontSize(7.5);
    doc.text(String(idx + 1), 23, y + 4.5);
    doc.text(item.name.substring(0, 42), 32, y + 4.5);
    doc.text(item.unit, 115, y + 4.5, { align: 'center' });
    doc.text(formatCurrency(item.averagePrice), 140, y + 4.5, { align: 'right' });
    doc.text(item.quantityAtDate.toLocaleString('pt-PT'), 165, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(item.totalValueAtDate), pageWidth - 25, y + 4.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 6.5;
  });

  // Bottom Total Line
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`VALOR TOTAL EM STOCK: ${formatCurrency(totalValuation)}`, pageWidth - 25, y, { align: 'right' });

  // Save PDF
  try {
    doc.save(cleanFilename);
  } catch {
    const blob = doc.output('blob');
    triggerBlobDownload(blob, cleanFilename);
  }
}

export interface AttendanceReportRow {
  name: string;
  category?: string;
  nif?: string;
  fullDays: number;
  halfDays: number;
  effectiveDays: number;
  absencesList: Array<{ date: string; reason: string }>;
  daysOff: number;
}

export function generateAttendanceReportDirectPdf(
  items: AttendanceReportRow[],
  monthLabel: string,
  monthString: string,
  companySettings: CompanySettings,
  filename?: string
): void {
  const cleanFilename = (filename || `Mapa_Presencas_${monthString}.pdf`)
    .toLowerCase()
    .endsWith('.pdf')
    ? (filename || `Mapa_Presencas_${monthString}.pdf`)
    : `${filename || `Mapa_Presencas_${monthString}`}.pdf`;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header: Company Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(companySettings.name || 'Empresa de Construção', 20, y);
  y += 6;

  if (companySettings.commercialName) {
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text(companySettings.commercialName.toUpperCase(), 20, y);
    y += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  if (companySettings.address) {
    doc.text(`${companySettings.address}, ${companySettings.postalCode || ''} ${companySettings.city || ''}`, 20, y);
    y += 4;
  }
  if (companySettings.nif) {
    doc.text(`NIF: ${companySettings.nif}`, 20, y);
    y += 4;
  }

  // Right-aligned Document Title & Date (Mapa de Presenças e Faltas - Sem valores nem assinaturas)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('MAPA MENSAL DE PRESENÇAS E FALTAS', pageWidth - 20, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setTextColor(217, 119, 6);
  doc.text(`Mês: ${monthLabel}`, pageWidth - 20, 26, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Emitido em: ${formatDate(new Date().toISOString().split('T')[0])}`, pageWidth - 20, 31, { align: 'right' });

  y = Math.max(y + 4, 38);
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 7;

  // KPI Summary Bar (Dias Trabalhados, Faltas, Folgas - ZERO VALORES)
  const totalDays = items.reduce((sum, item) => sum + item.effectiveDays, 0);
  const totalAbsences = items.reduce((sum, item) => sum + item.absencesList.length, 0);
  const totalDaysOff = items.reduce((sum, item) => sum + item.daysOff, 0);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, y, pageWidth - 40, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Funcionários: ${items.length}`, 26, y + 9);
  doc.text(`Total Dias Trabalhados: ${totalDays}`, 70, y + 9);
  doc.setTextColor(225, 29, 72);
  doc.text(`Total Faltas: ${totalAbsences}`, 130, y + 9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Folgas: ${totalDaysOff}`, pageWidth - 26, y + 9, { align: 'right' });
  y += 20;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(20, y, pageWidth - 40, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Funcionário', 25, y + 5);
  doc.text('Dias Inteiros', 95, y + 5, { align: 'center' });
  doc.text('Meios Dias', 120, y + 5, { align: 'center' });
  doc.text('Total Dias', 145, y + 5, { align: 'center' });
  doc.text('Folgas', 165, y + 5, { align: 'center' });
  doc.text('Faltas & Motivos', pageWidth - 25, y + 5, { align: 'right' });
  y += 7.5;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  items.forEach((item, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
      doc.setFillColor(15, 23, 42);
      doc.rect(20, y, pageWidth - 40, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Funcionário', 25, y + 5);
      doc.text('Dias Inteiros', 95, y + 5, { align: 'center' });
      doc.text('Meios Dias', 120, y + 5, { align: 'center' });
      doc.text('Total Dias', 145, y + 5, { align: 'center' });
      doc.text('Folgas', 165, y + 5, { align: 'center' });
      doc.text('Faltas & Motivos', pageWidth - 25, y + 5, { align: 'right' });
      y += 7.5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(20, y, pageWidth - 40, 7, 'F');
    }

    doc.setFontSize(8);
    doc.text(item.name.substring(0, 32), 25, y + 4.8);
    doc.text(String(item.fullDays), 95, y + 4.8, { align: 'center' });
    doc.text(item.halfDays > 0 ? `${item.halfDays} (0.5)` : '—', 120, y + 4.8, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.effectiveDays), 145, y + 4.8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(String(item.daysOff || 0), 165, y + 4.8, { align: 'center' });

    const absenceText =
      item.absencesList.length === 0
        ? '— Nenhuma falta'
        : `${item.absencesList.length} falta(s): ${item.absencesList.map((a) => `${formatDate(a.date)} (${a.reason})`).join(', ')}`;
    const absenceTruncated = absenceText.length > 36 ? absenceText.substring(0, 34) + '...' : absenceText;
    doc.text(absenceTruncated, pageWidth - 25, y + 4.8, { align: 'right' });

    y += 7;
  });

  // Bottom Total Line (Zero valores, apenas presenças e faltas)
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`TOTAIS DO MÊS: ${totalDays} DIAS TRABALHADOS  |  ${totalAbsences} FALTAS  |  ${totalDaysOff} FOLGAS`, 25, y);

  // Sem bloco de assinaturas nem valores monetários!

  // Save PDF
  try {
    doc.save(cleanFilename);
  } catch {
    const blob = doc.output('blob');
    triggerBlobDownload(blob, cleanFilename);
  }
}


