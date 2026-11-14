import React, { useState, useEffect } from 'react';
import {
  FileText,
  Vote,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Lock,
  UserCheck,
  Printer,
  Send,
  BarChart3,
  FolderArchive,
  X,
  Plus,
  Download,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, DepartmentType } from '../types';
import { readFileAsDataUrl } from '../utils/imageUpload';
import {
  isMasterRootUser,
  isClubPresidentUser,
  isClubVicePresidentUser
} from '../utils/governance';

interface SurveyMinutesSectionProps {
  currentUser: UserProfile;
  isBcnMode: boolean;
  userList: UserProfile[];
  onSaveMinutesToArchive?: (planPayload: any) => void;
}

interface SurveyQuestionItem {
  id: string;
  text: string;
  type: 'single_choice' | 'multiple_choice' | 'text';
  options: string[];
  required: boolean;
}

interface SurveyResponseItem {
  id: string;
  respondentId: string;
  respondentName: string;
  respondentStudentId: string;
  respondentDept: string;
  submittedAt: string;
  answers: Record<string, string | string[]>;
}

interface ClubSurveyPoll {
  id: string;
  title: string;
  description: string;
  meetingContext: string;
  academicYear: string;
  anonymityMode: 'anonymous' | 'identified';
  status: 'open' | 'closed';
  createdBy: string;
  createdAt: string;
  questions: SurveyQuestionItem[];
  responses: SurveyResponseItem[];
}

interface DiscussionOpinionRow {
  id: string;
  speaker: string;
  content: string;
}

interface VoteTableRow {
  id: string;
  fullName: string;
  branch: string;
  roleOrContent: string;
  votesFor: number;
  totalVotes: number;
}

// Chỉ lấy chức vụ cao nhất, loại bỏ phần kiêm nhiệm phía sau
const getHighestPositionOnly = (rawPos?: string): string => {
  if (!rawPos) return 'Chủ nhiệm CLB';
  const cleaned = rawPos.split(/[•·|-(]/)[0].trim();
  return cleaned || 'Chủ nhiệm CLB';
};

export const SurveyMinutesSection: React.FC<SurveyMinutesSectionProps> = ({
  currentUser,
  isBcnMode,
  userList,
  onSaveMinutesToArchive
}) => {
  const isRoot = isMasterRootUser(currentUser);
  const isPresident = isClubPresidentUser(currentUser);
  const isVicePresident = isClubVicePresidentUser(currentUser);
  const isBcnLeader =
    isRoot ||
    isPresident ||
    isVicePresident ||
    isBcnMode ||
    currentUser.role === 'bcn_admin' ||
    currentUser.departmentRole === 'leader';

  const isAlumniViewerOnly =
    currentUser.clubRole === 'alumni_viewer' ||
    (Boolean(currentUser.isGraduated) && currentUser.clubRole !== 'former_bcn' && currentUser.canComment === false);

  const [subTab, setSubTab] = useState<'surveys' | 'minutes'>('minutes');
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);

  // =========================================================================
  // PHẦN 1: HỆ THỐNG FORM KHẢO SÁT, ĐÓNG GÓP Ý KIẾN & BIỂU QUYẾT
  // =========================================================================
  const [surveys, setSurveys] = useState<ClubSurveyPoll[]>(() => {
    try {
      const saved = localStorage.getItem('agu_club_surveys_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    let isMounted = true;
    const loadSurveys = async () => {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && Array.isArray(data.clubSurveys)) {
          setSurveys(data.clubSurveys);
          localStorage.setItem('agu_club_surveys_v1', JSON.stringify(data.clubSurveys));
        }
      } catch {
        // fallback local
      }
    };
    loadSurveys();
    return () => {
      isMounted = false;
    };
  }, []);

  const syncSurveysToServer = async (nextList: ClubSurveyPoll[]) => {
    setSurveys(nextList);
    localStorage.setItem('agu_club_surveys_v1', JSON.stringify(nextList));
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'clubSurveys', data: nextList })
      });
    } catch (err) {
      console.error('Lỗi đồng bộ khảo sát:', err);
    }
  };

  const [isCreateSurveyOpen, setIsCreateSurveyOpen] = useState(false);
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDesc, setSurveyDesc] = useState('');
  const [surveyAcademicYear, setSurveyAcademicYear] = useState('Năm học 2026 - 2027');
  const [surveyAnonymity, setSurveyAnonymity] = useState<'anonymous' | 'identified'>('identified');
  const [draftQuestions, setDraftQuestions] = useState<SurveyQuestionItem[]>([
    {
      id: 'sq-1',
      text: 'Bạn có tán thành với nội dung dự thảo kế hoạch / phương án triển khai của CLB không?',
      type: 'single_choice',
      options: ['Tán thành hoàn toàn', 'Tán thành nhưng cần điều chỉnh thêm', 'Không tán thành'],
      required: true
    },
    {
      id: 'sq-2',
      text: 'Ý kiến đóng góp xây dựng chi tiết của bạn:',
      type: 'text',
      options: [],
      required: false
    }
  ]);

  const [userDraftAnswers, setUserDraftAnswers] = useState<Record<string, Record<string, string | string[]>>>({});

  const handleAddDraftQuestion = () => {
    setDraftQuestions((prev) => [
      ...prev,
      {
        id: `sq-${Date.now()}`,
        text: '',
        type: 'single_choice',
        options: ['Phương án 1', 'Phương án 2'],
        required: true
      }
    ]);
  };

  const handleSaveNewSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyTitle.trim()) return;
    const validQuestions = draftQuestions.filter((q) => q.text.trim());
    if (validQuestions.length === 0) return;

    const newPoll: ClubSurveyPoll = {
      id: `poll-${Date.now()}`,
      title: surveyTitle.trim(),
      description: surveyDesc.trim(),
      meetingContext: 'Lấy ý kiến hội viên & biểu quyết CLB',
      academicYear: surveyAcademicYear.trim() || 'Năm học 2026 - 2027',
      anonymityMode: surveyAnonymity,
      status: 'open',
      createdBy: `${currentUser.name} (${getHighestPositionOnly(currentUser.position)})`,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      questions: validQuestions,
      responses: []
    };

    await syncSurveysToServer([newPoll, ...surveys]);
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
    setIsCreateSurveyOpen(false);
    setSurveyTitle('');
    setSurveyDesc('');
    setBannerMsg(`Đã phát hành phiếu khảo sát "${newPoll.title}"!`);
    setTimeout(() => setBannerMsg(null), 5000);
  };

  const handleSubmitSurveyResponse = async (poll: ClubSurveyPoll) => {
    if (isAlumniViewerOnly) return;
    const answers = userDraftAnswers[poll.id] || {};
    for (const q of poll.questions) {
      if (q.required) {
        const val = answers[q.id];
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === 'string' && !val.trim())) {
          alert(`Vui lòng trả lời câu hỏi bắt buộc: "${q.text}"`);
          return;
        }
      }
    }

    const isAnon = poll.anonymityMode === 'anonymous';
    const newResp: SurveyResponseItem = {
      id: `resp-${Date.now()}`,
      respondentId: isAnon ? `ANON-${Math.floor(1000 + Math.random() * 9000)}` : currentUser.id,
      respondentName: isAnon ? 'Thành viên ẩn danh' : currentUser.name,
      respondentStudentId: isAnon ? 'ẨN DANH' : currentUser.studentId,
      respondentDept: isAnon ? 'Bảo mật' : currentUser.department,
      submittedAt: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      answers
    };

    const nextSurveys = surveys.map((s) =>
      s.id === poll.id
        ? {
            ...s,
            responses: [newResp, ...s.responses.filter((r) => isAnon || r.respondentId !== currentUser.id)]
          }
        : s
    );

    await syncSurveysToServer(nextSurveys);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
    setBannerMsg(`Đã gửi ý kiến đóng góp vào phiếu "${poll.title}" thành công!`);
    setTimeout(() => setBannerMsg(null), 4500);
  };

  // =========================================================================
  // PHẦN 2: TRÌNH TẠO BIÊN BẢN CUỘC HỌP CHUẨN THỂ THỨC A4 (LỀ 3-2-2-2)
  // =========================================================================
  const todayObj = new Date();
  const [docNumber, setDocNumber] = useState('01/BB-CLB');
  const [docDay, setDocDay] = useState(String(todayObj.getDate()).padStart(2, '0'));
  const [docMonth, setDocMonth] = useState(String(todayObj.getMonth() + 1).padStart(2, '0'));
  const [docYear, setDocYear] = useState(String(todayObj.getFullYear()));
  const [meetingTitle, setMeetingTitle] = useState('Triển khai kế hoạch hoạt động tháng & phân công nhiệm vụ 4 ban');
  const [startHour, setStartHour] = useState('18');
  const [startMinute, setStartMinute] = useState('30');
  const [location, setLocation] = useState('Phòng họp tầng 3 — Thư viện Trường Đại học An Giang');
  const [chairName, setChairName] = useState(currentUser.name);
  // Chỉ lấy chức vụ cao nhất, không kèm chức danh kiêm nhiệm
  const [chairRole, setChairRole] = useState(getHighestPositionOnly(currentUser.position));
  const [secretaryName, setSecretaryName] = useState('');
  const [guests, setGuests] = useState('');
  const [totalSummoned, setTotalSummoned] = useState<number>(Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length));
  const [totalPresent, setTotalPresent] = useState<number>(Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length));
  const [absentReasonNote, setAbsentReasonNote] = useState('0 hội viên (Có lý do: 0; Không lý do: 0)');

  const [openingReason, setOpeningReason] = useState(
    'Đồng chí Chủ tọa tuyên bố lý do tổ chức cuộc họp, giới thiệu đại biểu tham dự và thông qua chương trình làm việc của hội nghị.'
  );

  const [includeDiscussions, setIncludeDiscussions] = useState<boolean>(true);
  const [discussions, setDiscussions] = useState<DiscussionOpinionRow[]>([
    {
      id: 'disc-1',
      speaker: 'Ban Nội dung & Ban Truyền thông',
      content: 'Đề xuất chủ đề truyền thông sách tháng mới và thống nhất tiến độ thiết kế ấn phẩm.'
    }
  ]);

  const [includeVoting, setIncludeVoting] = useState<boolean>(true);
  const [voteRows, setVoteRows] = useState<VoteTableRow[]>([
    {
      id: 'vr-1',
      fullName: 'Thông qua dự thảo Kế hoạch hoạt động trọng tâm',
      branch: 'Toàn thể CLB',
      roleOrContent: 'Biểu quyết thông qua kế hoạch & phân công 4 ban',
      votesFor: Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length),
      totalVotes: Math.max(1, userList.filter((u) => u.id !== 'bcn-root').length)
    }
  ]);

  const [consensusPercent, setConsensusPercent] = useState('100');
  const [endHour, setEndHour] = useState('20');
  const [endMinute, setEndMinute] = useState('15');
  const [isPreviewMinutesOpen, setIsPreviewMinutesOpen] = useState(false);

  // Ảnh chụp / Scan bản biên bản đã có chữ ký sống để tải ngược lên Kho Văn Kiện
  const [signedMinutesScanImage, setSignedMinutesScanImage] = useState<string>('');
  const [signedMinutesFileName, setSignedMinutesFileName] = useState<string>('');

  const absentCount = Math.max(0, totalSummoned - totalPresent);
  const attendancePercent = totalSummoned > 0 ? ((totalPresent / totalSummoned) * 100).toFixed(1) : '100';

  const validDiscussions = includeDiscussions
    ? discussions.filter((d) => d.speaker.trim() || d.content.trim())
    : [];
  const validVoteRows = includeVoting
    ? voteRows.filter((r) => r.fullName.trim() || r.roleOrContent.trim())
    : [];

  // Xuất file Word (.doc) chuẩn khổ A4 lề Trái 30mm, Trên 20mm, Phải 20mm, Dưới 20mm, không có chữ "(Đã ký)" chết
  const handleDownloadWordDoc = () => {
    const discussionsHtml =
      validDiscussions.length > 0
        ? `
          <p style="margin: 6pt 0 3pt 0;"><b>2. Các ý kiến trao đổi, thảo luận tại cuộc họp:</b></p>
          ${validDiscussions
            .map(
              (d) =>
                `<p style="margin: 2pt 0 2pt 18pt; text-align: justify;">- Ý kiến của ${d.speaker}: ${d.content}</p>`
            )
            .join('')}
        `
        : '';

    const votingSectionIndex = validDiscussions.length > 0 ? '3.' : '2.';
    const votingHtml =
      validVoteRows.length > 0
        ? `
          <p style="margin: 6pt 0 3pt 0;"><b>${votingSectionIndex} Biểu quyết / Quyết nghị của hội nghị:</b></p>
          <p style="margin: 2pt 0 6pt 18pt; text-align: justify;">Hội nghị tiến hành biểu quyết đối với các nội dung/danh sách dự kiến. Kết quả cụ thể như sau:</p>
          <table style="width: 100%; border-collapse: collapse; font-size: 12pt; margin-bottom: 8pt;">
            <thead>
              <tr>
                <th style="border: 1px solid #000; padding: 5pt; text-align: center; width: 35pt;">TT</th>
                <th style="border: 1px solid #000; padding: 5pt; text-align: left;">Họ và tên / Nội dung</th>
                <th style="border: 1px solid #000; padding: 5pt; text-align: left;">Chi hội</th>
                <th style="border: 1px solid #000; padding: 5pt; text-align: left;">Chức vụ / Nội dung</th>
                <th style="border: 1px solid #000; padding: 5pt; text-align: center;">Kết quả biểu quyết</th>
              </tr>
            </thead>
            <tbody>
              ${validVoteRows
                .map((row, idx) => {
                  const pct = row.totalVotes > 0 ? ((row.votesFor / row.totalVotes) * 100).toFixed(1) : '100';
                  return `
                    <tr>
                      <td style="border: 1px solid #000; padding: 5pt; text-align: center;">${idx + 1}</td>
                      <td style="border: 1px solid #000; padding: 5pt;">${row.fullName}</td>
                      <td style="border: 1px solid #000; padding: 5pt;">${row.branch}</td>
                      <td style="border: 1px solid #000; padding: 5pt;">${row.roleOrContent}</td>
                      <td style="border: 1px solid #000; padding: 5pt; text-align: center;">${row.votesFor}/${row.totalVotes} (${pct}%)</td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        `
        : '';

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8" />
        <title>Bien ban ${docNumber}</title>
        <style>
          @page WordSection1 {
            size: 210mm 297mm;
            margin: 20mm 20mm 20mm 30mm;
          }
          div.WordSection1 {
            page: WordSection1;
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.25;
            color: #000000;
          }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12pt;">
            <tr>
              <td style="width: 52%; text-align: center; vertical-align: top;">
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">HỘI SINH VIÊN TRƯỜNG ĐẠI HỌC AN GIANG</div>
                <div style="font-weight: bold; font-size: 12pt; text-transform: uppercase;">BCN CLB ĐỌC VÀ GIỚI THIỆU SÁCH</div>
                <div style="font-weight: bold;">***</div>
                <div style="margin-top: 4pt; font-size: 13pt;">Số: ${docNumber}</div>
              </td>
              <td style="width: 48%; text-align: right; vertical-align: bottom; font-style: italic; font-size: 13pt;">
                An Giang, ngày ${docDay} tháng ${docMonth} năm ${docYear}
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin: 12pt 0;">
            <div style="font-weight: bold; font-size: 14pt; text-transform: uppercase;">BIÊN BẢN</div>
            <div style="font-weight: bold; font-size: 13.5pt;">${meetingTitle}</div>
            <div>--------------------------------------------</div>
          </div>

          <p style="margin: 4pt 0; text-align: justify;"><b>1. Thời gian:</b> Vào lúc ${startHour} giờ ${startMinute} phút, ngày ${docDay} tháng ${docMonth} năm ${docYear}.</p>
          <p style="margin: 4pt 0; text-align: justify;"><b>2. Địa điểm:</b> ${location}.</p>
          <p style="margin: 4pt 0;"><b>3. Thành phần tham dự:</b></p>
          <p style="margin: 2pt 0 2pt 18pt;">- Chủ tọa: ${chairName} - ${chairRole}.</p>
          <p style="margin: 2pt 0 2pt 18pt;">- Thư ký: ${secretaryName || '........................................'} - Thư ký cuộc họp.</p>
          ${guests.trim() ? `<p style="margin: 2pt 0 2pt 18pt;">- Khách mời / Đại biểu: ${guests}.</p>` : ''}
          <p style="margin: 2pt 0 6pt 18pt; text-align: justify;">- Tổng số hội viên/thành viên triệu tập: ${totalSummoned} hội viên. Có mặt: ${totalPresent} hội viên (đạt tỷ lệ ${attendancePercent}%). Vắng: ${absentReasonNote}.</p>

          <p style="margin: 8pt 0 4pt 0;"><b>II. NỘI DUNG CUỘC HỌP:</b></p>
          <p style="margin: 4pt 0 2pt 0;"><b>1. Tuyên bố lý do, giới thiệu đại biểu và thông qua chương trình cuộc họp:</b></p>
          <p style="margin: 2pt 0 6pt 18pt; text-align: justify;">${openingReason}</p>

          ${discussionsHtml}
          ${votingHtml}

          <p style="margin: 8pt 0 4pt 0;"><b>III. KẾT LUẬN CUỘC HỌP / THỐNG NHẤT CHUNG:</b></p>
          <p style="margin: 2pt 0 4pt 0; text-align: justify;">Hội nghị thống nhất ${consensusPercent}% với các nội dung đã thảo luận và quyết nghị như trên. Giao các đồng chí có liên quan hoàn chỉnh hồ sơ, thủ tục trình Ban Thư ký Hội Sinh viên Trường Đại học An Giang xem xét quyết định.</p>
          <p style="margin: 2pt 0 14pt 0;">Cuộc họp kết thúc vào lúc ${endHour} giờ ${endMinute} phút cùng ngày./.</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 16pt;">
            <tr>
              <td style="width: 50%; text-align: center; vertical-align: top;">
                <div style="font-weight: bold; text-transform: uppercase;">THƯ KÝ</div>
                <div style="height: 65pt;"></div>
                <div style="font-weight: bold;">${secretaryName || ''}</div>
              </td>
              <td style="width: 50%; text-align: center; vertical-align: top;">
                <div style="font-weight: bold; text-transform: uppercase;">CHỦ TỌA</div>
                <div style="height: 65pt;"></div>
                <div style="font-weight: bold;">${chairName}</div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bien_Ban_${docNumber.replace(/[^a-zA-Z0-9-_]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // In ra PDF A4 chuẩn lề Trái 30mm, Trên 20mm, Phải 20mm, Dưới 20mm qua cửa sổ in sạch sẽ
  const handlePrintCleanA4 = () => {
    const printArea = document.getElementById('printable-minutes-a4');
    if (!printArea) return;
    const printWin = window.open('', '_blank', 'width=900,height=1100');
    if (!printWin) {
      window.print();
      return;
    }

    printWin.document.open();
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Biên bản ${docNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 20mm 20mm 30mm;
          }
          body {
            font-family: "Times New Roman", Times, serif;
            font-size: 13pt;
            line-height: 1.28;
            color: #000000;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .vote-table th, .vote-table td {
            border: 1px solid #000000;
            padding: 5pt 6pt;
            font-size: 12pt;
          }
          p {
            margin: 3.5pt 0;
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            window.close();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Lưu bản chụp / scan biên bản đã có chữ ký sống vào Kho Lưu Trữ Văn Kiện CLB
  const handleArchiveSignedMinutes = () => {
    if (!onSaveMinutesToArchive) return;
    if (!signedMinutesScanImage) {
      alert('Vui lòng chụp hoặc tải lên ảnh/file bản Biên bản đã ký sống trước khi lưu vào Kho Văn Kiện!');
      return;
    }

    const summaryText = `Số biên bản: ${docNumber} • Ngày ${docDay}/${docMonth}/${docYear} • Địa điểm: ${location} • Chủ tọa: ${chairName} (${chairRole}) • Thư ký: ${secretaryName || 'Thư ký CLB'} • Sĩ số: ${totalPresent}/${totalSummoned} (${attendancePercent}%). Đã đính kèm bản có chữ ký sống.`;

    onSaveMinutesToArchive({
      title: `[Biên Bản ${docNumber}] ${meetingTitle}`,
      documentNumber: docNumber,
      issuedDate: `${docDay}/${docMonth}/${docYear}`,
      proposedBy: chairName,
      proposedById: currentUser.id,
      department: 'Nhân sự & Kế hoạch' as DepartmentType,
      assignedDept: 'Nhân sự & Kế hoạch' as DepartmentType,
      description: summaryText,
      timeline: `Ngày ${docDay}/${docMonth}/${docYear}`,
      targetAudience: `Số: ${docNumber}`,
      priority: 'high' as const,
      status: 'approved' as const,
      archivedAt: `${docDay}/${docMonth}/${docYear}`,
      createdAt: `${docDay}/${docMonth}/${docYear}`,
      budgetEstimate: 0,
      actionItems: validDiscussions.map((d) => `${d.speaker}: ${d.content}`),
      attachmentUrl: signedMinutesScanImage,
      attachmentName: signedMinutesFileName || `Bien_Ban_Da_Ky_${docNumber}.jpg`,
      attachmentType: signedMinutesScanImage.startsWith('data:application/pdf') ? 'pdf' : 'image'
    });

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setBannerMsg(`Đã lưu Biên bản có chữ ký sống số "${docNumber}" vào Kho Văn Kiện CLB!`);
    setSignedMinutesScanImage('');
    setSignedMinutesFileName('');
    setTimeout(() => setBannerMsg(null), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="rounded-3xl p-6 sm:p-7 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="text-xs font-black uppercase tracking-widest text-[#8C3B1E]">
            Hội Sinh Viên Trường Đại Học An Giang • Hành Chính & Dân Chủ CLB
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#382215] font-serif-vintage tracking-tight">
            Khảo Sát Ý Kiến, Biểu Quyết & Biên Bản Cuộc Họp
          </h2>
          <p className="text-xs sm:text-sm text-[#4A3525] leading-relaxed">
            Soạn thảo biên bản chuẩn thể thức A4 (<strong>lề Trái 30mm · Trên/Phải/Dưới 20mm</strong>), tải file Word/PDF để ký sống và lưu bản đã ký vào Kho Văn Kiện.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#F2E5C9] p-1.5 rounded-2xl border-2 border-[#382215] shadow-[3px_3px_0px_#382215] shrink-0">
          <button
            type="button"
            onClick={() => setSubTab('minutes')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
              subTab === 'minutes' ? 'bg-[#245351] text-[#FFE29A]' : 'text-[#382215] hover:bg-white/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Tạo Biên Bản Cuộc Họp</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('surveys')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition ${
              subTab === 'surveys' ? 'bg-[#C8532B] text-white' : 'text-[#382215] hover:bg-white/60'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Khảo Sát & Biểu Quyết ({surveys.length})</span>
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className="p-4 rounded-2xl bg-[#FAF3E3] border-2 border-[#486A39] text-[#1E3A24] text-xs font-bold flex items-center justify-between shadow-[3px_3px_0px_#382215]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#486A39]" />
            <span>{bannerMsg}</span>
          </div>
          <button type="button" onClick={() => setBannerMsg(null)} className="cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB A: KHẢO SÁT, ĐÓNG GÓP Ý KIẾN & BIỂU QUYẾT
         ========================================================================= */}
      {subTab === 'surveys' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF3E3] p-4 rounded-2xl border-2 border-[#382215]">
            <div>
              <h3 className="font-black text-base text-[#382215] font-serif-vintage">
                Danh Sách Phiếu Khảo Sát & Biểu Quyết Đang Mở
              </h3>
              <p className="text-xs text-[#6E472B]">
                Hỗ trợ biểu quyết công khai danh tính hoặc ẩn danh tuyệt đối tùy theo tính chất từng phiên họp.
              </p>
            </div>

            {isBcnLeader && (
              <button
                type="button"
                onClick={() => setIsCreateSurveyOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#245351] hover:bg-[#193B39] text-[#FFE29A] font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[3px_3px_0px_#382215] cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo Form Khảo Sát / Biểu Quyết Mới</span>
              </button>
            )}
          </div>

          {surveys.length === 0 ? (
            <div className="p-10 text-center rounded-3xl bg-[#FAF3E3] border-2 border-dashed border-[#382215]/30 space-y-2">
              <Vote className="w-10 h-10 text-[#6E472B]/50 mx-auto" />
              <div className="font-black text-sm text-[#382215]">Chưa có phiếu khảo sát hay biểu quyết nào</div>
            </div>
          ) : (
            <div className="space-y-6">
              {surveys.map((poll) => {
                const isAnon = poll.anonymityMode === 'anonymous';
                const alreadySubmitted = !isAnon && poll.responses.some((r) => r.respondentId === currentUser.id);
                const draftAns = userDraftAnswers[poll.id] || {};

                return (
                  <div
                    key={poll.id}
                    className="rounded-3xl p-6 border-3 border-[#382215] bg-[#FAF3E3] shadow-[5px_5px_0px_#382215] space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b-2 border-[#382215]/15">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border border-[#382215] flex items-center gap-1 ${
                              isAnon ? 'bg-[#382215] text-[#FFE29A]' : 'bg-[#E5F0E4] text-[#1E3A24]'
                            }`}
                          >
                            {isAnon ? <Lock className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            <span>{isAnon ? 'Biểu quyết Ẩn danh 100%' : 'Công khai danh tính'}</span>
                          </span>
                          <span className="text-[11px] font-bold text-[#8C3B1E]">{poll.academicYear}</span>
                        </div>
                        <h4 className="font-black text-lg text-[#382215] font-serif-vintage">{poll.title}</h4>
                        {poll.description && <p className="text-xs text-[#5C432C]">{poll.description}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-xl bg-white border border-[#382215] text-xs font-black text-[#245351]">
                          {poll.responses.length} lượt tham gia
                        </span>
                        {isBcnLeader && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Xóa phiếu khảo sát này?')) {
                                syncSurveysToServer(surveys.filter((s) => s.id !== poll.id));
                              }
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {!isAlumniViewerOnly && (
                      <div className="space-y-3 bg-[#FFFDF8] p-4 rounded-2xl border-2 border-[#382215]/20">
                        {poll.questions.map((q, qIdx) => (
                          <div key={q.id} className="space-y-1.5 text-xs">
                            <label className="block font-black text-[#382215]">
                              Câu {qIdx + 1}: {q.text} {q.required && <span className="text-rose-600">*</span>}
                            </label>

                            {q.type === 'single_choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt, oIdx) => {
                                  const selected = draftAns[q.id] === opt;
                                  return (
                                    <button
                                      key={oIdx}
                                      type="button"
                                      onClick={() =>
                                        setUserDraftAnswers((prev) => ({
                                          ...prev,
                                          [poll.id]: { ...draftAns, [q.id]: opt }
                                        }))
                                      }
                                      className={`p-2.5 rounded-xl border-2 text-left font-bold cursor-pointer transition ${
                                        selected
                                          ? 'bg-[#245351] text-white border-[#382215]'
                                          : 'bg-[#FAF3E3] text-[#382215] border-[#382215]/20'
                                      }`}
                                    >
                                      {selected ? '● ' : '○ '}
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {q.type === 'text' && (
                              <textarea
                                rows={2}
                                value={(draftAns[q.id] as string) || ''}
                                onChange={(e) =>
                                  setUserDraftAnswers((prev) => ({
                                    ...prev,
                                    [poll.id]: { ...draftAns, [q.id]: e.target.value }
                                  }))
                                }
                                placeholder="Nhập ý kiến đóng góp xây dựng của bạn..."
                                className="w-full px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-xs"
                              />
                            )}
                          </div>
                        ))}

                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#6E472B]">
                            {isAnon
                              ? '🔒 Hệ thống không lưu tên hay MSSV của bạn khi gửi phiếu này.'
                              : `👤 Gửi dưới tên: ${currentUser.name} (${currentUser.studentId})`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSubmitSurveyResponse(poll)}
                            className="px-4 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{alreadySubmitted ? 'Cập Nhật Ý Kiến' : 'Gửi Biểu Quyết & Góp Ý'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {poll.responses.length > 0 && (
                      <div className="p-4 rounded-2xl bg-[#F2E5C9] border-2 border-[#382215]/30 space-y-3 text-xs">
                        <div className="flex items-center gap-1.5 font-black text-[#245351] uppercase">
                          <BarChart3 className="w-4 h-4" />
                          <span>Kết Quả Tổng Hợp ({poll.responses.length} phiếu)</span>
                        </div>

                        {poll.questions.map((q) => {
                          if (q.type === 'single_choice') {
                            return (
                              <div key={q.id} className="space-y-1.5">
                                <div className="font-bold text-[#382215]">{q.text}</div>
                                {q.options.map((opt) => {
                                  const count = poll.responses.filter((r) => r.answers[q.id] === opt).length;
                                  const pct = Math.round((count / poll.responses.length) * 100);
                                  return (
                                    <div key={opt} className="space-y-0.5">
                                      <div className="flex justify-between text-[11px] font-bold">
                                        <span>{opt}</span>
                                        <span>{count} phiếu ({pct}%)</span>
                                      </div>
                                      <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-[#382215]/30">
                                        <div className="h-full bg-[#245351]" style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          }

                          const textComments = poll.responses
                            .map((r) => ({
                              author: isAnon ? 'Thành viên ẩn danh' : `${r.respondentName} (${r.respondentStudentId})`,
                              text: String(r.answers[q.id] || '').trim()
                            }))
                            .filter((item) => item.text);

                          if (textComments.length === 0) return null;
                          return (
                            <div key={q.id} className="space-y-1.5 pt-1">
                              <div className="font-bold text-[#382215]">{q.text}</div>
                              {textComments.map((c, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#382215]/20">
                                  <div className="text-[10px] font-black text-[#8C3B1E]">{c.author}:</div>
                                  <p className="text-[#382215] mt-0.5">"{c.text}"</p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB B: TRÌNH TẠO BIÊN BẢN CUỘC HỌP CHUẨN A4 & TẢI LÊN BẢN KÝ SỐNG
         ========================================================================= */}
      {subTab === 'minutes' && (
        <div className="space-y-6">
          <div className="rounded-3xl p-6 sm:p-8 border-3 border-[#382215] bg-[#FAF3E3] shadow-[6px_6px_0px_#382215] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#382215]/20 pb-4">
              <div>
                <div className="text-[11px] font-black uppercase text-[#C8532B]">
                  Biểu Mẫu Hành Chính Chuẩn • BCN CLB Đọc và Giới Thiệu Sách AGU
                </div>
                <h3 className="text-xl font-black text-[#382215] font-serif-vintage">
                  Soạn Thảo Biên Bản Hội Nghị / Cuộc Họp
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewMinutesOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#245351] text-[#FFE29A] font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Xem Văn Bản A4 & In PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadWordDoc}
                  className="px-4 py-2 rounded-xl bg-[#FFFDF8] hover:bg-[#F2E5C9] text-[#382215] font-black text-xs flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#245351]" />
                  <span>Tải File Word (.doc)</span>
                </button>
              </div>
            </div>

            {/* 1. Số hiệu & Ngày lập biên bản */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1">Số biên bản *</label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="VD: 01/BB-CLB"
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-black text-[#382215] mb-1">Ngày / Tháng / Năm lập biên bản (Ngang hàng với Số biên bản) *</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={docDay}
                    onChange={(e) => setDocDay(e.target.value)}
                    placeholder="Ngày"
                    className="px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-center font-bold"
                  />
                  <input
                    type="text"
                    value={docMonth}
                    onChange={(e) => setDocMonth(e.target.value)}
                    placeholder="Tháng"
                    className="px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-center font-bold"
                  />
                  <input
                    type="text"
                    value={docYear}
                    onChange={(e) => setDocYear(e.target.value)}
                    placeholder="Năm"
                    className="px-3 py-2 rounded-xl border border-[#382215]/30 bg-white text-center font-bold"
                  />
                </div>
              </div>
            </div>

            {/* 2. Tên cuộc họp, Giờ bắt đầu & Địa điểm */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-black text-[#382215] mb-1">Tên Hội nghị / Cuộc họp *</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                />
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">Thời gian bắt đầu (Giờ : Phút)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">giờ</span>
                  <input
                    type="text"
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">phút</span>
                </div>
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-black text-[#382215] mb-1">Địa điểm tổ chức cuộc họp *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white"
              />
            </div>

            {/* 3. Thành phần tham dự */}
            <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-3 text-xs">
              <div className="font-black text-[#245351] uppercase">I. Thành Phần Tham Dự & Sĩ Số</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Họ tên Chủ tọa *</label>
                  <input
                    type="text"
                    value={chairName}
                    onChange={(e) => setChairName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Chức vụ cao nhất của Chủ tọa *</label>
                  <input
                    type="text"
                    value={chairRole}
                    onChange={(e) => setChairRole(e.target.value)}
                    placeholder="VD: Chủ nhiệm CLB"
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Họ tên Thư ký cuộc họp *</label>
                  <input
                    type="text"
                    value={secretaryName}
                    onChange={(e) => setSecretaryName(e.target.value)}
                    placeholder="Nhập họ tên Thư ký..."
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Khách mời / Đại biểu (Bỏ trống nếu không có)</label>
                <input
                  type="text"
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="VD: Đồng chí Nguyễn Văn A - Đại diện Ban Thư ký HSV Trường..."
                  className="w-full px-3 py-2 rounded-xl border bg-white"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold mb-1">Tổng triệu tập</label>
                  <input
                    type="number"
                    value={totalSummoned}
                    onChange={(e) => setTotalSummoned(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Có mặt (Tỷ lệ: {attendancePercent}%)</label>
                  <input
                    type="number"
                    value={totalPresent}
                    onChange={(e) => setTotalPresent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold text-emerald-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">Vắng ({absentCount} hội viên) — Ghi rõ lý do</label>
                  <input
                    type="text"
                    value={absentReasonNote}
                    onChange={(e) => setAbsentReasonNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 4. Nội dung cuộc họp & Tùy chọn Bật/Tắt Mục 2 & Mục 3 */}
            <div className="p-4 rounded-2xl bg-[#FFFDF8] border-2 border-[#382215]/20 space-y-4 text-xs">
              <div className="font-black text-[#245351] uppercase">II. Nội Dung Cuộc Họp</div>
              <div>
                <label className="block font-bold mb-1">1. Tuyên bố lý do, giới thiệu đại biểu và thông qua chương trình:</label>
                <textarea
                  rows={2}
                  value={openingReason}
                  onChange={(e) => setOpeningReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF3E3] border border-[#382215]/20 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 font-black text-[#382215] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDiscussions}
                      onChange={(e) => setIncludeDiscussions(e.target.checked)}
                      className="rounded text-[#245351]"
                    />
                    <span>2. Các ý kiến trao đổi, thảo luận tại cuộc họp (Bỏ tick để ẩn mục này)</span>
                  </label>

                  {includeDiscussions && (
                    <button
                      type="button"
                      onClick={() =>
                        setDiscussions((prev) => [
                          ...prev,
                          { id: `disc-${Date.now()}`, speaker: '', content: '' }
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#245351] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Thêm ý kiến
                    </button>
                  )}
                </div>

                {includeDiscussions && (
                  <div className="space-y-2">
                    {discussions.map((d, idx) => (
                      <div key={d.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                        <input
                          type="text"
                          value={d.speaker}
                          onChange={(e) =>
                            setDiscussions((prev) =>
                              prev.map((item) => (item.id === d.id ? { ...item, speaker: e.target.value } : item))
                            )
                          }
                          placeholder={`Họ tên / Bộ phận (${idx + 1})`}
                          className="sm:col-span-4 px-3 py-2 rounded-xl border bg-white font-bold"
                        />
                        <input
                          type="text"
                          value={d.content}
                          onChange={(e) =>
                            setDiscussions((prev) =>
                              prev.map((item) => (item.id === d.id ? { ...item, content: e.target.value } : item))
                            )
                          }
                          placeholder="Nội dung ý kiến đóng góp, thảo luận..."
                          className="sm:col-span-7 px-3 py-2 rounded-xl border bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setDiscussions((prev) => prev.filter((item) => item.id !== d.id))}
                          className="sm:col-span-1 p-2 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAF3E3] border border-[#382215]/20 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 font-black text-[#382215] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVoting}
                      onChange={(e) => setIncludeVoting(e.target.checked)}
                      className="rounded text-[#C8532B]"
                    />
                    <span>3. Biểu quyết / Quyết nghị của hội nghị (Bỏ tick để ẩn mục này)</span>
                  </label>

                  {includeVoting && (
                    <button
                      type="button"
                      onClick={() =>
                        setVoteRows((prev) => [
                          ...prev,
                          {
                            id: `vr-${Date.now()}`,
                            fullName: '',
                            branch: 'CLB Đọc Sách AGU',
                            roleOrContent: '',
                            votesFor: totalPresent,
                            totalVotes: totalPresent
                          }
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-[#C8532B] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Thêm dòng biểu quyết
                    </button>
                  )}
                </div>

                {includeVoting && (
                  <div className="space-y-2">
                    {voteRows.map((row, idx) => (
                      <div key={row.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border">
                        <input
                          type="text"
                          value={row.fullName}
                          onChange={(e) =>
                            setVoteRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, fullName: e.target.value } : r))
                            )
                          }
                          placeholder={`${idx + 1}. Họ và tên / Nội dung`}
                          className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border bg-white font-bold"
                        />
                        <input
                          type="text"
                          value={row.branch}
                          onChange={(e) =>
                            setVoteRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, branch: e.target.value } : r))
                            )
                          }
                          placeholder="Chi hội"
                          className="sm:col-span-2 px-2.5 py-1.5 rounded-lg border bg-white"
                        />
                        <input
                          type="text"
                          value={row.roleOrContent}
                          onChange={(e) =>
                            setVoteRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, roleOrContent: e.target.value } : r))
                            )
                          }
                          placeholder="Chức vụ / Nội dung"
                          className="sm:col-span-4 px-2.5 py-1.5 rounded-lg border bg-white"
                        />
                        <div className="sm:col-span-2 flex items-center gap-1">
                          <input
                            type="number"
                            value={row.votesFor}
                            onChange={(e) =>
                              setVoteRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, votesFor: Number(e.target.value) } : r))
                              )
                            }
                            className="w-12 px-1.5 py-1.5 rounded-lg border bg-white text-center font-bold"
                          />
                          <span>/</span>
                          <input
                            type="number"
                            value={row.totalVotes}
                            onChange={(e) =>
                              setVoteRows((prev) =>
                                prev.map((r) => (r.id === row.id ? { ...r, totalVotes: Number(e.target.value) } : r))
                              )
                            }
                            className="w-12 px-1.5 py-1.5 rounded-lg border bg-white text-center font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setVoteRows((prev) => prev.filter((r) => r.id !== row.id))}
                          className="sm:col-span-1 text-rose-600 flex justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 5. Kết luận & Giờ kết thúc */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1">III. Tỷ lệ thống nhất chung của Hội nghị (%)</label>
                <input
                  type="text"
                  value={consensusPercent}
                  onChange={(e) => setConsensusPercent(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-black text-emerald-800"
                />
              </div>

              <div>
                <label className="block font-black text-[#382215] mb-1">Thời gian kết thúc cuộc họp</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">giờ</span>
                  <input
                    type="text"
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="w-16 px-2.5 py-2 rounded-xl border bg-white text-center font-bold"
                  />
                  <span className="font-black">phút cùng ngày</span>
                </div>
              </div>
            </div>

            {/* 6. BƯỚC HOÀN TẤT: TẢI LÊN BẢN BIÊN BẢN ĐÃ CÓ CHỮ KÝ SỐNG ĐỂ LƯU VÀO KHO VĂN KIỆN */}
            {isBcnLeader && onSaveMinutesToArchive && (
              <div className="p-4 rounded-2xl bg-[#EAF2EF] border-2 border-[#245351] space-y-3 text-xs">
                <div className="font-black text-[#1E3A24] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#C8532B]" />
                  <span>Bước Lưu Trữ Chính Thức: Tải Lên Ảnh / Scan Biên Bản Đã Có Chữ Ký Sống</span>
                </div>
                <p className="text-[11px] text-[#382215]">
                  Sau khi in bản Word/PDF ở trên để Thư ký và Chủ tọa <strong>ký tên trực tiếp bằng bút mực</strong>, hãy chụp ảnh hoặc scan bản đã ký tải ngược lên đây để lưu vào Kho Văn Kiện CLB.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="px-4 py-2 rounded-xl bg-white border-2 border-[#245351] text-[#245351] font-black flex items-center gap-1.5 cursor-pointer">
                    <Camera className="w-4 h-4" />
                    <span>{signedMinutesFileName || 'Chọn ảnh / file PDF Biên bản đã ký sống'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf,.pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setSignedMinutesFileName(file.name);
                        if (file.type === 'application/pdf') {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === 'string') setSignedMinutesScanImage(reader.result);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          const b64 = await readFileAsDataUrl(file, 1400, 0.85);
                          setSignedMinutesScanImage(b64);
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleArchiveSignedMinutes}
                    className="px-5 py-2 rounded-xl bg-[#C8532B] hover:bg-[#A63E1B] text-white font-black flex items-center gap-1.5 border-2 border-[#382215] shadow-[2px_2px_0px_#382215] cursor-pointer"
                  >
                    <FolderArchive className="w-4 h-4 text-[#FFE29A]" />
                    <span>Lưu Bản Có Chữ Ký Sống Vào Kho CLB</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TẠO KHẢO SÁT MỚI */}
      {isCreateSurveyOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#FAF3E3] rounded-3xl border-3 border-[#382215] shadow-[6px_6px_0px_#382215] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#245351] text-white p-4.5 flex items-center justify-between border-b-2 border-[#382215]">
              <h4 className="font-black text-base font-serif-vintage">
                Tạo Phiếu Khảo Sát, Đóng Góp Ý Kiến & Biểu Quyết
              </h4>
              <button type="button" onClick={() => setIsCreateSurveyOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSurvey} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-black text-[#382215] mb-1">Tiêu đề phiếu khảo sát / biểu quyết *</label>
                <input
                  type="text"
                  required
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-[#382215]/30 bg-white font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black text-[#382215] mb-1">Năm học / Đợt khảo sát *</label>
                  <input
                    type="text"
                    required
                    value={surveyAcademicYear}
                    onChange={(e) => setSurveyAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-black text-[#382215] mb-1">Chế độ danh tính người góp ý *</label>
                  <select
                    value={surveyAnonymity}
                    onChange={(e) => setSurveyAnonymity(e.target.value as 'anonymous' | 'identified')}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#382215] bg-white font-bold"
                  >
                    <option value="identified">👤 Công khai danh tính (Ghi nhận họ tên & MSSV)</option>
                    <option value="anonymous">🎭 Ẩn danh tuyệt đối (Bảo mật danh tính 100%)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#382215]">Danh sách câu hỏi khảo sát:</span>
                  <button
                    type="button"
                    onClick={handleAddDraftQuestion}
                    className="px-3 py-1 rounded-lg bg-[#C8532B] text-white font-bold cursor-pointer"
                  >
                    + Thêm câu hỏi
                  </button>
                </div>

                {draftQuestions.map((q, idx) => (
                  <div key={q.id} className="p-3.5 rounded-2xl bg-white border-2 border-[#382215]/20 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#C8532B]">Câu {idx + 1}:</span>
                      <input
                        type="text"
                        required
                        value={q.text}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item) => (item.id === q.id ? { ...item, text: e.target.value } : item))
                          )
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg border font-bold"
                      />
                      <select
                        value={q.type}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id ? { ...item, type: e.target.value as SurveyQuestionItem['type'] } : item
                            )
                          )
                        }
                        className="px-2 py-1.5 rounded-lg border bg-[#FAF3E3] font-bold"
                      >
                        <option value="single_choice">Trắc nghiệm chọn 1</option>
                        <option value="text">Tự luận góp ý</option>
                      </select>
                    </div>

                    {q.type === 'single_choice' && (
                      <input
                        type="text"
                        value={q.options.join(', ')}
                        onChange={(e) =>
                          setDraftQuestions((prev) =>
                            prev.map((item) =>
                              item.id === q.id
                                ? { ...item, options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }
                                : item
                            )
                          )
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-[#FAF3E3]/50"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateSurveyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-200 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#245351] text-[#FFE29A] font-black cursor-pointer"
                >
                  Phát Hành Khảo Sát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC & IN PDF BIÊN BẢN CUỘC HỌP CHUẨN A4 */}
      {isPreviewMinutesOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[94vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-[#382215] text-white px-5 py-3.5 flex items-center justify-between">
              <span className="font-bold text-sm">Khổ A4 • Lề Trái 30mm, Trên/Phải/Dưới 20mm (Chưa ký sống)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadWordDoc}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-[#382215] font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Word (.doc)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintCleanA4}
                  className="px-4 py-1.5 rounded-xl bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu PDF A4</span>
                </button>
                <button type="button" onClick={() => setIsPreviewMinutesOpen(false)} className="cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* VÙNG IN A4 SẠCH SẼ */}
            <div className="overflow-y-auto bg-stone-200 p-4 sm:p-6 flex justify-center">
              <div
                id="printable-minutes-a4"
                className="bg-white text-black shadow-lg"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '20mm 20mm 20mm 30mm',
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '13pt',
                  lineHeight: 1.28
                }}
              >
                {/* Tiêu đề hành chính Hội Sinh Viên: Dòng An Giang ngày... ngang hàng với dòng Số: .../BB-CLB */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '54%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt' }}>
                          HỘI SINH VIÊN TRƯỜNG ĐẠI HỌC AN GIANG
                        </div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12pt' }}>
                          BCN CLB ĐỌC VÀ GIỚI THIỆU SÁCH
                        </div>
                        <div style={{ fontWeight: 'bold', lineHeight: 1 }}>***</div>
                        <div style={{ marginTop: '4pt', fontSize: '13pt' }}>Số: {docNumber}</div>
                      </td>
                      <td
                        style={{
                          width: '46%',
                          textAlign: 'right',
                          verticalAlign: 'bottom',
                          fontStyle: 'italic',
                          fontSize: '13pt'
                        }}
                      >
                        An Giang, ngày {docDay} tháng {docMonth} năm {docYear}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ textAlign: 'center', margin: '12pt 0' }}>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '14pt' }}>BIÊN BẢN</div>
                  <div style={{ fontWeight: 'bold', fontSize: '13.5pt', marginTop: '2pt' }}>{meetingTitle}</div>
                  <div>--------------------------------------------</div>
                </div>

                <div style={{ textAlign: 'justify' }}>
                  <p style={{ margin: '3.5pt 0' }}>
                    <strong>1. Thời gian:</strong> Vào lúc {startHour} giờ {startMinute} phút, ngày {docDay} tháng {docMonth} năm {docYear}.
                  </p>
                  <p style={{ margin: '3.5pt 0' }}>
                    <strong>2. Địa điểm:</strong> {location}.
                  </p>
                  <p style={{ margin: '3.5pt 0' }}>
                    <strong>3. Thành phần tham dự:</strong>
                  </p>
                  <p style={{ margin: '2pt 0 2pt 18pt' }}>
                    - Chủ tọa: {chairName} - {chairRole}.
                  </p>
                  <p style={{ margin: '2pt 0 2pt 18pt' }}>
                    - Thư ký: {secretaryName || '........................................'} - Thư ký cuộc họp.
                  </p>
                  {guests.trim() && (
                    <p style={{ margin: '2pt 0 2pt 18pt' }}>
                      - Khách mời / Đại biểu: {guests}.
                    </p>
                  )}
                  <p style={{ margin: '2pt 0 6pt 18pt' }}>
                    - Tổng số hội viên/thành viên triệu tập: {totalSummoned} hội viên. Có mặt: {totalPresent} hội viên (đạt tỷ lệ {attendancePercent}%). Vắng: {absentReasonNote}.
                  </p>

                  <p style={{ margin: '8pt 0 3pt 0', fontWeight: 'bold' }}>II. NỘI DUNG CUỘC HỌP:</p>
                  <p style={{ margin: '3pt 0 2pt 0' }}>
                    <strong>1. Tuyên bố lý do, giới thiệu đại biểu và thông qua chương trình cuộc họp:</strong>
                  </p>
                  <p style={{ margin: '2pt 0 6pt 18pt' }}>{openingReason}</p>

                  {validDiscussions.length > 0 && (
                    <>
                      <p style={{ margin: '6pt 0 2pt 0' }}>
                        <strong>2. Các ý kiến trao đổi, thảo luận tại cuộc họp:</strong>
                      </p>
                      {validDiscussions.map((d) => (
                        <p key={d.id} style={{ margin: '2pt 0 2pt 18pt' }}>
                          - Ý kiến của {d.speaker}: {d.content}
                        </p>
                      ))}
                    </>
                  )}

                  {validVoteRows.length > 0 && (
                    <>
                      <p style={{ margin: '6pt 0 2pt 0' }}>
                        <strong>{validDiscussions.length > 0 ? '3.' : '2.'} Biểu quyết / Quyết nghị của hội nghị:</strong>
                      </p>
                      <p style={{ margin: '2pt 0 6pt 18pt' }}>
                        Hội nghị tiến hành biểu quyết đối với các nội dung/danh sách dự kiến. Kết quả cụ thể như sau:
                      </p>

                      <table className="vote-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12pt', marginBottom: '8pt' }}>
                        <thead>
                          <tr>
                            <th style={{ border: '1px solid #000', padding: '5pt', textAlign: 'center', width: '35pt' }}>TT</th>
                            <th style={{ border: '1px solid #000', padding: '5pt', textAlign: 'left' }}>Họ và tên / Nội dung</th>
                            <th style={{ border: '1px solid #000', padding: '5pt', textAlign: 'left' }}>Chi hội</th>
                            <th style={{ border: '1px solid #000', padding: '5pt', textAlign: 'left' }}>Chức vụ / Nội dung</th>
                            <th style={{ border: '1px solid #000', padding: '5pt', textAlign: 'center' }}>Kết quả biểu quyết</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validVoteRows.map((row, idx) => {
                            const pct = row.totalVotes > 0 ? ((row.votesFor / row.totalVotes) * 100).toFixed(1) : '100';
                            return (
                              <tr key={row.id}>
                                <td style={{ border: '1px solid #000', padding: '5pt', textAlign: 'center' }}>{idx + 1}</td>
                                <td style={{ border: '1px solid #000', padding: '5pt' }}>{row.fullName}</td>
                                <td style={{ border: '1px solid #000', padding: '5pt' }}>{row.branch}</td>
                                <td style={{ border: '1px solid #000', padding: '5pt' }}>{row.roleOrContent}</td>
                                <td style={{ border: '1px solid #000', padding: '5pt', textAlign: 'center' }}>
                                  {row.votesFor}/{row.totalVotes} ({pct}%)
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}

                  <p style={{ margin: '8pt 0 3pt 0', fontWeight: 'bold' }}>III. KẾT LUẬN CUỘC HỌP / THỐNG NHẤT CHUNG:</p>
                  <p style={{ margin: '2pt 0 4pt 0' }}>
                    Hội nghị thống nhất {consensusPercent}% với các nội dung đã thảo luận và quyết nghị như trên. Giao các đồng chí có liên quan hoàn chỉnh hồ sơ, thủ tục trình Ban Thư ký Hội Sinh viên Trường Đại học An Giang xem xét quyết định.
                  </p>
                  <p style={{ margin: '2pt 0 12pt 0' }}>
                    Cuộc họp kết thúc vào lúc {endHour} giờ {endMinute} phút cùng ngày./.
                  </p>
                </div>

                {/* Chữ ký để trống hoàn toàn chữ "(Đã ký)" để in ra ký sống */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>THƯ KÝ</div>
                        <div style={{ height: '65pt' }} />
                        <div style={{ fontWeight: 'bold' }}>{secretaryName || ''}</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>CHỦ TỌA</div>
                        <div style={{ height: '65pt' }} />
                        <div style={{ fontWeight: 'bold' }}>{chairName}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
