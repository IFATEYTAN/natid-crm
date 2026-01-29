// PDF Export utility - loaded dynamically to reduce bundle size

export async function exportToPDF(report, filename) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');
  const { generateReportHTML } = await import('./reportStyles');
  
  // Create a temporary iframe with the full styled HTML report
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '900px';
  iframe.style.height = '100%';
  document.body.appendChild(iframe);
  
  // Generate the full HTML report
  const htmlContent = generateReportHTML(report);
  
  // Write content to iframe
  iframe.contentDocument.open();
  iframe.contentDocument.write(htmlContent);
  iframe.contentDocument.close();
  
  // Wait for content and images to load
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get the container element from the iframe
  const element = iframe.contentDocument.querySelector('.container');
  
  if (!element) {
    document.body.removeChild(iframe);
    throw new Error('Could not find report container');
  }
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    allowTaint: true
  });
  
  // Remove iframe
  document.body.removeChild(iframe);
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const contentWidth = pageWidth - (margin * 2);
  
  const imgWidth = contentWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = margin;
  
  pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - margin * 2);
  
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + margin;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);
  }
  
  pdf.save(filename);
}