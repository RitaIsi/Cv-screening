import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  calculateMatchScore,
  getScoreBreakdown,
  getMatchLabel,
  getMatchedSkills,
  getMissingSkills,
  rankJobsForSeeker,
} from './aiService';

export const SCORING_METHOD_NOTE =
  '50% semantic similarity of CV and job, 35% skill match, 15% experience (fallback when an embedding is missing: 70% skill match, 30% experience).';

/**
 * Formats a Date into a readable timestamp string.
 */
function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formats a Date into YYYY-MM-DD for safe filenames.
 */
function formatDateSlug(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Converts a string to a safe filename slug:
 * lowercase, spaces to hyphens, no special characters.
 */
export function sanitizeFileSlug(value = '') {
  const cleaned = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'report';
}

/**
 * Builds the filename for a given report data object and extension.
 */
export function getReportFileName(reportData, ext) {
  const safeExt = String(ext || '').replace(/^\./, '').toLowerCase();
  if (reportData.type === 'screening') {
    const jobSlug = sanitizeFileSlug(reportData.job?.title || 'job');
    return `hirematch-screening-report-${jobSlug}-${reportData.dateSlug}.${safeExt}`;
  }
  const nameSlug = sanitizeFileSlug(reportData.seeker?.fullName || 'seeker');
  return `hirematch-recommendation-report-${nameSlug}-${reportData.dateSlug}.${safeExt}`;
}

/**
 * Builds normalized data for the Recruiter CV Screening Report.
 * This single data structure powers the on-screen report, PDF, Excel, and CSV exports.
 */
export function buildScreeningReportData({
  job = {},
  applications = [],
  recruiterProfile = {},
  generatedAt = new Date(),
}) {
  const dateObj = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);
  const companyName =
    job?.company || recruiterProfile?.company_name || recruiterProfile?.full_name || 'HireMatch Recruiter';

  const normalizedRows = (applications || []).map((app) => {
    const seeker = app.seeker || app.profiles || {};
    const storedBreakdown =
      app.score_breakdown && typeof app.score_breakdown === 'object' ? app.score_breakdown : null;

    const hasBreakdown = Boolean(storedBreakdown);

    let totalScore;
    if (hasBreakdown && typeof storedBreakdown.total === 'number') {
      totalScore = storedBreakdown.total;
    } else if (typeof app.match_score === 'number') {
      totalScore = app.match_score;
    } else {
      totalScore = calculateMatchScore(seeker, job);
    }

    const usedFallback = hasBreakdown ? Boolean(storedBreakdown.usedFallback) : false;
    const semanticScore =
      hasBreakdown && !usedFallback && typeof storedBreakdown.semantic === 'number'
        ? storedBreakdown.semantic
        : null;
    const skillsScore =
      hasBreakdown && typeof storedBreakdown.skills === 'number' ? storedBreakdown.skills : null;
    const experienceScore =
      hasBreakdown && typeof storedBreakdown.experience === 'number'
        ? storedBreakdown.experience
        : null;

    const matchedSkills =
      hasBreakdown && Array.isArray(storedBreakdown.matchedSkills)
        ? storedBreakdown.matchedSkills
        : getMatchedSkills(seeker, job);

    const missingSkills =
      hasBreakdown && Array.isArray(storedBreakdown.missingSkills)
        ? storedBreakdown.missingSkills
        : getMissingSkills(seeker, job);

    return {
      id: app.id,
      candidateName: seeker.full_name || 'Anonymous Candidate',
      education: seeker.education || 'Not specified',
      experienceYears: Number(seeker.experience_years) || 0,
      totalScore,
      matchLabel: getMatchLabel(totalScore),
      hasBreakdown,
      usedFallback,
      semanticScore,
      skillsScore,
      experienceScore,
      matchedSkills,
      missingSkills,
      status: (app.status || 'pending').toLowerCase(),
      cvSummary: seeker.cv_summary || '',
    };
  });

  // Sort by totalScore descending
  normalizedRows.sort((a, b) => b.totalScore - a.totalScore);

  const candidates = normalizedRows.map((row, idx) => ({
    ...row,
    rank: idx + 1,
  }));

  const summaryCounts = {
    totalApplicants: candidates.length,
    strongMatches: candidates.filter((c) => c.totalScore >= 75).length,
    moderateMatches: candidates.filter((c) => c.totalScore >= 50 && c.totalScore <= 74).length,
    lowMatches: candidates.filter((c) => c.totalScore < 50).length,
    shortlisted: candidates.filter((c) => c.status === 'shortlisted').length,
  };

  return {
    type: 'screening',
    title: 'CV Screening Report',
    companyName,
    generatedAt: formatDateTime(dateObj),
    dateSlug: formatDateSlug(dateObj),
    methodNote: SCORING_METHOD_NOTE,
    job: {
      id: job.id,
      title: job.title || 'Untitled Position',
      company: companyName,
      location: job.location || 'Not specified',
      jobType: job.job_type || 'Full-time',
      requiredSkills: Array.isArray(job.required_skills) ? job.required_skills : [],
      minExperience: Number(job.min_experience) || 0,
    },
    summaryCounts,
    candidates,
  };
}

/**
 * Builds normalized data for the Job Seeker Job Recommendation Report.
 * This single data structure powers the on-screen report, PDF, Excel, and CSV exports.
 */
export function buildRecommendationReportData({
  seekerProfile = {},
  jobs = [],
  generatedAt = new Date(),
}) {
  const dateObj = generatedAt instanceof Date ? generatedAt : new Date(generatedAt);

  // Rank jobs using aiService and take top 10
  const rankedAll = rankJobsForSeeker(seekerProfile, jobs || []);
  const topSlice = rankedAll.slice(0, 10);

  const recommendedJobs = topSlice.map((job, idx) => {
    const breakdown = getScoreBreakdown(seekerProfile, job);
    return {
      id: job.id,
      rank: idx + 1,
      title: job.title || 'Untitled Role',
      company: job.company || 'Company',
      location: job.location || 'Not specified',
      jobType: job.job_type || 'Full-time',
      totalScore: breakdown.total,
      matchLabel: getMatchLabel(breakdown.total),
      usedFallback: breakdown.usedFallback,
      semanticScore: breakdown.semantic,
      skillsScore: breakdown.skills,
      experienceScore: breakdown.experience,
      matchedSkills: breakdown.matchedSkills,
      missingSkills: breakdown.missingSkills,
    };
  });

  // Compute skills missing most often across the top jobs
  const missingFreqMap = new Map();
  recommendedJobs.forEach((item) => {
    (item.missingSkills || []).forEach((skill) => {
      const key = skill.trim().toLowerCase();
      if (!key) return;
      const existing = missingFreqMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        missingFreqMap.set(key, { skill: skill.trim(), count: 1 });
      }
    });
  });

  const mostMissingSkills = Array.from(missingFreqMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.skill.localeCompare(b.skill);
  });

  const summaryCounts = {
    jobsIncluded: recommendedJobs.length,
    strongMatches: recommendedJobs.filter((j) => j.totalScore >= 75).length,
    moderateMatches: recommendedJobs.filter((j) => j.totalScore >= 50 && j.totalScore <= 74).length,
    lowMatches: recommendedJobs.filter((j) => j.totalScore < 50).length,
  };

  return {
    type: 'recommendation',
    title: 'Job Recommendation Report',
    generatedAt: formatDateTime(dateObj),
    dateSlug: formatDateSlug(dateObj),
    methodNote: SCORING_METHOD_NOTE,
    seeker: {
      fullName: seekerProfile?.full_name || 'Job Seeker',
      education: seekerProfile?.education || 'Not specified',
      experienceYears: Number(seekerProfile?.experience_years) || 0,
      skills: Array.isArray(seekerProfile?.skills) ? seekerProfile.skills : [],
      cvSummary: seekerProfile?.cv_summary || '',
      hasAnalyzedCv: Boolean(
        seekerProfile?.cv_analyzed_at ||
          seekerProfile?.cv_summary ||
          (Array.isArray(seekerProfile?.cv_embedding) && seekerProfile.cv_embedding.length > 0)
      ),
    },
    summaryCounts,
    recommendedJobs,
    mostMissingSkills,
  };
}

/**
 * Formats table rows with identical columns for Excel and CSV.
 */
function buildTableColumnsAndRows(reportData) {
  if (reportData.type === 'screening') {
    const headers = [
      'Rank',
      'Candidate Name',
      'Education',
      'Experience (Years)',
      'Total Score',
      'Match Label',
      'Semantic Score',
      'Skills Score',
      'Experience Score',
      'Matched Skills',
      'Missing Skills',
      'Status',
      'AI CV Summary',
    ];

    const rows = (reportData.candidates || []).map((c) => {
      let semanticCell;
      let skillsCell;
      let expCell;

      if (!c.hasBreakdown) {
        semanticCell = 'Breakdown not available';
        skillsCell = 'Breakdown not available';
        expCell = 'Breakdown not available';
      } else {
        semanticCell =
          c.usedFallback || c.semanticScore === null ? 'N/A (Fallback)' : Number(c.semanticScore);
        skillsCell = typeof c.skillsScore === 'number' ? Number(c.skillsScore) : 'Breakdown not available';
        expCell =
          typeof c.experienceScore === 'number'
            ? Number(c.experienceScore)
            : 'Breakdown not available';
      }

      const statusFormatted =
        c.status.charAt(0).toUpperCase() + c.status.slice(1);

      return [
        Number(c.rank),
        c.candidateName,
        c.education,
        Number(c.experienceYears),
        Number(c.totalScore),
        c.matchLabel,
        semanticCell,
        skillsCell,
        expCell,
        (c.matchedSkills || []).join(', '),
        (c.missingSkills || []).join(', '),
        statusFormatted,
        c.cvSummary || 'No AI summary available',
      ];
    });

    return { sheetName: 'Candidates', headers, rows };
  }

  // Recommendation report
  const headers = [
    'Rank',
    'Job Title',
    'Company',
    'Location',
    'Job Type',
    'Total Score',
    'Match Label',
    'Semantic Score',
    'Skills Score',
    'Experience Score',
    'Matched Skills',
    'Skills to Improve',
  ];

  const rows = (reportData.recommendedJobs || []).map((j) => [
    Number(j.rank),
    j.title,
    j.company,
    j.location,
    j.jobType,
    Number(j.totalScore),
    j.matchLabel,
    j.usedFallback || j.semanticScore === null ? 'N/A (Fallback)' : Number(j.semanticScore),
    Number(j.skillsScore),
    Number(j.experienceScore),
    (j.matchedSkills || []).join(', '),
    (j.missingSkills || []).join(', '),
  ]);

  return { sheetName: 'Recommended Jobs', headers, rows };
}

/**
 * Helper to trigger a browser file download from a Blob.
 */
function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports the report data as a plain, editorial PDF using jsPDF and jspdf-autotable.
 */
export async function exportPdf(reportData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;

  // Colors from DESIGN.md
  const COLOR_PRIMARY = [254, 60, 1]; // #FE3C01
  const COLOR_SECONDARY = [36, 30, 32]; // #241E20
  const COLOR_MUTED = [107, 100, 102]; // #6B6466
  const COLOR_BORDER = [229, 231, 235]; // #E5E7EB

  let cursorY = 42;

  // HireMatch. wordmark at top
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text('HireMatch', marginX, cursorY);
  const wordmarkWidth = doc.getTextWidth('HireMatch');
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text('.', marginX + wordmarkWidth, cursorY);

  // Report Title & Generated Metadata
  cursorY += 26;
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text(reportData.title, marginX, cursorY);

  cursorY += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR_MUTED);
  if (reportData.type === 'screening') {
    doc.text(
      `Company: ${reportData.companyName}   |   Generated: ${reportData.generatedAt}`,
      marginX,
      cursorY
    );
  } else {
    doc.text(
      `Candidate: ${reportData.seeker.fullName}   |   Generated: ${reportData.generatedAt}`,
      marginX,
      cursorY
    );
  }

  // Thin divider line with small orange accent
  cursorY += 10;
  doc.setDrawColor(...COLOR_PRIMARY);
  doc.setLineWidth(2);
  doc.line(marginX, cursorY, marginX + 48, cursorY);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.75);
  doc.line(marginX + 48, cursorY, pageWidth - marginX, cursorY);

  cursorY += 18;

  if (reportData.type === 'screening') {
    // Job details block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(`Job: ${reportData.job.title}`, marginX, cursorY);

    cursorY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(
      `Location: ${reportData.job.location}   |   Type: ${reportData.job.jobType}   |   Minimum Experience: ${reportData.job.minExperience} year(s)`,
      marginX,
      cursorY
    );

    cursorY += 14;
    const reqSkillsText = `Required Skills: ${
      reportData.job.requiredSkills.length > 0 ? reportData.job.requiredSkills.join(', ') : 'None specified'
    }`;
    const wrappedSkills = doc.splitTextToSize(reqSkillsText, pageWidth - marginX * 2);
    doc.text(wrappedSkills, marginX, cursorY);
    cursorY += wrappedSkills.length * 12 + 4;

    // Method note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Method: ${reportData.methodNote}`, marginX, cursorY);

    cursorY += 16;
    // Summary counts
    const sc = reportData.summaryCounts;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(
      `Summary Counts — Total Applicants: ${sc.totalApplicants}   |   Strong Matches (75-100): ${sc.strongMatches}   |   Moderate Matches (50-74): ${sc.moderateMatches}   |   Low Matches (0-49): ${sc.lowMatches}   |   Shortlisted: ${sc.shortlisted}`,
      marginX,
      cursorY
    );
    cursorY += 14;

    // Build table rows with AI summary row beneath each candidate
    const tableBody = [];
    (reportData.candidates || []).forEach((c) => {
      const compText = !c.hasBreakdown
        ? 'Breakdown not available'
        : `Sem: ${c.usedFallback || c.semanticScore === null ? 'N/A' : `${c.semanticScore}%`} | Skill: ${c.skillsScore}% | Exp: ${c.experienceScore}%`;

      tableBody.push([
        String(c.rank),
        c.candidateName,
        c.education,
        `${c.experienceYears} yr${c.experienceYears === 1 ? '' : 's'}`,
        `${c.totalScore}% (${c.matchLabel})`,
        compText,
        (c.matchedSkills || []).join(', ') || 'None',
        (c.missingSkills || []).join(', ') || 'None',
        c.status.charAt(0).toUpperCase() + c.status.slice(1),
      ]);

      if (c.cvSummary) {
        tableBody.push([
          {
            content: `AI CV Summary (${c.candidateName}): ${c.cvSummary}`,
            colSpan: 9,
            styles: {
              fillColor: [255, 255, 249],
              textColor: COLOR_MUTED,
              fontStyle: 'italic',
              fontSize: 8.5,
              cellPadding: { top: 5, right: 8, bottom: 7, left: 14 },
            },
          },
        ]);
      }
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 42 },
      head: [
        [
          'Rank',
          'Candidate',
          'Education',
          'Exp.',
          'Total Score',
          'Components (0-100)',
          'Matched Skills',
          'Missing Skills',
          'Status',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: COLOR_SECONDARY,
        lineColor: COLOR_BORDER,
        lineWidth: 0.5,
        cellPadding: 6,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLOR_SECONDARY,
        textColor: [255, 255, 249],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      columnStyles: {
        0: { cellWidth: 34, halign: 'center' },
        1: { cellWidth: 85, fontStyle: 'bold' },
        2: { cellWidth: 85 },
        3: { cellWidth: 42, halign: 'center' },
        4: { cellWidth: 82, fontStyle: 'bold' },
        5: { cellWidth: 118 },
        6: { cellWidth: 120 },
        7: { cellWidth: 120 },
        8: { cellWidth: 60, halign: 'center' },
      },
    });
  } else {
    // Seeker Recommendation Report
    const s = reportData.seeker;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(`Job Seeker Profile: ${s.fullName}`, marginX, cursorY);

    cursorY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(
      `Education: ${s.education}   |   Experience: ${s.experienceYears} year(s)`,
      marginX,
      cursorY
    );

    cursorY += 14;
    const skillsLine = `Skills: ${s.skills.length > 0 ? s.skills.join(', ') : 'None listed'}`;
    const wrappedSeekerSkills = doc.splitTextToSize(skillsLine, pageWidth - marginX * 2);
    doc.text(wrappedSeekerSkills, marginX, cursorY);
    cursorY += wrappedSeekerSkills.length * 12;

    if (s.cvSummary) {
      cursorY += 2;
      const summaryLines = doc.splitTextToSize(`AI CV Summary: ${s.cvSummary}`, pageWidth - marginX * 2);
      doc.setTextColor(...COLOR_MUTED);
      doc.text(summaryLines, marginX, cursorY);
      cursorY += summaryLines.length * 12;
    }

    cursorY += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`Method: ${reportData.methodNote}`, marginX, cursorY);
    cursorY += 14;

    const tableBody = (reportData.recommendedJobs || []).map((j) => [
      String(j.rank),
      j.title,
      j.company,
      j.location,
      `${j.totalScore}% (${j.matchLabel})`,
      `Sem: ${j.usedFallback || j.semanticScore === null ? 'N/A' : `${j.semanticScore}%`} | Skill: ${j.skillsScore}% | Exp: ${j.experienceScore}%`,
      (j.matchedSkills || []).join(', ') || 'None',
      (j.missingSkills || []).join(', ') || 'None',
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX, bottom: 42 },
      head: [
        [
          'Rank',
          'Job Title',
          'Company',
          'Location',
          'Total Score',
          'Components (0-100)',
          'Matched Skills',
          'Skills to Improve',
        ],
      ],
      body: tableBody,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8.5,
        textColor: COLOR_SECONDARY,
        lineColor: COLOR_BORDER,
        lineWidth: 0.5,
        cellPadding: 6,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: COLOR_SECONDARY,
        textColor: [255, 255, 249],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      columnStyles: {
        0: { cellWidth: 34, halign: 'center' },
        1: { cellWidth: 115, fontStyle: 'bold' },
        2: { cellWidth: 85 },
        3: { cellWidth: 75 },
        4: { cellWidth: 86, fontStyle: 'bold' },
        5: { cellWidth: 120 },
        6: { cellWidth: 115 },
        7: { cellWidth: 115 },
      },
    });

    // Closing section: skills missing most often across top jobs
    let finalY = (doc.lastAutoTable?.finalY || cursorY) + 20;
    if (finalY > pageHeight - 75) {
      doc.addPage();
      finalY = 45;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text('Skills Missing Most Often Across Top Recommended Jobs', marginX, finalY);

    finalY += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR_MUTED);
    const missingSummaryText =
      (reportData.mostMissingSkills || []).length > 0
        ? reportData.mostMissingSkills
            .map((item) => `${item.skill} (missing in ${item.count} job${item.count === 1 ? '' : 's'})`)
            .join(', ')
        : 'None — your profile matches all required skills across the top recommended jobs.';
    const wrappedMissing = doc.splitTextToSize(missingSummaryText, pageWidth - marginX * 2);
    doc.text(wrappedMissing, marginX, finalY);
  }

  // Footer with generated date and page numbers on every page
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.5);
    doc.line(marginX, pageHeight - 28, pageWidth - marginX, pageHeight - 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_MUTED);
    doc.text(`HireMatch.  |  Generated: ${reportData.generatedAt}`, marginX, pageHeight - 15);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 15, { align: 'right' });
  }

  const filename = getReportFileName(reportData, 'pdf');
  doc.save(filename);
}

/**
 * Exports the report data as a two-sheet Excel (.xlsx) workbook using exceljs.
 */
export async function exportExcel(reportData) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'HireMatch';
  workbook.created = new Date();

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };

  // 1. Sheet "Summary"
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { key: 'field', width: 32 },
    { key: 'value', width: 80 },
  ];

  const summaryRows = [];
  if (reportData.type === 'screening') {
    const sc = reportData.summaryCounts;
    summaryRows.push(
      ['Report Title', reportData.title],
      ['Company', reportData.companyName],
      ['Generated Date', reportData.generatedAt],
      ['', ''],
      ['Job Details', ''],
      ['Job Title', reportData.job.title],
      ['Location', reportData.job.location],
      ['Job Type', reportData.job.jobType],
      ['Minimum Experience (Years)', Number(reportData.job.minExperience)],
      ['Required Skills', (reportData.job.requiredSkills || []).join(', ') || 'None specified'],
      ['', ''],
      ['Scoring Method', reportData.methodNote],
      ['', ''],
      ['Summary Counts', ''],
      ['Total Applicants', Number(sc.totalApplicants)],
      ['Strong Matches (75-100)', Number(sc.strongMatches)],
      ['Moderate Matches (50-74)', Number(sc.moderateMatches)],
      ['Low Matches (0-49)', Number(sc.lowMatches)],
      ['Shortlisted', Number(sc.shortlisted)]
    );
  } else {
    const s = reportData.seeker;
    const sc = reportData.summaryCounts;
    const topMissingText =
      (reportData.mostMissingSkills || []).length > 0
        ? reportData.mostMissingSkills.map((m) => `${m.skill} (${m.count})`).join(', ')
        : 'None';

    summaryRows.push(
      ['Report Title', reportData.title],
      ['Company', 'HireMatch'],
      ['Generated Date', reportData.generatedAt],
      ['', ''],
      ['Job Seeker Details', ''],
      ['Full Name', s.fullName],
      ['Education', s.education],
      ['Experience (Years)', Number(s.experienceYears)],
      ['Skills', (s.skills || []).join(', ') || 'None listed'],
      ['AI CV Summary', s.cvSummary || 'Not available'],
      ['', ''],
      ['Scoring Method', reportData.methodNote],
      ['', ''],
      ['Summary Counts', ''],
      ['Top Jobs Evaluated', Number(sc.jobsIncluded)],
      ['Strong Matches (75-100)', Number(sc.strongMatches)],
      ['Moderate Matches (50-74)', Number(sc.moderateMatches)],
      ['Low Matches (0-49)', Number(sc.lowMatches)],
      ['Most Frequently Missing Skills', topMissingText]
    );
  }

  summaryRows.forEach((pair, idx) => {
    const row = summarySheet.addRow({ field: pair[0], value: pair[1] });
    const isSectionHeader =
      pair[0] &&
      pair[1] === '' &&
      ['Job Details', 'Summary Counts', 'Job Seeker Details'].includes(pair[0]);

    row.getCell(1).font = {
      bold: Boolean(pair[0]),
      size: idx === 0 || isSectionHeader ? 12 : 11,
      color: { argb: 'FF241E20' },
    };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    if (pair[0] || pair[1] !== '') {
      row.getCell(1).border = thinBorder;
      row.getCell(2).border = thinBorder;
    }
  });

  // 2. Ranked Table Sheet ("Candidates" or "Recommended Jobs")
  const { sheetName, headers, rows } = buildTableColumnsAndRows(reportData);
  const tableSheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const colWidths =
    reportData.type === 'screening'
      ? [8, 24, 24, 18, 14, 18, 16, 14, 18, 30, 30, 14, 52]
      : [8, 28, 22, 20, 14, 14, 18, 16, 14, 18, 32, 32];

  tableSheet.columns = headers.map((h, i) => ({
    header: h,
    key: `col_${i}`,
    width: colWidths[i] || 20,
  }));

  // Style bold header row
  const headerRow = tableSheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF241E20' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.border = thinBorder;
  });

  // Add data rows
  rows.forEach((rowData) => {
    const row = tableSheet.addRow(rowData);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = thinBorder;
      const shouldWrap =
        reportData.type === 'screening'
          ? colNumber >= 10 // Matched Skills, Missing Skills, Status, AI CV Summary
          : colNumber >= 11; // Matched Skills, Skills to Improve
      cell.alignment = {
        vertical: 'top',
        horizontal: typeof cell.value === 'number' ? 'right' : 'left',
        wrapText: shouldWrap,
      };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const filename = getReportFileName(reportData, 'xlsx');
  triggerBlobDownload(blob, filename);
}

/**
 * Escapes a single CSV field (commas, double quotes, and CR/LF line breaks).
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports the ranked table as a UTF-8 BOM CSV with identical columns to the Excel table sheet.
 */
export async function exportCsv(reportData) {
  const { headers, rows } = buildTableColumnsAndRows(reportData);
  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  // Prepend UTF-8 BOM (\uFEFF) so Excel opens accented characters properly
  const csvContent = '\uFEFF' + csvLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = getReportFileName(reportData, 'csv');
  triggerBlobDownload(blob, filename);
}

