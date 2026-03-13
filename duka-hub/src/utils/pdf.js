import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function elementToPdfFile(element, filename) {
  if (!element) throw new Error('Missing invoice preview');
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = pageWidth;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);

  let heightLeft = imgHeight - pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const blob = pdf.output('blob');
  return new File([blob], filename, { type: 'application/pdf' });
}

