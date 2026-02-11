
import React, { useState, useRef } from 'react';
import { JobRequirements, CandidateResult, HSEDesignation } from './types';
import { extractTextFromPdf, extractTextFromTxt } from './services/pdfService';
import { screenResume } from './services/geminiService';

const LOGO_URL = "https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png";

const App: React.FC = () => {
  const [jobReqs] = useState<JobRequirements>({
    minExperience: 5,
    requiredSkills: ['Safety Management', 'Risk Assessment', 'HSE Auditing', 'Site Supervision'],
    certifications: { nebosh: true, level6: true, adosh: true },
    natureOfExperience: ['Rail', 'Infrastructure', 'Bridges', 'Villa', 'Building', 'Offshore', 'Onshore', 'Facility Management']
  });

  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateDesignation = (years: number): HSEDesignation => {
    if (years >= 15) return 'HSE/Safety Manager';
    if (years >= 10) return 'HSE/Safety Engineer';
    if (years >= 5) return 'HSE/Safety Officer';
    return 'HSE/Safety Inspector';
  };

  const calculateMatchScore = (data: any): number => {
    let score = 0;
    if (data.hasNebosh) score += 20;
    if (data.hasLevel6) score += 25;
    if (data.hasAdosh) score += 15;
    const natureCount = (data.natureOfExperienceFound || []).length;
    score += Math.min(20, natureCount * 5);
    if (data.yearsOfExperience >= 5) score += 20;
    return Math.min(100, score);
  };

  const processFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setProgress(0);
    setErrorMessage(null);

    const fileList = Array.from(files).filter(f => f.type === 'application/pdf' || f.type === 'text/plain');
    if (fileList.length === 0) {
      setErrorMessage("Please upload PDF or TXT files only.");
      setIsProcessing(false);
      return;
    }

    const processedCandidates: CandidateResult[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        let text = '';
        if (file.type === 'application/pdf') {
          text = await extractTextFromPdf(file);
        } else {
          text = await extractTextFromTxt(file);
        }

        const extracted = await screenResume(text, jobReqs);
        const score = calculateMatchScore(extracted);
        const designation = calculateDesignation(extracted.yearsOfExperience);

        processedCandidates.push({
          ...extracted,
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          matchScore: score,
          designation,
          timestamp: Date.now(),
          status: 'completed'
        });
      } catch (err: any) {
        console.error("Processing failed for", file.name, err);
        // Continue with others but maybe show a subtle warning
      }
      setProgress(Math.round(((i + 1) / fileList.length) * 100));
    }

    setCandidates(prev => [...processedCandidates, ...prev]);
    setIsProcessing(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Designation", "Exp", "Score", "Recommendation"];
    const rows = candidates.map(c => [c.fullName, c.email, c.designation, c.yearsOfExperience, c.matchScore, c.recommendation]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "TGC_HSE_Screening.csv");
    document.body.appendChild(link);
    link.click();
  };

  const stats = {
    total: candidates.length,
    highScore: candidates.filter(c => c.matchScore >= 80).length,
    avgExp: candidates.length ? (candidates.reduce((acc, curr) => acc + curr.yearsOfExperience, 0) / candidates.length).toFixed(1) : 0
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="TGC" className="h-8 w-8 object-contain" />
            <span className="font-bold tracking-tight text-slate-800">TGC HSE Screening</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              disabled={candidates.length === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition-colors"
            >
              Export Report
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Upload Resumes
            </button>
            <input type="file" multiple accept=".pdf,.txt" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && processFiles(e.target.files)} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total Screened" value={stats.total} icon="👥" color="indigo" />
          <StatCard label="Highly Recommended" value={stats.highScore} icon="⭐" color="emerald" />
          <StatCard label="Avg. Experience" value={`${stats.avgExp} yrs`} icon="⏱️" color="amber" />
        </div>

        {/* Upload Zone */}
        {candidates.length === 0 && !isProcessing && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-3xl p-20 flex flex-col items-center justify-center transition-all cursor-pointer
              ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-slate-400'}
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="bg-indigo-100 p-4 rounded-full mb-4">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">Drop resumes here to start</h3>
            <p className="text-slate-500 mt-2">Support for PDF and TXT files • Multi-file analysis enabled</p>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                <span className="font-bold text-slate-700">Analyzing candidates...</span>
              </div>
              <span className="text-sm font-bold text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Main Table */}
        {candidates.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">Recruitment Pipeline</h2>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wider">{candidates.length} Profiles Found</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Candidate</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Designation</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Match Score</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Recommendation</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Certifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCandidate(c)}
                      className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.fullName}</div>
                        <div className="text-xs text-slate-500">{c.email}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-black uppercase text-slate-600">{c.designation}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className={`text-lg font-black ${c.matchScore >= 80 ? 'text-emerald-600' : c.matchScore >= 50 ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {c.matchScore}%
                        </div>
                      </td>
                      <td className="px-6 py-5">
                         <RecommendationBadge text={c.recommendation} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-2">
                          <CertTag label="NEBOSH" active={c.hasNebosh} />
                          <CertTag label="ADOSH" active={c.hasAdosh} />
                          <CertTag label="LVL6" active={c.hasLevel6} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Candidate Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{selectedCandidate.fullName}</h3>
                <p className="text-slate-500 font-medium">{selectedCandidate.designation} • {selectedCandidate.yearsOfExperience} Years Exp.</p>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-6">
              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">AI Executive Summary</h4>
                <p className="text-slate-700 leading-relaxed text-sm bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  {selectedCandidate.summary}
                </p>
              </section>

              <div className="grid grid-cols-2 gap-6">
                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Key Strengths</h4>
                  <ul className="space-y-2">
                    {selectedCandidate.keyStrengths.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {s}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Verified Qualifications</h4>
                  <div className="space-y-2">
                    <QualRow label="NEBOSH" active={selectedCandidate.hasNebosh} />
                    <QualRow label="ADOSH/OSHAD" active={selectedCandidate.hasAdosh} />
                    <QualRow label="Level 6 Diploma" active={selectedCandidate.hasLevel6} />
                  </div>
                </section>
              </div>

              <section>
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Technical Domain Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidate.technicalSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-600">{skill}</span>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-8 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => setSelectedCandidate(null)} className="px-6 py-2.5 font-bold text-slate-600">Close Profile</button>
               <button className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all">Move to Interview</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-slate-200 bg-white text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Optimized for Netlify • Built with Gemini 2.5 Pro</p>
      </footer>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string, value: any, icon: string, color: string }) => {
  const colors: any = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600'
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
      <div className={`p-4 rounded-xl text-2xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  );
};

const RecommendationBadge = ({ text }: { text: string }) => {
  const color = text.includes('Highly') ? 'bg-emerald-100 text-emerald-700' :
                text.includes('Recommended') ? 'bg-blue-100 text-blue-700' :
                text.includes('Review') ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${color}`}>{text}</span>;
};

const CertTag = ({ label, active }: { label: string, active: boolean }) => (
  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
    {label}
  </span>
);

const QualRow = ({ label, active }: { label: string, active: boolean }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-100 text-xs font-bold">
    <span className="text-slate-600">{label}</span>
    {active ? 
      <span className="text-emerald-600 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        YES
      </span> : 
      <span className="text-slate-300">NO</span>
    }
  </div>
);

export default App;
