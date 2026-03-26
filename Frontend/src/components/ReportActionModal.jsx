import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import PrintableReport from './PrintableReport';

const API_URL = import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('localhost')
  ? import.meta.env.VITE_API_URL
  : `${window.location.protocol}//${window.location.hostname}:5000/api/v1`;

export default function ReportActionModal({ survey, onClose, onComplete }) {
  const [step, setStep] = useState('fetching'); // fetching, printing, finalizing, done, error
  const [errorMsg, setErrorMsg] = useState('');
  const [reportData, setReportData] = useState(null);
  const printRef = useRef();

  const handleDownloadPDF = async () => {
    try {
      const element = printRef.current;
      if (!element) throw new Error("Report rendering failed.");
      
      const dataUrl = await toPng(element, { 
        quality: 1.0,
        pixelRatio: 2, 
        skipAutoScale: true
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const chunks = element.querySelectorAll('.print-chunk');
      if (chunks.length === 0) throw new Error("No print chunks found");
      
      let currentY = 10; // Top margin
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const dataUrl = await toPng(chunk, { quality: 1.0, pixelRatio: 2, skipAutoScale: true, style: { transform: 'scale(1)' } });
        const imgProps = pdf.getImageProperties(dataUrl);
        const chunkHeightTotal = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Start on a fresh page if it won't fit entirely, unless we are already at the top of a page
        if (currentY + chunkHeightTotal > pageHeight - 10 && currentY > 10) {
            pdf.addPage();
            currentY = 10;
        }
        
        let yOffset = 0;
        while (yOffset < chunkHeightTotal) {
            // Check if we reached bottom of page and need another one for the same chunk
            if (currentY >= pageHeight - 10) {
                pdf.addPage();
                currentY = 10;
            }
            
            // Draw chunk shifted UP by how much of it we have already drawn
            pdf.addImage(dataUrl, 'PNG', 0, currentY - yOffset, pdfWidth, chunkHeightTotal);
            
            const spaceAvailable = pageHeight - 10 - currentY;
            const chunkRemaining = chunkHeightTotal - yOffset;
            const drawnThisPage = Math.min(chunkRemaining, spaceAvailable);
            
            yOffset += drawnThisPage;
            currentY += drawnThisPage;
        }
        
        // Add minimal spacing between chunks
        currentY += 10;
      }
      
      pdf.save(`${getDocumentTitle()}.pdf`);
      
      // Proceed to finalizing the folder move if PDF download triggered successfully
      handleFinalize();
    } catch (error) {
      setStep('error');
      setErrorMsg('Failed to generate PDF. ' + error.message);
    }
  };

  function getDocumentTitle() {
    if (!survey || !survey.title) return 'MSF_Report';
    
    let text = survey.title.replace(/Multisource Feedback Form \(MSF\)/i, '').trim();
    let doctorName = 'Doctor';
    let specialty = 'Specialty';
    
    const specialtyMatch = text.match(/Specialty\s*[-:]?\s*(.*)$/i);
    if (specialtyMatch) {
      specialty = specialtyMatch[1].trim();
      text = text.replace(specialtyMatch[0], '').trim();
    }
    
    const trainerMatch = text.match(/Trainer\s*[-:]?\s*(.*)$/i);
    if (trainerMatch) {
      text = text.replace(trainerMatch[0], '').trim();
    }
    
    if (text) {
      doctorName = text.trim();
    }
    
    const cleanDoc = doctorName.replace(/[^a-zA-Z0-9.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanSpec = specialty.replace(/[^a-zA-Z0-9.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    
    const finalTitle = `${cleanDoc} - ${cleanSpec}`.substring(0, 100).trim();
    return finalTitle || 'MSF_Report';
  }

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/reports/${survey.id}/data`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch report data');
        
        if (isMounted) {
          setReportData(data);
          setStep('printing');
        }
      } catch (err) {
        if (isMounted) {
          setStep('error');
          setErrorMsg(err.message);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [survey.id]);

  // Auto trigger PDF generation when data is ready
  useEffect(() => {
    if (step === 'printing' && reportData) {
      // Small timeout to ensure Recharts has fully rendered before capturing
      const timer = setTimeout(() => {
        handleDownloadPDF();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [step, reportData]);

  const handleFinalize = async () => {
    setStep('finalizing');
    try {
      const res = await fetch(`${API_URL}/reports/${survey.id}/complete`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark as complete');
      
      setStep('done');
    } catch (err) {
      setStep('error');
      setErrorMsg('Printed successfully, but failed to move folder: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-800/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative transform transition-all">
        <div className="p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Processing Report</h3>
          
          <div className="flex flex-col items-center justify-center space-y-6 min-h-[150px]">
            {step === 'fetching' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 font-medium">Analyzing data...</p>
              </>
            )}

            {step === 'printing' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="text-gray-600 font-medium">Generating PDF...</p>
                <p className="text-sm text-gray-400 text-center">Your PDF report is downloading.<br/>This may take a moment.</p>
              </>
            )}

            {step === 'finalizing' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="text-gray-600 font-medium">Wrapping up...</p>
              </>
            )}

            {step === 'done' && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-2">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <p className="text-xl text-gray-900 font-bold">Complete!</p>
                <p className="text-sm text-gray-500 text-center">The report was successfully generated and moved to the completed folder.</p>
                <div className="mt-4 w-full px-4">
                  <button onClick={() => { onComplete(); onClose(); }} className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    OK
                  </button>
                </div>
              </>
            )}

            {step === 'error' && (
              <>
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-2">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                </div>
                <p className="text-xl text-gray-900 font-bold">Error</p>
                <p className="text-sm text-red-500 text-center px-4">{errorMsg}</p>
                <div className="mt-4 w-full px-4 flex gap-3">
                  <button onClick={onClose} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors">
                    Cancel
                  </button>
                  {/* Provide manual download fallback if data is loaded but something failed later */}
                  {reportData && (
                    <button onClick={handleDownloadPDF} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                      Retry Download
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden container for PDF capture content - must be in DOM with layout, so we use fixed off-screen positioning */}
      <div className="fixed top-[200vh] left-0 pointer-events-none -z-50 opacity-0 w-[210mm]">
         {reportData && (
           <PrintableReport ref={printRef} survey={survey} data={reportData} />
         )}
      </div>
    </div>
  );
}
