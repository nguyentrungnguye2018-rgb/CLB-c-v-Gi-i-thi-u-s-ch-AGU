// server.ts
import express from "express";
export const app = express();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

// src/data/mockData.ts
var MASTER_PASSCODE = "AGU2026";
var SPECIAL_BCN_ACCOUNTS = [
  {
    id: "bcn-root",
    name: "C\xE2u l\u1EA1c b\u1ED9 \u0110\u1ECDc v\xE0 Gi\u1EDBi thi\u1EC7u s\xE1ch",
    nickname: "T\xE0i Kho\u1EA3n Ch\xEDnh CLB \u{1F3DB}\uFE0F",
    studentId: "CLB-ROOT-PERMANENT",
    email: "clb.docsach@agu.edu.vn",
    password: MASTER_PASSCODE,
    faculty: "\u0110\u1EA1i Di\u1EC7n To\xE0n Th\u1EC3 Sinh Vi\xEAn CLB",
    avatar: "/assets/aistudio/TUYE__N_THA_NH_VIE_N_778c37b9.png",
    role: "bcn_admin",
    adminType: "master_root",
    clubRole: "root",
    department: "BQT",
    departmentStatus: "approved",
    position: "T\xE0i Kho\u1EA3n Ch\xEDnh CLB (Qu\u1EA3n Tr\u1ECB T\u1ED1i Cao)",
    departmentRole: "leader",
    term: "V\u0129nh C\u1EEDu",
    readingStreak: 0,
    enewsStreak: 0,
    hasCheckedInToday: false,
    s5tProgress: 0,
    favoriteBook: "T\u1EE7 S\xE1ch Tri Th\u1EE9c CLB",
    joinDate: "2026",
    meritPoints: 0,
    badges: ["T\xE0i Kho\u1EA3n Ch\xEDnh CLB \u{1F3DB}\uFE0F"]
  }
];
var SAMPLE_USERS = [
  ...SPECIAL_BCN_ACCOUNTS
];
var INITIAL_TERM_HISTORY = [];
var INITIAL_RECRUITMENT_QUESTIONS = [
  {
    id: "rq-1",
    text: "B\u1EA1n th\u01B0\u1EDDng d\xE0nh th\u1EDDi gian \u0111\u1ECDc nh\u1EEFng th\u1EC3 lo\u1EA1i s\xE1ch n\xE0o nhi\u1EC1u nh\u1EA5t?",
    type: "multiple_choice",
    options: ["V\u0103n h\u1ECDc kinh \u0111i\u1EC3n & T\u1EA3n v\u0103n", "K\u1EF9 n\u0103ng m\u1EC1m & Ph\xE1t tri\u1EC3n b\u1EA3n th\xE2n", "T\xE2m l\xFD & Tri\u1EBFt h\u1ECDc", "Khoa h\u1ECDc & C\xF4ng ngh\u1EC7", "Truy\u1EC7n tranh & Trinh th\xE1m"],
    required: true
  },
  {
    id: "rq-2",
    text: "B\u1EA1n c\xF3 nguy\u1EC7n v\u1ECDng c\u1ED1ng hi\u1EBFn cho Ban chuy\xEAn m\xF4n n\xE0o?",
    type: "multiple_choice",
    options: ["Ban Truy\u1EC1n th\xF4ng (Thi\u1EBFt k\u1EBF poster, vi\u1EBFt E-News, TikTok)", "Ban N\u1ED9i dung (Bi\xEAn t\u1EADp s\xE1ch, \u0111\xE0m \u0111\u1EA1o v\u0103n h\u1ECDc)", "Ban Nh\xE2n s\u1EF1 & K\u1EBF ho\u1EA1ch (L\xEAn plan, t\u1ED5 ch\u1EE9c s\u1EF1 ki\u1EC7n, SV5T)", "Ban H\u1EADu c\u1EA7n (Qu\u1EA3n l\xFD t\u1EE7 s\xE1ch, \xE2m thanh, qu\xE0 t\u1EB7ng)"],
    required: true
  },
  {
    id: "rq-3",
    text: "N\u1EBFu \u0111\u01B0\u1EE3c ch\u1ECDn 1 cu\u1ED1n s\xE1ch l\xE0m b\u1EA1n \u0111\u1ED3ng h\xE0nh tr\xEAn hoang \u0111\u1EA3o, b\u1EA1n ch\u1ECDn cu\u1ED1n n\xE0o v\xE0 v\xEC sao?",
    type: "short_answer",
    required: true
  },
  {
    id: "rq-4",
    text: "B\u1EA1n c\xF3 th\u1EC3 d\xE0nh ra bao nhi\xEAu gi\u1EDD m\u1ED7i tu\u1EA7n cho c\xE1c ho\u1EA1t \u0111\u1ED9ng c\u1EE7a CLB?",
    type: "multiple_choice",
    options: ["3 - 5 gi\u1EDD / tu\u1EA7n", "5 - 8 gi\u1EDD / tu\u1EA7n", "Tr\xEAn 8 gi\u1EDD / tu\u1EA7n (To\xE0n t\xE2m to\xE0n \xFD)"],
    required: true
  },
  {
    id: "rq-5",
    text: "\u0110i\u1EC1u g\xEC khi\u1EBFn b\u1EA1n mu\u1ED1n n\u1ED9p \u0111\u01A1n gia nh\u1EADp CLB \u0110\u1ECDc v\xE0 Gi\u1EDBi thi\u1EC7u s\xE1ch k\u1EF3 n\xE0y?",
    type: "short_answer",
    required: false
  }
];
var S5T_CRITERIA_LIST = [
  {
    id: "crit-1",
    name: "\u0110\u1EA1o \u0111\u1EE9c t\u1ED1t",
    description: "\u0110i\u1EC3m r\xE8n luy\u1EC7n c\u1EA3 n\u0103m \u0111\u1EA1t t\u1EEB 90 \u0111i\u1EC3m tr\u1EDF l\xEAn (thang 100); Kh\xF4ng vi ph\u1EA1m ph\xE1p lu\u1EADt & quy ch\u1EBF; \u0110\u1EA1t th\xEAm \xEDt nh\u1EA5t 01 ti\xEAu ch\xED r\xE8n luy\u1EC7n t\u01B0 t\u01B0\u1EDFng, \u0111\u1EA1o \u0111\u1EE9c.",
    iconName: "ShieldCheck",
    requiredCount: 2,
    completedCount: 0,
    status: "in_progress",
    regulationArticle: "\u0110i\u1EC1u 5.2.1 Q\u0110 118/Q\u0110-HSV",
    mandatorySummary: "\u0110RL c\u1EA3 n\u0103m \u2265 90/100 \u0111i\u1EC3m & Kh\xF4ng vi ph\u1EA1m ph\xE1p lu\u1EADt, n\u1ED9i quy nh\xE0 tr\u01B0\u1EDDng, quy \u0111\u1ECBnh \u0111\u1ECBa ph\u01B0\u01A1ng v\xE0 c\u1ED9ng \u0111\u1ED3ng.",
    electiveSummary: "\u0110\u1EA1t th\xEAm \xEDt nh\u1EA5t 01 trong 06 ti\xEAu ch\xED v\u1EC1 r\xE8n luy\u1EC7n, t\u01B0 t\u01B0\u1EDFng ch\xEDnh tr\u1ECB, \u0111\u1EA1o \u0111\u1EE9c l\u1ED1i s\u1ED1ng.",
    electiveMinCount: 1,
    subRequirements: [
      {
        id: "crit-1-m1",
        type: "mandatory",
        title: "\u0110i\u1EC3m r\xE8n luy\u1EC7n \u0111\u1EA1t t\u1EEB 90 \u0111i\u1EC3m tr\u1EDF l\xEAn",
        detail: "\u0110i\u1EC3m r\xE8n luy\u1EC7n trung b\xECnh chung c\u1EA3 n\u0103m h\u1ECDc \u0111\u1EA1t t\u1EEB 90 \u0111i\u1EC3m tr\u1EDF l\xEAn tr\xEAn thang \u0111i\u1EC3m 100 theo quy ch\u1EBF B\u1ED9 GD&\u0110T."
      },
      {
        id: "crit-1-m2",
        type: "mandatory",
        title: "Ch\u1EA5p h\xE0nh ph\xE1p lu\u1EADt & n\u1ED9i quy",
        detail: "Kh\xF4ng vi ph\u1EA1m ph\xE1p lu\u1EADt v\xE0 c\xE1c quy ch\u1EBF, n\u1ED9i quy c\u1EE7a nh\xE0 tr\u01B0\u1EDDng, quy \u0111\u1ECBnh c\u1EE7a \u0111\u1ECBa ph\u01B0\u01A1ng v\xE0 c\u1ED9ng \u0111\u1ED3ng."
      },
      {
        id: "crit-1-e1",
        type: "elective",
        title: "\u0110\u1EA3ng vi\xEAn Ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc nhi\u1EC7m v\u1EE5",
        detail: "\u0110\u1EA1t m\u1EE9c x\u1EBFp lo\u1EA1i \u0110\u1EA3ng vi\xEAn Ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc nhi\u1EC7m v\u1EE5 trong n\u0103m g\u1EA7n nh\u1EA5t (\xE1p d\u1EE5ng cho sinh vi\xEAn l\xE0 \u0110\u1EA3ng vi\xEAn \u0110CSVN)."
      },
      {
        id: "crit-1-e2",
        type: "elective",
        title: "Thanh ni\xEAn ti\xEAn ti\u1EBFn l\xE0m theo l\u1EDDi B\xE1c",
        detail: "L\xE0 g\u01B0\u01A1ng \u0111i\u1EC3n h\xECnh trong vi\u1EC7c h\u1ECDc t\u1EADp v\xE0 l\xE0m theo t\u01B0 t\u01B0\u1EDFng, \u0111\u1EA1o \u0111\u1EE9c, phong c\xE1ch H\u1ED3 Ch\xED Minh \u0111\u01B0\u1EE3c bi\u1EC3u d\u01B0\u01A1ng t\u1EEB c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn."
      },
      {
        id: "crit-1-e3",
        type: "elective",
        title: "H\xE0nh \u0111\u1ED9ng d\u0169ng c\u1EA3m ho\u1EB7c c\u1EE9u ng\u01B0\u1EDDi, gi\xFAp ng\u01B0\u1EDDi neo \u0111\u01A1n",
        detail: "C\xF3 h\xE0nh \u0111\u1ED9ng d\u0169ng c\u1EA3m c\u1EE9u ng\u01B0\u1EDDi b\u1ECB n\u1EA1n, b\u1EAFt c\u01B0\u1EDBp, gi\xFAp ng\u01B0\u1EDDi ngh\xE8o, ng\u01B0\u1EDDi g\u1EB7p kh\xF3 kh\u0103n ho\u1EA1n n\u1EA1n \u0111\u01B0\u1EE3c khen th\u01B0\u1EDFng t\u1EEB c\u1EA5p c\u01A1 s\u1EDF tr\u1EDF l\xEAn ho\u1EB7c \u0111\u01B0\u1EE3c n\xEAu g\u01B0\u01A1ng tr\xEAn truy\u1EC1n th\xF4ng."
      },
      {
        id: "crit-1-e4",
        type: "elective",
        title: "Tham lu\u1EADn / Gi\u1EA3i th\u01B0\u1EDFng M\xE1c - L\xEAnin, T\u01B0 t\u01B0\u1EDFng HCM",
        detail: "C\xF3 tham lu\u1EADn, b\xE0i vi\u1EBFt tr\xECnh b\xE0y t\u1EA1i di\u1EC5n \u0111\xE0n h\u1ECDc thu\u1EADt ho\u1EB7c \u0111\u1EA1t th\xE0nh t\xEDch cao t\u1EA1i cu\u1ED9c thi c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn v\u1EC1 M\xE1c-L\xEAnin, T\u01B0 t\u01B0\u1EDFng H\u1ED3 Ch\xED Minh, L\u1ECBch s\u1EED v\u0103n h\xF3a VN."
      },
      {
        id: "crit-1-e5",
        type: "elective",
        title: "Ho\u1EA1t \u0111\u1ED9ng gi\xE1o d\u1EE5c truy\u1EC1n th\u1ED1ng y\xEAu n\u01B0\u1EDBc",
        detail: "Tham quan di t\xEDch l\u1ECBch s\u1EED, b\u1EA3o t\xE0ng; th\u0103m h\u1ECFi M\u1EB9 VNAH; th\u1EAFp n\u1EBFn tri \xE2n anh h\xF9ng li\u1EC7t s\u0129; h\xE1t ca kh\xFAc truy\u1EC1n th\u1ED1ng; ho\u1EA1t \u0111\u1ED9ng h\u01B0\u1EDBng v\u1EC1 bi\xEAn gi\u1EDBi h\u1EA3i \u0111\u1EA3o."
      },
      {
        id: "crit-1-e6",
        type: "elective",
        title: "Ho\u1EA1t \u0111\u1ED9ng gi\xE1o d\u1EE5c \u0111\u1EA1o \u0111\u1EE9c l\u1ED1i s\u1ED1ng & an ninh",
        detail: "Tham gia an ninh xung k\xEDch; tham gia ho\u1EA1t \u0111\u1ED9ng tuy\xEAn truy\u1EC1n v\u1EC1 ph\xE1p lu\u1EADt, ki\u1EBFn th\u1EE9c ph\xF2ng tr\xE1nh c\xE1c t\u1EC7 n\u1EA1n x\xE3 h\u1ED9i."
      }
    ]
  },
  {
    id: "crit-2",
    name: "H\u1ECDc t\u1EADp t\u1ED1t",
    description: "\u0110i\u1EC3m trung b\xECnh chung h\u1ECDc t\u1EADp c\u1EA3 n\u0103m \u0111\u1EA1t t\u1EEB 8.5/10 tr\u1EDF l\xEAn; Kh\xF4ng gian l\u1EADn thi c\u1EED; \u0110\u1EA1t th\xEAm \xEDt nh\u1EA5t 02 ti\xEAu ch\xED v\u1EC1 NCKH v\xE0 h\u1ECDc thu\u1EADt.",
    iconName: "GraduationCap",
    requiredCount: 3,
    completedCount: 0,
    status: "in_progress",
    regulationArticle: "\u0110i\u1EC1u 5.2.2 Q\u0110 118/Q\u0110-HSV",
    mandatorySummary: "\u0110TB h\u1ECDc t\u1EADp c\u1EA3 n\u0103m \u0111\u1EA1t t\u1EEB 8.5/10 (kh\xF4ng \xE1p d\u1EE5ng h\u1EC7 4 hay thang ch\u1EEF) & \u0110\u1ED9ng c\u01A1 h\u1ECDc t\u1EADp \u0111\xFAng \u0111\u1EAFn, kh\xF4ng vi ph\u1EA1m quy ch\u1EBF thi.",
    electiveSummary: "\u0110\u1EA1t th\xEAm \xEDt nh\u1EA5t 02 trong 06 ti\xEAu ch\xED v\u1EC1 NCKH, b\xE0i b\xE1o khoa h\u1ECDc ho\u1EB7c gi\u1EA3i th\u01B0\u1EDFng h\u1ECDc thu\u1EADt.",
    electiveMinCount: 2,
    subRequirements: [
      {
        id: "crit-2-m1",
        type: "mandatory",
        title: "\u0110i\u1EC3m TB chung h\u1ECDc t\u1EADp c\u1EA3 n\u0103m \u2265 8.5/10",
        detail: "\u0110i\u1EC3m trung b\xECnh chung h\u1ECDc t\u1EADp c\u1EA3 n\u0103m h\u1ECDc \u0111\u1EA1t t\u1EEB 8.5/10 tr\u1EDF l\xEAn (\xE1p d\u1EE5ng h\u1EC7 \u0111i\u1EC3m 10, kh\xF4ng quy \u0111\u1ED5i thang 4 ho\u1EB7c thang ch\u1EEF)."
      },
      {
        id: "crit-2-m2",
        type: "mandatory",
        title: "Th\xE1i \u0111\u1ED9 h\u1ECDc t\u1EADp \u0111\xFAng \u0111\u1EAFn, trung th\u1EF1c",
        detail: "C\xF3 \u0111\u1ED9ng c\u01A1, th\xE1i \u0111\u1ED9 h\u1ECDc t\u1EADp \u0111\xFAng \u0111\u1EAFn; kh\xF4ng gian l\u1EADn trong thi c\u1EED, kh\xF4ng vi ph\u1EA1m quy ch\u1EBF thi."
      },
      {
        id: "crit-2-e1",
        type: "elective",
        title: "Sinh ho\u1EA1t th\u01B0\u1EDDng xuy\xEAn t\u1EA1i CLB h\u1ECDc thu\u1EADt AGU",
        detail: "Tham gia sinh ho\u1EA1t th\u01B0\u1EDDng xuy\xEAn t\u1EA1i \xEDt nh\u1EA5t 01 C\xE2u l\u1EA1c b\u1ED9 h\u1ECDc thu\u1EADt tr\u1EF1c thu\u1ED9c H\u1ED9i Sinh vi\xEAn Tr\u01B0\u1EDDng (xem Ph\u1EE5 l\u1EE5c 1 Q\u0110 118)."
      },
      {
        id: "crit-2-e2",
        type: "elective",
        title: "\u0110\u1EC1 t\xE0i nghi\xEAn c\u1EE9u khoa h\u1ECDc sinh vi\xEAn",
        detail: "C\xF3 \u0111\u1EC1 t\xE0i NCKH t\u1EEB c\u1EA5p Khoa tr\u1EDF l\xEAn (tham gia v\u1EDBi t\u01B0 c\xE1ch l\xE0 ch\u1EE7 nhi\u1EC7m \u0111\u1EC1 t\xE0i ho\u1EB7c th\xE0nh vi\xEAn) trong n\u0103m h\u1ECDc (kh\xF4ng t\xEDnh kh\xF3a lu\u1EADn t\u1ED1t nghi\u1EC7p)."
      },
      {
        id: "crit-2-e3",
        type: "elective",
        title: "B\xE0i vi\u1EBFt t\u1EA1p ch\xED chuy\xEAn ng\xE0nh ho\u1EB7c k\u1EF7 y\u1EBFu h\u1ED9i th\u1EA3o",
        detail: "C\xF3 b\xE0i vi\u1EBFt \u0111\u0103ng tr\xEAn t\u1EA1p ch\xED chuy\xEAn ng\xE0nh ho\u1EB7c b\xE0i tham lu\u1EADn trong k\u1EF7 y\u1EBFu h\u1ED9i th\u1EA3o khoa h\u1ECDc chuy\xEAn ng\xE0nh t\u1EEB c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn."
      },
      {
        id: "crit-2-e4",
        type: "elective",
        title: "S\u1EA3n ph\u1EA9m s\xE1ng t\u1EA1o / S\u1EDF h\u1EEFu tr\xED tu\u1EC7",
        detail: "C\xF3 s\u1EA3n ph\u1EA9m s\xE1ng t\u1EA1o \u0111\u01B0\u1EE3c c\u1EA5p b\u1EB1ng s\xE1ng ch\u1EBF, c\u1EA5p gi\u1EA5y ph\xE9p xu\u1EA5t b\u1EA3n ho\u1EB7c \u0111\u1EA1t c\xE1c gi\u1EA3i th\u01B0\u1EDFng khoa h\u1ECDc t\u1EEB c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn."
      },
      {
        id: "crit-2-e5",
        type: "elective",
        title: "\u0110\u1ED9i tuy\u1EC3n Khoa thi h\u1ECDc thu\u1EADt c\u1EA5p Tr\u01B0\u1EDDng",
        detail: "L\xE0 th\xE0nh vi\xEAn c\xE1c \u0111\u1ED9i tuy\u1EC3n Khoa tham gia v\xE0 \u0111\u1EA1t gi\u1EA3i t\u1EA1i c\xE1c k\u1EF3 thi h\u1ECDc thu\u1EADt c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn."
      },
      {
        id: "crit-2-e6",
        type: "elective",
        title: "\u0110\u1EA1t gi\u1EA3i th\u01B0\u1EDFng cu\u1ED9c thi h\u1ECDc thu\u1EADt c\u1EA5p Khoa tr\u1EDF l\xEAn",
        detail: "\u0110\u1EA1t gi\u1EA3i th\u01B0\u1EDFng trong c\xE1c cu\u1ED9c thi h\u1ECDc thu\u1EADt do c\u1EA5p Khoa tr\u1EDF l\xEAn t\u1ED5 ch\u1EE9c."
      }
    ]
  },
  {
    id: "crit-3",
    name: "Th\u1EC3 l\u1EF1c t\u1ED1t",
    description: '\u0110\u1EA1t danh hi\u1EC7u "Sinh vi\xEAn kh\u1ECFe" / "Thanh ni\xEAn kh\u1ECFe" c\u1EA5p Tr\u01B0\u1EDDng ho\u1EB7c \u0111\u1EA1t gi\u1EA3i thi \u0111\u1EA5u th\u1EC3 d\u1EE5c th\u1EC3 thao t\u1EEB c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn.',
    iconName: "Activity",
    requiredCount: 1,
    completedCount: 0,
    status: "in_progress",
    regulationArticle: "\u0110i\u1EC1u 5.2.3 Q\u0110 118/Q\u0110-HSV",
    mandatorySummary: "\u0110\u1EA1t \xEDt nh\u1EA5t 01 trong 03 ti\xEAu ch\xED v\u1EC1 th\u1EC3 l\u1EF1c ho\u1EB7c gi\u1EA3i thi \u0111\u1EA5u th\u1EC3 thao c\u1EA5p Tr\u01B0\u1EDDng.",
    electiveSummary: "Tham gia s\xE1t h\u1EA1ch th\u1EC3 l\u1EF1c ho\u1EB7c thi \u0111\u1EA5u TDTT \u0111\u1EA1t chu\u1EA9n.",
    electiveMinCount: 1,
    specialNote: "Sinh vi\xEAn khuy\u1EBFt t\u1EADt kh\xF4ng b\u1EAFt bu\u1ED9c x\xE9t ti\xEAu chu\u1EA9n v\u1EC1 th\u1EC3 l\u1EF1c (c\u1EA7n b\u1ED5 sung gi\u1EA5y ch\u1EE9ng nh\u1EADn/x\xE1c nh\u1EADn khuy\u1EBFt t\u1EADt khi x\xE9t).",
    subRequirements: [
      {
        id: "crit-3-e1",
        type: "elective",
        title: 'Danh hi\u1EC7u "Sinh vi\xEAn kh\u1ECFe" / "Thanh ni\xEAn kh\u1ECFe"',
        detail: 'Tham gia c\xE1c ho\u1EA1t \u0111\u1ED9ng s\xE1t h\u1EA1ch th\u1EC3 l\u1EF1c v\xE0 \u0111\u1EA1t danh hi\u1EC7u "Sinh vi\xEAn kh\u1ECFe" ho\u1EB7c "Thanh ni\xEAn kh\u1ECFe" c\u1EA5p Tr\u01B0\u1EDDng (do BTK H\u1ED9i Sinh vi\xEAn Tr\u01B0\u1EDDng c\xF4ng nh\u1EADn).'
      },
      {
        id: "crit-3-e2",
        type: "elective",
        title: "\u0110\u1EA1t gi\u1EA3i t\u1EA1i c\xE1c gi\u1EA3i th\u1EC3 thao c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn",
        detail: "Tham gia v\xE0 \u0111\u1EA1t gi\u1EA3i t\u1EA1i c\xE1c gi\u1EA3i thi \u0111\u1EA5u th\u1EC3 d\u1EE5c th\u1EC3 thao t\u1EEB c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn."
      },
      {
        id: "crit-3-e3",
        type: "elective",
        title: "Th\xE0nh vi\xEAn \u0111\u1ED9i tuy\u1EC3n th\u1EC3 thao c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn",
        detail: "L\xE0 th\xE0nh vi\xEAn \u0111\u1ED9i tuy\u1EC3n c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn tham gia d\u1EF1 thi c\xE1c m\xF4n TDTT c\u1EA5p T\u1EC9nh, \u0110\u1EA1i h\u1ECDc Qu\u1ED1c gia, Khu v\u1EF1c..."
      }
    ]
  },
  {
    id: "crit-4",
    name: "T\xECnh nguy\u1EC7n t\u1ED1t",
    description: "Tham gia \xEDt nh\u1EA5t 05 ng\xE0y t\xECnh nguy\u1EC7n/n\u0103m h\u1ECDc (t\xEDnh c\u1ED9ng d\u1ED3n th\u1EF1c t\u1EBF), b\u1EAFt bu\u1ED9c c\xF3 gi\u1EA5y ch\u1EE9ng nh\u1EADn/x\xE1c nh\u1EADn t\u1EEB \u0111\u01A1n v\u1ECB t\u1ED5 ch\u1EE9c.",
    iconName: "HeartHandshake",
    requiredCount: 5,
    completedCount: 0,
    status: "in_progress",
    regulationArticle: "\u0110i\u1EC1u 5.2.4 Q\u0110 118/Q\u0110-HSV",
    mandatorySummary: "Tham gia \xEDt nh\u1EA5t 05 ng\xE0y t\xECnh nguy\u1EC7n/n\u0103m h\u1ECDc (\u0111\u01B0\u1EE3c t\xEDnh theo s\u1ED1 ng\xE0y th\u1EF1c t\u1EBF tham gia c\xE1c ho\u1EA1t \u0111\u1ED9ng t\xECnh nguy\u1EC7n c\u1ED9ng d\u1ED3n).",
    electiveSummary: "M\u1ED7i ho\u1EA1t \u0111\u1ED9ng t\xECnh nguy\u1EC7n tr\u1EF1c ti\u1EBFp c\xF3 gi\u1EA5y ch\u1EE9ng nh\u1EADn/x\xE1c nh\u1EADn s\u1EBD t\xEDch l\u0169y s\u1ED1 ng\xE0y t\u01B0\u01A1ng \u1EE9ng.",
    electiveMinCount: 5,
    specialNote: "B\u1EAFt bu\u1ED9c c\xF3 gi\u1EA5y ch\u1EE9ng nh\u1EADn ho\u1EB7c x\xE1c nh\u1EADn c\u1EE7a \u0111\u01A1n v\u1ECB t\u1ED5 ch\u1EE9c. C\xE1c ho\u1EA1t \u0111\u1ED9ng mang t\xEDnh ch\u1EA5t quy\xEAn g\xF3p hi\u1EC7n v\u1EADt, hi\u1EC7n kim m\xE0 kh\xF4ng tham gia tr\u1EF1c ti\u1EBFp s\u1EBD kh\xF4ng \u0111\u01B0\u1EE3c t\xEDnh.",
    subRequirements: [
      {
        id: "crit-4-e1",
        type: "elective",
        title: "Chi\u1EBFn d\u1ECBch Ti\u1EBFp s\u1EE9c m\xF9a thi / M\xF9a h\xE8 xanh / T\xECnh nguy\u1EC7n",
        detail: "Tham gia theo s\u1ED1 ng\xE0y th\u1EF1c t\u1EBF \u0111\u01B0\u1EE3c \u0111\u01A1n v\u1ECB t\u1ED5 ch\u1EE9c c\u1EA5p gi\u1EA5y ch\u1EE9ng nh\u1EADn/x\xE1c nh\u1EADn."
      },
      {
        id: "crit-4-e2",
        type: "elective",
        title: "Hi\u1EBFn m\xE1u nh\xE2n \u0111\u1EA1o v\xEC c\u1ED9ng \u0111\u1ED3ng",
        detail: "Tham gia 01 l\u1EA7n hi\u1EBFn m\xE1u nh\xE2n \u0111\u1EA1o t\xECnh nguy\u1EC7n \u0111\u01B0\u1EE3c t\xEDnh t\u01B0\u01A1ng \u0111\u01B0\u01A1ng 01 ng\xE0y ho\u1EA1t \u0111\u1ED9ng t\xECnh nguy\u1EC7n."
      },
      {
        id: "crit-4-e3",
        type: "elective",
        title: "Ng\xE0y h\u1ED9i Ch\u1EE7 nh\u1EADt xanh / B\u1EA3o v\u1EC7 m\xF4i tr\u01B0\u1EDDng",
        detail: "Tham gia 01 ng\xE0y t\xECnh nguy\u1EC7n Ch\u1EE7 nh\u1EADt xanh, d\u1ECDn d\u1EB9p v\u1EC7 sinh khu\xF4n vi\xEAn tr\u01B0\u1EDDng l\u1EDBp, tr\u1ED3ng c\xE2y xanh."
      },
      {
        id: "crit-4-e4",
        type: "elective",
        title: "\u0110\xF3n T\xE2n sinh vi\xEAn / H\u1ED7 tr\u1EE3 sinh vi\xEAn \u0111\u1EA7u kh\xF3a",
        detail: "Tham gia 01 ng\xE0y t\xECnh nguy\u1EC7n \u0111\xF3n ti\u1EBFp v\xE0 h\u1ED7 tr\u1EE3 t\xE2n sinh vi\xEAn nh\u1EADp h\u1ECDc."
      },
      {
        id: "crit-4-e5",
        type: "elective",
        title: "T\xECnh nguy\u1EC7n x\xE2y d\u1EF1ng N\xF4ng th\xF4n m\u1EDBi / An sinh x\xE3 h\u1ED9i",
        detail: "Tham gia c\xE1c ho\u1EA1t \u0111\u1ED9ng t\xECnh nguy\u1EC7n x\xE2y d\u1EF1ng n\xF4ng th\xF4n m\u1EDBi, chuy\u1EC3n \u0111\u1ED5i s\u1ED1 c\u1ED9ng \u0111\u1ED3ng t\u1EA1i c\xE1c \u0111\u1ECBa ph\u01B0\u01A1ng."
      }
    ]
  },
  {
    id: "crit-5",
    name: "H\u1ED9i nh\u1EADp t\u1ED1t",
    description: "\u0110\u1EA1t chu\u1EA9n Ngo\u1EA1i ng\u1EEF B1 CEFR + \u0110\u1EA1t 02 ti\xEAu ch\xED K\u1EF9 n\u0103ng (CLB \u0110\u1ECDc s\xE1ch STT 14 Ph\u1EE5 l\u1EE5c 1) + \u0110\u1EA1t 01 ho\u1EA1t \u0111\u1ED9ng H\u1ED9i nh\u1EADp qu\u1ED1c t\u1EBF.",
    iconName: "Globe",
    requiredCount: 4,
    completedCount: 0,
    status: "in_progress",
    regulationArticle: "\u0110i\u1EC1u 5.2.5 Q\u0110 118/Q\u0110-HSV",
    mandatorySummary: "Ch\u1EE9ng ch\u1EC9 ti\u1EBFng Anh B1 CEFR ho\u1EB7c t\u01B0\u01A1ng \u0111\u01B0\u01A1ng & 02 ti\xEAu ch\xED K\u1EF9 n\u0103ng th\u1EF1c h\xE0nh x\xE3 h\u1ED9i & 01 ti\xEAu ch\xED Ho\u1EA1t \u0111\u1ED9ng h\u1ED9i nh\u1EADp.",
    electiveSummary: "K\u1EBFt h\u1EE3p h\xE0i h\xF2a gi\u1EEFa Ngo\u1EA1i ng\u1EEF chu\u1EA9n h\xF3a, K\u1EF9 n\u0103ng th\u1EF1c h\xE0nh x\xE3 h\u1ED9i v\xE0 Ho\u1EA1t \u0111\u1ED9ng giao l\u01B0u h\u1ED9i nh\u1EADp.",
    electiveMinCount: 4,
    specialNote: "\u0110\u1EB7c bi\u1EC7t: Tham gia sinh ho\u1EA1t th\u01B0\u1EDDng xuy\xEAn t\u1EA1i CLB \u0110\u1ECDc & Gi\u1EDBi thi\u1EC7u s\xE1ch (STT 14 - Ph\u1EE5 l\u1EE5c 1) \u0111\u01B0\u1EE3c c\xF4ng nh\u1EADn tr\u1EF1c ti\u1EBFp l\xE0 01 ti\xEAu ch\xED K\u1EF9 n\u0103ng!",
    subRequirements: [
      {
        id: "crit-5-nn1",
        type: "mandatory",
        category: "Ngo\u1EA1i ng\u1EEF",
        title: "Ch\u1EE9ng ch\u1EC9 ti\u1EBFng Anh B1 CEFR ho\u1EB7c t\u01B0\u01A1ng \u0111\u01B0\u01A1ng",
        detail: "\u0110\u1EA1t ch\u1EE9ng ch\u1EC9 ti\u1EBFng Anh tr\xECnh \u0111\u1ED9 B1 (theo khung tham chi\u1EBFu ch\xE2u \xC2u) ho\u1EB7c t\u01B0\u01A1ng \u0111\u01B0\u01A1ng (IELTS, TOEFL, TOEIC...) ho\u1EB7c ngo\u1EA1i ng\u1EEF 2 (v\u1EDBi SV chuy\xEAn ng\u1EEF)."
      },
      {
        id: "crit-5-kn1",
        type: "elective",
        category: "K\u1EF9 n\u0103ng",
        title: "Ho\xE0n th\xE0nh kh\xF3a k\u1EF9 n\u0103ng th\u1EF1c h\xE0nh x\xE3 h\u1ED9i (Ph\u1EE5 l\u1EE5c 2)",
        detail: "Tham gia v\xE0 ho\xE0n th\xE0nh \xEDt nh\u1EA5t 01 kh\xF3a trang b\u1ECB k\u1EF9 n\u0103ng th\u1EF1c h\xE0nh x\xE3 h\u1ED9i t\u1EEB c\u1EA5p Khoa tr\u1EDF l\xEAn t\u1ED5 ch\u1EE9c."
      },
      {
        id: "crit-5-kn2",
        type: "elective",
        category: "K\u1EF9 n\u0103ng",
        title: "\u0110\u1EA1t gi\u1EA3i ho\u1EB7c l\xE0m b\xE1o c\xE1o vi\xEAn l\u1EDBp k\u1EF9 n\u0103ng",
        detail: "\u0110\u1EA1t gi\u1EA3i t\u1EA1i c\xE1c cu\u1ED9c thi v\u1EC1 k\u1EF9 n\u0103ng ho\u1EB7c l\xE0 b\xE1o c\xE1o vi\xEAn c\xE1c l\u1EDBp k\u1EF9 n\u0103ng t\u1EEB c\u1EA5p Khoa tr\u1EDF l\xEAn."
      },
      {
        id: "crit-5-kn3",
        type: "elective",
        category: "K\u1EF9 n\u0103ng",
        title: "Sinh ho\u1EA1t t\u1EA1i CLB \u0110\u1ECDc & Gi\u1EDBi thi\u1EC7u s\xE1ch (STT 14 Ph\u1EE5 l\u1EE5c 1)",
        detail: "Tham gia sinh ho\u1EA1t th\u01B0\u1EDDng xuy\xEAn t\u1EA1i CLB \u0110\u1ECDc v\xE0 Gi\u1EDBi thi\u1EC7u s\xE1ch - CLB K\u1EF9 n\u0103ng tr\u1EF1c thu\u1ED9c H\u1ED9i Sinh vi\xEAn AGU."
      },
      {
        id: "crit-5-hn1",
        type: "elective",
        category: "H\u1ED9i nh\u1EADp",
        title: "Tham gia ho\u1EA1t \u0111\u1ED9ng h\u1ED9i nh\u1EADp c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn",
        detail: "Tham gia \xEDt nh\u1EA5t 01 ho\u1EA1t \u0111\u1ED9ng h\u1ED9i nh\u1EADp do c\u1EA5p Tr\u01B0\u1EDDng tr\u1EDF l\xEAn t\u1ED5 ch\u1EE9c."
      },
      {
        id: "crit-5-hn2",
        type: "elective",
        category: "H\u1ED9i nh\u1EADp",
        title: "Giao l\u01B0u qu\u1ED1c t\u1EBF / H\u1ED9i th\u1EA3o khoa h\u1ECDc qu\u1ED1c t\u1EBF",
        detail: "Tham gia \xEDt nh\u1EA5t 01 ho\u1EA1t \u0111\u1ED9ng giao l\u01B0u qu\u1ED1c t\u1EBF: h\u1ED9i ngh\u1ECB, h\u1ED9i th\u1EA3o qu\u1ED1c t\u1EBF, g\u1EB7p g\u1EE1 giao l\u01B0u v\u1EDBi thanh ni\xEAn sinh vi\xEAn qu\u1ED1c t\u1EBF."
      },
      {
        id: "crit-5-hn3",
        type: "elective",
        category: "H\u1ED9i nh\u1EADp",
        title: "Gi\u1EA3i cu\u1ED9c thi ki\u1EBFn th\u1EE9c h\u1ED9i nh\u1EADp / ngo\u1EA1i ng\u1EEF",
        detail: "Tham gia v\xE0 \u0111\u1EA1t gi\u1EA3i t\u1EA1i c\xE1c cu\u1ED9c thi v\u1EC1 ki\u1EBFn th\u1EE9c h\u1ED9i nh\u1EADp ho\u1EB7c c\xE1c cu\u1ED9c thi h\u1ECDc thu\u1EADt b\u1EB1ng ngo\u1EA1i ng\u1EEF t\u1EEB c\u1EA5p Khoa tr\u1EDF l\xEAn."
      }
    ]
  }
];

// src/utils/governance.ts
var SUB_DEPARTMENTS = [
  "Truy\u1EC1n th\xF4ng",
  "N\u1ED9i dung",
  "Nh\xE2n s\u1EF1 & K\u1EBF ho\u1EA1ch",
  "H\u1EADu c\u1EA7n"
];
function isMasterRootUser(user) {
  if (!user) return false;
  return user.id === "bcn-root" || user.adminType === "master_root" || user.clubRole === "root";
}
function isClubPresidentUser(user) {
  if (!user) return false;
  if (user.clubRole === "president") return true;
  if (user.adminType !== "bcn_elected" && user.role !== "bcn_admin") return false;
  if (isMasterRootUser(user)) return false;
  const pos = (user.position || "").toLowerCase();
  if (pos.includes("c\u1EF1u")) return false;
  if (pos.includes("ph\xF3 ch\u1EE7 nhi\u1EC7m")) return false;
  return user.departmentRole === "leader" || pos.includes("ch\u1EE7 nhi\u1EC7m clb") || pos.includes("tr\u01B0\u1EDFng clb") || pos.includes("tr\u01B0\u1EDFng c\xE2u l\u1EA1c b\u1ED9");
}
function isClubVicePresidentUser(user) {
  if (!user) return false;
  if (user.clubRole === "vice_president") return true;
  if (user.adminType !== "bcn_elected" && user.role !== "bcn_admin") return false;
  if (isMasterRootUser(user) || isClubPresidentUser(user)) return false;
  const pos = (user.position || "").toLowerCase();
  if (pos.includes("c\u1EF1u")) return false;
  return user.departmentRole === "vice_leader" || pos.includes("ph\xF3");
}
function getUserConcurrentRoles(user) {
  if (!user) return [];
  const map = /* @__PURE__ */ new Map();
  if (Array.isArray(user.concurrentRoles)) {
    for (const item of user.concurrentRoles) {
      if (item && item.department && SUB_DEPARTMENTS.includes(item.department)) {
        map.set(item.department, item);
      }
    }
  }
  if (user.department && SUB_DEPARTMENTS.includes(user.department) && user.departmentStatus === "approved" && !map.has(user.department)) {
    const dRole = user.departmentRole || "member";
    const dTitle = dRole === "leader" ? `Tr\u01B0\u1EDFng Ban ${user.department}` : dRole === "vice_leader" ? `Ph\xF3 Ban ${user.department}` : `Th\xE0nh vi\xEAn Ban ${user.department}`;
    map.set(user.department, {
      department: user.department,
      departmentRole: dRole,
      title: dTitle
    });
  }
  return Array.from(map.values());
}
function getUserRoleInDepartment(user, dept) {
  if (!user || !dept) return null;
  const roles = getUserConcurrentRoles(user);
  const found = roles.find((r) => r.department === dept);
  if (found) return found.departmentRole;
  if (user.department === dept && user.departmentStatus === "approved") {
    return user.departmentRole || "member";
  }
  return null;
}
function formatCombinedPosition(user, concurrentRoles) {
  const parts = [];
  if (user.clubRole === "president") {
    parts.push("Ch\u1EE7 nhi\u1EC7m CLB");
  } else if (user.clubRole === "vice_president") {
    parts.push("Ph\xF3 Ch\u1EE7 nhi\u1EC7m CLB");
  }
  const sorted = [...concurrentRoles].sort((a, b) => {
    const score = (r) => r === "leader" ? 0 : r === "vice_leader" ? 1 : 2;
    return score(a.departmentRole) - score(b.departmentRole);
  });
  for (const r of sorted) {
    const label = r.departmentRole === "leader" ? `Tr\u01B0\u1EDFng Ban ${r.department}` : r.departmentRole === "vice_leader" ? `Ph\xF3 Ban ${r.department}` : `TV Ban ${r.department}`;
    if (!parts.includes(label)) {
      parts.push(label);
    }
  }
  if (parts.length === 0) {
    return user.position || `Th\xE0nh vi\xEAn Ban ${user.department || "N\u1ED9i dung"}`;
  }
  if (parts.length === 1) {
    return parts[0].startsWith("TV Ban ") ? parts[0].replace("TV Ban ", "Th\xE0nh vi\xEAn Ban ") : parts[0];
  }
  return `${parts[0]} \u2022 Ki\xEAm ${parts.slice(1).join(" & ")}`;
}
function approveUserIntoDepartment(userList, targetUserId, targetDepartment, note, approvedByName, approvedDate = (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")) {
  return userList.map((u) => {
    if (u.id !== targetUserId) return u;
    const finalDept = targetDepartment || u.requestedDepartment || u.department || "N\u1ED9i dung";
    const existingConcurrent = getUserConcurrentRoles(u).filter((r) => r.department !== finalDept);
    const currentRoleInTarget = getUserRoleInDepartment(u, finalDept) || "member";
    const nextConcurrent = [
      ...existingConcurrent,
      {
        department: finalDept,
        departmentRole: currentRoleInTarget,
        title: currentRoleInTarget === "leader" ? `Tr\u01B0\u1EDFng Ban ${finalDept}` : currentRoleInTarget === "vice_leader" ? `Ph\xF3 Ban ${finalDept}` : `Th\xE0nh vi\xEAn Ban ${finalDept}`
      }
    ];
    const nextPosition = formatCombinedPosition(
      { ...u, department: finalDept },
      nextConcurrent
    );
    const safeBadges = Array.isArray(u.badges) ? u.badges : [];
    const nextBadges = safeBadges.includes(`Th\xE0nh Vi\xEAn Ban ${finalDept}`) ? safeBadges : [...safeBadges.filter((b) => !b.includes("Ch\u1EDD Duy\u1EC7t") && !b.includes("Ch\u1EDD Chuy\u1EC3n")), `Th\xE0nh Vi\xEAn Ban ${finalDept}`];
    return {
      ...u,
      department: u.department === "BQT" ? "BQT" : finalDept,
      concurrentRoles: nextConcurrent,
      requestedDepartment: void 0,
      transferFromDept: void 0,
      transferReason: void 0,
      transferRequestedBy: void 0,
      departmentStatus: "approved",
      departmentRole: currentRoleInTarget,
      position: nextPosition,
      departmentApprovalNote: note || `\u0110\u01B0\u1EE3c ${approvedByName || "Ban Qu\u1EA3n tr\u1ECB"} ph\xEA duy\u1EC7t v\xE0o Ban ${finalDept}`,
      approvedByRootAt: approvedDate,
      badges: nextBadges
    };
  });
}
function rejectUserDepartmentRequest(userList, targetUserId, note) {
  return userList.map((u) => {
    if (u.id !== targetUserId) return u;
    return {
      ...u,
      departmentStatus: "rejected",
      position: `Ch\u01B0a ph\xE2n ban (Ch\u1EDD x\xE9t duy\u1EC7t l\u1EA1i)`,
      departmentApprovalNote: note || "Ch\u01B0a \u0111\u01B0\u1EE3c duy\u1EC7t v\xE0o ban chuy\xEAn m\xF4n trong \u0111\u1EE3t n\xE0y."
    };
  });
}
function appointSubDepartmentLeaders(userList, payload) {
  const { department, leaderId, viceLeaderIds } = payload;
  if (!SUB_DEPARTMENTS.includes(department)) {
    return { updatedUsers: userList, error: "Ban chuy\xEAn m\xF4n kh\xF4ng h\u1EE3p l\u1EC7." };
  }
  const cleanViceIds = Array.from(new Set((viceLeaderIds || []).filter(Boolean)));
  if (leaderId && cleanViceIds.includes(leaderId)) {
    return {
      updatedUsers: userList,
      error: "Trong c\xF9ng m\u1ED9t ban, Tr\u01B0\u1EDFng ban v\xE0 Ph\xF3 ban ph\u1EA3i l\xE0 hai ng\u01B0\u1EDDi kh\xE1c nhau!"
    };
  }
  const updatedUsers = userList.map((u) => {
    if (isMasterRootUser(u)) return u;
    const currentRoles = getUserConcurrentRoles(u);
    const otherDeptRoles = currentRoles.filter((r) => r.department !== department);
    const prevRoleInThisDept = currentRoles.find((r) => r.department === department);
    if (leaderId && u.id === leaderId) {
      const nextConcurrent = [
        {
          department,
          departmentRole: "leader",
          title: `Tr\u01B0\u1EDFng Ban ${department}`
        },
        ...otherDeptRoles
      ];
      const badgeName = `Tr\u01B0\u1EDFng Ban ${department} \u2B50`;
      const cleanedBadges = (u.badges || []).filter(
        (b) => b !== `Tr\u01B0\u1EDFng Ban ${department} \u2B50` && b !== `Ph\xF3 Ban ${department} \u2728`
      );
      const hasAnyLeader = nextConcurrent.some(
        (r) => r.departmentRole === "leader" || r.departmentRole === "vice_leader"
      );
      return {
        ...u,
        department: u.department === "BQT" ? "BQT" : department,
        concurrentRoles: nextConcurrent,
        departmentStatus: "approved",
        requestedDepartment: void 0,
        departmentRole: "leader",
        role: u.adminType === "bcn_elected" ? "bcn_admin" : hasAnyLeader ? "lead" : "member",
        position: formatCombinedPosition(u, nextConcurrent),
        badges: [badgeName, ...cleanedBadges]
      };
    }
    if (cleanViceIds.includes(u.id)) {
      const nextConcurrent = [
        {
          department,
          departmentRole: "vice_leader",
          title: `Ph\xF3 Ban ${department}`
        },
        ...otherDeptRoles
      ];
      const badgeName = `Ph\xF3 Ban ${department} \u2728`;
      const cleanedBadges = (u.badges || []).filter(
        (b) => b !== `Tr\u01B0\u1EDFng Ban ${department} \u2B50` && b !== `Ph\xF3 Ban ${department} \u2728`
      );
      const hasLeaderElsewhere = nextConcurrent.some((r) => r.departmentRole === "leader");
      return {
        ...u,
        department: u.department === "BQT" ? "BQT" : SUB_DEPARTMENTS.includes(u.department) ? u.department : department,
        concurrentRoles: nextConcurrent,
        departmentStatus: "approved",
        requestedDepartment: void 0,
        departmentRole: hasLeaderElsewhere ? "leader" : "vice_leader",
        role: u.adminType === "bcn_elected" ? "bcn_admin" : "lead",
        position: formatCombinedPosition(u, nextConcurrent),
        badges: [badgeName, ...cleanedBadges]
      };
    }
    if (prevRoleInThisDept && (prevRoleInThisDept.departmentRole === "leader" || prevRoleInThisDept.departmentRole === "vice_leader")) {
      const nextConcurrent = [
        ...otherDeptRoles,
        {
          department,
          departmentRole: "member",
          title: `Th\xE0nh vi\xEAn Ban ${department}`
        }
      ];
      const cleanedBadges = (u.badges || []).filter(
        (b) => b !== `Tr\u01B0\u1EDFng Ban ${department} \u2B50` && b !== `Ph\xF3 Ban ${department} \u2728`
      );
      const highestRole = nextConcurrent.some((r) => r.departmentRole === "leader") ? "leader" : nextConcurrent.some((r) => r.departmentRole === "vice_leader") ? "vice_leader" : "member";
      return {
        ...u,
        concurrentRoles: nextConcurrent,
        departmentRole: highestRole,
        role: u.adminType === "bcn_elected" ? "bcn_admin" : highestRole !== "member" ? "lead" : "member",
        position: formatCombinedPosition(u, nextConcurrent),
        badges: cleanedBadges
      };
    }
    return u;
  });
  return { updatedUsers };
}
function assignSingleMemberSubDeptRole(userList, payload) {
  const { targetUserId, department, departmentRole, roleTitle } = payload;
  return userList.map((u) => {
    if (isMasterRootUser(u)) return u;
    const currentRoles = getUserConcurrentRoles(u);
    const otherDeptRoles = currentRoles.filter((r) => r.department !== department);
    if (u.id === targetUserId) {
      const itemTitle = roleTitle || (departmentRole === "leader" ? `Tr\u01B0\u1EDFng Ban ${department}` : departmentRole === "vice_leader" ? `Ph\xF3 Ban ${department}` : `Th\xE0nh vi\xEAn Ban ${department}`);
      const nextConcurrent = [
        {
          department,
          departmentRole,
          title: itemTitle
        },
        ...otherDeptRoles
      ];
      const highestRole = nextConcurrent.some((r) => r.departmentRole === "leader") ? "leader" : nextConcurrent.some((r) => r.departmentRole === "vice_leader") ? "vice_leader" : "member";
      const computedRole = u.adminType === "bcn_elected" ? "bcn_admin" : highestRole !== "member" ? "lead" : "member";
      return {
        ...u,
        department: u.department === "BQT" ? "BQT" : department,
        concurrentRoles: nextConcurrent,
        departmentStatus: "approved",
        requestedDepartment: void 0,
        departmentRole: highestRole,
        position: formatCombinedPosition(u, nextConcurrent),
        role: computedRole
      };
    }
    const prevInDept = currentRoles.find((r) => r.department === department);
    if (departmentRole === "leader" && prevInDept?.departmentRole === "leader") {
      const nextConcurrent = [
        ...otherDeptRoles,
        {
          department,
          departmentRole: "member",
          title: `Th\xE0nh vi\xEAn Ban ${department}`
        }
      ];
      const highestRole = nextConcurrent.some((r) => r.departmentRole === "leader") ? "leader" : nextConcurrent.some((r) => r.departmentRole === "vice_leader") ? "vice_leader" : "member";
      return {
        ...u,
        concurrentRoles: nextConcurrent,
        departmentRole: highestRole,
        role: u.adminType === "bcn_elected" ? "bcn_admin" : highestRole !== "member" ? "lead" : "member",
        position: formatCombinedPosition(u, nextConcurrent)
      };
    }
    return u;
  });
}
function appointClubTermLeaders(userList, hallOfFame, termHistory, payload) {
  const {
    termName,
    termYears,
    presidentId,
    vicePresidentIds,
    vicePositions = [],
    legacyContributions,
    legacyQuote,
    appointedAt = (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")
  } = payload;
  if (!termName.trim()) {
    return {
      updatedUsers: userList,
      updatedHallOfFame: hallOfFame,
      updatedTermHistory: termHistory,
      error: "Vui l\xF2ng nh\u1EADp t\xEAn Nhi\u1EC7m k\u1EF3 (v\xED d\u1EE5: Nhi\u1EC7m k\u1EF3 VI 2026-2027)."
    };
  }
  if (!presidentId) {
    return {
      updatedUsers: userList,
      updatedHallOfFame: hallOfFame,
      updatedTermHistory: termHistory,
      error: "Vui l\xF2ng ch\u1ECDn 1 th\xE0nh vi\xEAn l\xE0m Ch\u1EE7 nhi\u1EC7m CLB."
    };
  }
  const cleanViceIds = Array.from(new Set((vicePresidentIds || []).filter(Boolean))).filter((id) => id !== presidentId);
  const presidentUser = userList.find((u) => u.id === presidentId);
  if (!presidentUser || isMasterRootUser(presidentUser)) {
    return {
      updatedUsers: userList,
      updatedHallOfFame: hallOfFame,
      updatedTermHistory: termHistory,
      error: "Ng\u01B0\u1EDDi \u0111\u01B0\u1EE3c ch\u1ECDn l\xE0m Ch\u1EE7 nhi\u1EC7m CLB kh\xF4ng h\u1EE3p l\u1EC7."
    };
  }
  const uniqueIds = /* @__PURE__ */ new Set([presidentId, ...cleanViceIds]);
  const newHofEntries = [];
  const updatedUsers = userList.map((u) => {
    if (isMasterRootUser(u)) return u;
    const wasElectedBcn = u.adminType === "bcn_elected" || u.clubRole === "president" || u.clubRole === "vice_president";
    const isSelectedInNewTerm = uniqueIds.has(u.id);
    const existingConcurrent = getUserConcurrentRoles(u);
    if (wasElectedBcn && !isSelectedInNewTerm) {
      const wasVice = isClubVicePresidentUser(u) || (u.position || "").toLowerCase().includes("ph\xF3");
      const formerTitle = wasVice ? `C\u1EF1u Ph\xF3 Ch\u1EE7 nhi\u1EC7m CLB (${u.term || "Ti\u1EC1n nhi\u1EC7m"})` : `C\u1EF1u Ch\u1EE7 nhi\u1EC7m CLB (${u.term || "Ti\u1EC1n nhi\u1EC7m"})`;
      const alreadyInHof = hallOfFame.some((h) => h.studentId === u.studentId && h.title.includes(u.term || ""));
      if (!alreadyInHof) {
        newHofEntries.push({
          id: `hof-${Date.now()}-${u.id}`,
          name: u.name,
          nickname: u.nickname,
          studentId: u.studentId,
          title: formerTitle,
          termYears: termYears || "2026 - 2027",
          bestContributions: legacyContributions?.trim() || `Ho\xE0n th\xE0nh xu\u1EA5t s\u1EAFc s\u1EE9 m\u1EC7nh d\u1EABn d\u1EAFt CLB \u0110\u1ECDc v\xE0 Gi\u1EDBi thi\u1EC7u s\xE1ch trong ${u.term || "nhi\u1EC7m k\u1EF3 qua"}.`,
          avatar: u.avatar,
          legacyQuote: legacyQuote?.trim() || "M\u1ED7i nhi\u1EC7m k\u1EF3 kh\xE9p l\u1EA1i l\xE0 m\u1ED9t ch\u01B0\u01A1ng s\xE1ch r\u1EF1c r\u1EE1 m\u1EDF ra cho th\u1EBF h\u1EC7 ti\u1EBFp n\u1ED1i."
        });
      }
      const cleanedBadges = (u.badges || []).filter(
        (b) => !b.includes("\u0110\u01B0\u01A1ng Nhi\u1EC7m") && !b.includes("Ch\u1EE7 Nhi\u1EC7m Nhi\u1EC7m K\u1EF3")
      );
      return {
        ...u,
        role: existingConcurrent.some((r) => r.departmentRole !== "member") ? "lead" : "member",
        adminType: "member",
        clubRole: "former_bcn",
        department: existingConcurrent[0]?.department || (u.department === "BQT" ? "Nh\xE2n s\u1EF1 & K\u1EBF ho\u1EA1ch" : u.department),
        concurrentRoles: existingConcurrent,
        departmentRole: existingConcurrent[0]?.departmentRole || "member",
        departmentStatus: "approved",
        position: existingConcurrent.length > 0 ? formatCombinedPosition({ ...u, clubRole: "former_bcn" }, existingConcurrent) : formerTitle,
        badges: cleanedBadges.includes("C\u1EF1u BCN Ti\u1EC1n Nhi\u1EC7m \u{1F396}\uFE0F") ? cleanedBadges : ["C\u1EF1u BCN Ti\u1EC1n Nhi\u1EC7m \u{1F396}\uFE0F", ...cleanedBadges]
      };
    }
    if (u.id === presidentId) {
      const cleanedBadges = (u.badges || []).filter((b) => !b.includes("C\u1EF1u BCN"));
      const nextPos = formatCombinedPosition({ ...u, clubRole: "president" }, existingConcurrent);
      return {
        ...u,
        role: "bcn_admin",
        adminType: "bcn_elected",
        clubRole: "president",
        concurrentRoles: existingConcurrent,
        departmentRole: "leader",
        departmentStatus: "approved",
        requestedDepartment: void 0,
        position: nextPos,
        term: termName,
        badges: cleanedBadges.includes("Ch\u1EE7 Nhi\u1EC7m CLB \u0110\u01B0\u01A1ng Nhi\u1EC7m \u{1F451}") ? cleanedBadges : ["Ch\u1EE7 Nhi\u1EC7m CLB \u0110\u01B0\u01A1ng Nhi\u1EC7m \u{1F451}", ...cleanedBadges]
      };
    }
    const viceIdx = cleanViceIds.indexOf(u.id);
    if (viceIdx !== -1) {
      const customViceTitle = vicePositions[viceIdx]?.trim();
      const cleanedBadges = (u.badges || []).filter((b) => !b.includes("C\u1EF1u BCN"));
      const nextPos = existingConcurrent.length > 0 ? formatCombinedPosition({ ...u, clubRole: "vice_president" }, existingConcurrent) : customViceTitle || "Ph\xF3 Ch\u1EE7 nhi\u1EC7m CLB";
      return {
        ...u,
        role: "bcn_admin",
        adminType: "bcn_elected",
        clubRole: "vice_president",
        concurrentRoles: existingConcurrent,
        departmentRole: "vice_leader",
        departmentStatus: "approved",
        requestedDepartment: void 0,
        position: nextPos,
        term: termName,
        badges: cleanedBadges.includes("Ph\xF3 Ch\u1EE7 Nhi\u1EC7m \u0110\u01B0\u01A1ng Nhi\u1EC7m \u2728") ? cleanedBadges : ["Ph\xF3 Ch\u1EE7 Nhi\u1EC7m \u0110\u01B0\u01A1ng Nhi\u1EC7m \u2728", ...cleanedBadges]
      };
    }
    return u;
  });
  const newPresidentSummary = updatedUsers.find((u) => u.id === presidentId);
  const newViceSummaries = cleanViceIds.map((id) => updatedUsers.find((u) => u.id === id)).filter((u) => Boolean(u)).map((u) => ({
    id: u.id,
    name: u.name,
    nickname: u.nickname,
    studentId: u.studentId,
    faculty: u.faculty,
    avatar: u.avatar,
    position: u.position,
    roleType: "vice_president"
  }));
  const newTermRecord = {
    id: `term-${Date.now()}`,
    termName,
    termYears: termYears || "2026 - 2027",
    isCurrent: true,
    president: {
      id: newPresidentSummary.id,
      name: newPresidentSummary.name,
      nickname: newPresidentSummary.nickname,
      studentId: newPresidentSummary.studentId,
      faculty: newPresidentSummary.faculty,
      avatar: newPresidentSummary.avatar,
      position: newPresidentSummary.position,
      roleType: "president"
    },
    vicePresidents: newViceSummaries,
    appointedBy: "T\xE0i kho\u1EA3n Ch\xEDnh CLB \u0110\u1ECDc v\xE0 Gi\u1EDBi thi\u1EC7u s\xE1ch",
    appointedAt,
    highlights: legacyContributions?.trim() || `Ph\xE2n quy\u1EC1n Ban Ch\u1EE7 Nhi\u1EC7m ${termName} b\u1EDFi T\xE0i kho\u1EA3n Ch\xEDnh th\u1EE9c CLB.`
  };
  const updatedTermHistory = [
    newTermRecord,
    ...termHistory.map((t) => ({ ...t, isCurrent: false }))
  ];
  return {
    updatedUsers,
    updatedHallOfFame: [...newHofEntries, ...hallOfFame],
    updatedTermHistory
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = Number(process.env.PORT) || 3e3;
var DATA_DIR = path.join(__dirname, "data");
var DB_FILE = path.join(DATA_DIR, "club_db.json");
var SEED_FILE = path.join(DATA_DIR, "seed.json");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
var LEGACY_MOCK_USER_IDS = [
  "bcn-lead-1",
  "bcn-lead-2",
  "bcn-lead-3",
  "user-1",
  "user-2",
  "user-3",
  "user-4",
  "user-5",
  "user-6",
  "user-7",
  "user-8",
  "user-pending-1",
  "user-pending-2"
];
function getInitialDatabase() {
  return {
    userList: SAMPLE_USERS,
    posts: [],
    locketMoments: [],
    criteria: S5T_CRITERIA_LIST,
    proofs: [],
    reports: [],
    transactions: [],
    plans: [],
    tasks: [],
    decrees: [],
    questions: INITIAL_RECRUITMENT_QUESTIONS,
    applications: [],
    hallOfFame: [],
    memberEvaluations: [],
    termHistory: INITIAL_TERM_HISTORY,
    emergencyNotices: [],
    deletedUserIds: [...LEGACY_MOCK_USER_IDS],
    deletedItemIds: [],
    cleanLaunchVersion: 4,
    lastUpdated: Date.now()
  };
}
var dbState = getInitialDatabase();
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && parsed.cleanLaunchVersion === 4) {
      const seed = getInitialDatabase();
      const deletedUsers = Array.from(/* @__PURE__ */ new Set([...parsed.deletedUserIds || [], ...LEGACY_MOCK_USER_IDS]));
      const deletedItems = parsed.deletedItemIds || [];
      const mergedUsers = mergeById(
        parsed.userList || [],
        SAMPLE_USERS,
        deletedUsers
      );
      const loadedQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0 ? parsed.questions : INITIAL_RECRUITMENT_QUESTIONS;
      const loadedCriteria = S5T_CRITERIA_LIST.map((official) => {
        const existing = (parsed.criteria || []).find((c) => c && c.id === official.id);
        if (!existing) return official;
        return {
          ...official,
          completedCount: existing.completedCount ?? official.completedCount,
          status: existing.status ?? official.status
        };
      });
      dbState = {
        ...seed,
        ...parsed,
        userList: mergedUsers,
        criteria: loadedCriteria,
        questions: loadedQuestions,
        plans: (parsed.plans || []).filter((p) => p && !deletedItems.includes(p.id)),
        memberEvaluations: (parsed.memberEvaluations || []).filter((e) => e && !deletedItems.includes(e.id)),
        deletedUserIds: deletedUsers,
        deletedItemIds: deletedItems,
        cleanLaunchVersion: 4,
        lastUpdated: parsed.lastUpdated || Date.now()
      };
      console.log("[Database] Loaded clean v4 database from disk:", DB_FILE);
    } else {
      const oldNonRootIds = Array.isArray(parsed?.userList) ? parsed.userList.filter((u) => u && u.id && u.id !== "bcn-root").map((u) => u.id) : [];
      dbState.deletedUserIds = Array.from(/* @__PURE__ */ new Set([...LEGACY_MOCK_USER_IDS, ...parsed?.deletedUserIds || [], ...oldNonRootIds]));
      const content = JSON.stringify(dbState, null, 2);
      fs.writeFileSync(DB_FILE, content, "utf-8");
      try {
        fs.writeFileSync(SEED_FILE, content, "utf-8");
      } catch {
      }
      console.log("[Database] Reset database to clean official launch state (v4):", DB_FILE);
    }
  } else {
    const content = JSON.stringify(dbState, null, 2);
    fs.writeFileSync(DB_FILE, content, "utf-8");
    try {
      fs.writeFileSync(SEED_FILE, content, "utf-8");
    } catch {
    }
    console.log("[Database] Initialized new clean database file:", DB_FILE);
  }
} catch (err) {
  console.error("[Database] Error loading db file, using clean defaults:", err);
}
var saveTimeout = null;
function persistDb() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      dbState.lastUpdated = Date.now();
      const content = JSON.stringify(dbState, null, 2);
      fs.writeFileSync(DB_FILE, content, "utf-8");
      try {
        fs.writeFileSync(SEED_FILE, content, "utf-8");
      } catch (seedErr) {
      }
    } catch (err) {
      console.error("[Database] Failed to write db to disk:", err);
    }
  }, 100);
}
function mergeById(primary, fallback, deletedIds = []) {
  const deletedSet = new Set(deletedIds || []);
  const map = /* @__PURE__ */ new Map();
  for (const item of primary || []) {
    if (item && item.id && !deletedSet.has(item.id)) {
      map.set(item.id, item);
    }
  }
  for (const item of fallback || []) {
    if (item && item.id && !deletedSet.has(item.id) && !map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}
async function startServer() {
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      connectedClients: "multi-device",
      lastUpdated: dbState.lastUpdated,
      totalUsers: dbState.userList.length,
      serverTime: Date.now()
    });
  });
  app.get("/api/state", (req, res) => {
    res.json(dbState);
  });
  app.post("/api/sync", (req, res) => {
    const { key, data } = req.body;
    if (!key || data === void 0) {
      res.status(400).json({ error: "Missing key or data" });
      return;
    }
    if (key in dbState && key !== "lastUpdated") {
      if (Array.isArray(data) && Array.isArray(dbState[key]) && key !== "questions") {
        const deletedIds = key === "userList" ? dbState.deletedUserIds || [] : dbState.deletedItemIds || [];
        dbState[key] = mergeById(data, dbState[key], deletedIds);
      } else {
        dbState[key] = data;
      }
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, key, lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(400).json({ error: `Invalid key: ${key}` });
    }
  });
  app.post("/api/sync-batch", (req, res) => {
    const { updates } = req.body;
    if (!updates || typeof updates !== "object") {
      res.status(400).json({ error: "Invalid updates object" });
      return;
    }
    for (const [key, value] of Object.entries(updates)) {
      if (key in dbState && key !== "lastUpdated") {
        if (Array.isArray(value) && Array.isArray(dbState[key]) && key !== "questions") {
          const deletedIds = key === "userList" ? dbState.deletedUserIds || [] : [];
          dbState[key] = mergeById(value, dbState[key], deletedIds);
        } else {
          dbState[key] = value;
        }
      }
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/reports", (req, res) => {
    const report = req.body;
    if (!report || !report.id || !report.title) {
      res.status(400).json({ error: "Invalid report payload" });
      return;
    }
    const index = dbState.reports.findIndex((r) => r.id === report.id);
    if (index >= 0) {
      dbState.reports[index] = report;
    } else {
      dbState.reports.unshift(report);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, reports: dbState.reports, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/reports/response", (req, res) => {
    const { reportId, response } = req.body;
    if (!reportId || !response) {
      res.status(400).json({ error: "Missing reportId or response" });
      return;
    }
    const rIndex = dbState.reports.findIndex((r) => r.id === reportId);
    if (rIndex >= 0) {
      dbState.reports[rIndex] = {
        ...dbState.reports[rIndex],
        bcnResponse: response,
        status: "resolved"
      };
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, reports: dbState.reports, lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: "Report not found" });
    }
  });
  app.post("/api/posts", (req, res) => {
    const post = req.body;
    if (!post || !post.id || !post.title) {
      res.status(400).json({ error: "Invalid post payload" });
      return;
    }
    const index = dbState.posts.findIndex((p) => p.id === post.id);
    if (index >= 0) {
      dbState.posts[index] = post;
    } else {
      dbState.posts.unshift(post);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, posts: dbState.posts, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/posts/like", (req, res) => {
    const { postId, userId } = req.body;
    if (!postId) {
      res.status(400).json({ error: "Missing postId" });
      return;
    }
    const index = dbState.posts.findIndex((p) => p.id === postId);
    if (index >= 0) {
      const p = dbState.posts[index];
      const nextLiked = !p.userLiked;
      dbState.posts[index] = {
        ...p,
        userLiked: nextLiked,
        likes: nextLiked ? (p.likes || 0) + 1 : Math.max(0, (p.likes || 1) - 1)
      };
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, post: dbState.posts[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: "Post not found" });
    }
  });
  app.post("/api/posts/comment", (req, res) => {
    const { postId, comment } = req.body;
    if (!postId || !comment || !comment.text) {
      res.status(400).json({ error: "Missing postId or comment" });
      return;
    }
    const index = dbState.posts.findIndex((p) => p.id === postId);
    if (index >= 0) {
      const p = dbState.posts[index];
      const existingComments = p.commentsList || [];
      const updatedComments = [...existingComments, comment];
      dbState.posts[index] = {
        ...p,
        commentsList: updatedComments,
        commentsCount: updatedComments.length
      };
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, post: dbState.posts[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: "Post not found" });
    }
  });
  app.post("/api/lockets", (req, res) => {
    const moment = req.body;
    if (!moment || !moment.id) {
      res.status(400).json({ error: "Invalid locket payload" });
      return;
    }
    const index = dbState.locketMoments.findIndex((m) => m.id === moment.id);
    if (index >= 0) {
      dbState.locketMoments[index] = moment;
    } else {
      dbState.locketMoments.unshift(moment);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, locketMoments: dbState.locketMoments, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/lockets/react", (req, res) => {
    const { locketId } = req.body;
    if (!locketId) {
      res.status(400).json({ error: "Missing locketId" });
      return;
    }
    const index = dbState.locketMoments.findIndex((m) => m.id === locketId);
    if (index >= 0) {
      const m = dbState.locketMoments[index];
      const nextReact = !m.userReacted;
      dbState.locketMoments[index] = {
        ...m,
        userReacted: nextReact,
        reactions: nextReact ? (m.reactions || 0) + 1 : Math.max(0, (m.reactions || 1) - 1)
      };
      dbState.lastUpdated = Date.now();
      persistDb();
      res.json({ success: true, locket: dbState.locketMoments[index], lastUpdated: dbState.lastUpdated, state: dbState });
    } else {
      res.status(404).json({ error: "Locket moment not found" });
    }
  });
  app.post("/api/login", (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp Email, MSSV ho\u1EB7c H\u1ECD t\xEAn v\xE0 M\u1EADt kh\u1EA9u" });
      return;
    }
    const cleanId = identifier.trim().toLowerCase();
    const user = dbState.userList.find(
      (u) => u.studentId && u.studentId.toLowerCase() === cleanId || u.email && u.email.toLowerCase() === cleanId || u.name && u.name.toLowerCase() === cleanId
    );
    if (!user) {
      res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n v\u1EDBi Email, MSSV ho\u1EB7c H\u1ECD t\xEAn n\xE0y!" });
      return;
    }
    const correctPassword = user.password || (user.id === "bcn-root" ? "AGU2026" : "");
    if (!correctPassword || password.trim() !== correctPassword) {
      res.status(401).json({ error: "M\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c! Vui l\xF2ng th\u1EED l\u1EA1i." });
      return;
    }
    res.json({
      success: true,
      user,
      isBcn: user.role === "bcn_admin",
      lastUpdated: dbState.lastUpdated,
      state: dbState
    });
  });
  app.post("/api/register", (req, res) => {
    const newUser = req.body;
    if (!newUser || !newUser.name || !newUser.studentId) {
      res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin b\u1EAFt bu\u1ED9c (H\u1ECD t\xEAn, MSSV)" });
      return;
    }
    if (!newUser.password) {
      newUser.password = "123456";
    }
    if (dbState.deletedUserIds && newUser.id) {
      dbState.deletedUserIds = dbState.deletedUserIds.filter((id) => id !== newUser.id);
    }
    const existingIndex = dbState.userList.findIndex(
      (u) => newUser.id && u.id === newUser.id || u.studentId && newUser.studentId && u.studentId.toLowerCase() === newUser.studentId.toLowerCase() || newUser.email && u.email && u.email.toLowerCase() === newUser.email.toLowerCase()
    );
    let savedUser = newUser;
    if (existingIndex >= 0) {
      savedUser = { ...dbState.userList[existingIndex], ...newUser };
      dbState.userList[existingIndex] = savedUser;
    } else {
      dbState.userList.unshift(newUser);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, user: savedUser, totalUsers: dbState.userList.length, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/users/ensure-batch", (req, res) => {
    const { users } = req.body;
    if (!Array.isArray(users)) {
      res.status(400).json({ error: "Invalid users array" });
      return;
    }
    const deletedSet = new Set(dbState.deletedUserIds || []);
    let changed = false;
    for (const localUser of users) {
      if (!localUser || !localUser.id || !localUser.name || deletedSet.has(localUser.id)) continue;
      const exists = dbState.userList.some(
        (u) => u.id === localUser.id || u.studentId && localUser.studentId && u.studentId.toLowerCase() === localUser.studentId.toLowerCase()
      );
      if (!exists) {
        if (!localUser.password) localUser.password = "123456";
        dbState.userList.unshift(localUser);
        changed = true;
      }
    }
    if (changed) {
      dbState.lastUpdated = Date.now();
      persistDb();
    }
    res.json({ success: true, changed, state: dbState, lastUpdated: dbState.lastUpdated });
  });
  app.post("/api/users/update-profile", (req, res) => {
    const { userId, avatar, nickname, favoriteBook, newPassword, readingStreak, enewsStreak, hasCheckedInToday, lastCheckInDate, s5tProgress, meritPoints } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }
    const idx = dbState.userList.findIndex((u) => u.id === userId);
    if (idx < 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const current = dbState.userList[idx];
    dbState.userList[idx] = {
      ...current,
      avatar: avatar || current.avatar,
      nickname: nickname !== void 0 ? nickname : current.nickname,
      favoriteBook: favoriteBook !== void 0 ? favoriteBook : current.favoriteBook,
      password: newPassword || current.password,
      readingStreak: readingStreak !== void 0 ? readingStreak : current.readingStreak,
      enewsStreak: enewsStreak !== void 0 ? enewsStreak : current.enewsStreak,
      hasCheckedInToday: hasCheckedInToday !== void 0 ? hasCheckedInToday : current.hasCheckedInToday,
      lastCheckInDate: lastCheckInDate !== void 0 ? lastCheckInDate : current.lastCheckInDate,
      s5tProgress: s5tProgress !== void 0 ? s5tProgress : current.s5tProgress,
      meritPoints: meritPoints !== void 0 ? meritPoints : current.meritPoints
    };
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, user: dbState.userList[idx], lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/users/assign-role", (req, res) => {
    const { targetUserId, department, roleTitle, departmentRole, roleType } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: "Missing targetUserId" });
      return;
    }
    const target = dbState.userList.find((u) => u.id === targetUserId);
    if (!target) {
      res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y th\xE0nh vi\xEAn c\u1EA7n ph\xE2n quy\u1EC1n" });
      return;
    }
    if (target.id === "bcn-root" || target.adminType === "master_root") {
      res.status(403).json({ error: "Kh\xF4ng th\u1EC3 thay \u0111\u1ED5i ch\u1EE9c danh T\xE0i kho\u1EA3n G\u1ED1c T\u1ED1i Cao!" });
      return;
    }
    dbState.userList = assignSingleMemberSubDeptRole(dbState.userList, {
      targetUserId,
      department: department || target.department,
      departmentRole: departmentRole || target.departmentRole || "member",
      roleTitle: roleTitle || target.position,
      roleType: roleType || target.role
    });
    dbState.lastUpdated = Date.now();
    persistDb();
    const updatedUser = dbState.userList.find((u) => u.id === targetUserId);
    res.json({ success: true, user: updatedUser, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/users/approve-department", (req, res) => {
    const { targetUserId, department, status, note } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: "Thi\u1EBFu targetUserId" });
      return;
    }
    if (status === "rejected") {
      dbState.userList = rejectUserDepartmentRequest(dbState.userList, targetUserId, note);
    } else {
      dbState.userList = approveUserIntoDepartment(
        dbState.userList,
        targetUserId,
        department,
        note,
        (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")
      );
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/departments/appoint-leaders", (req, res) => {
    const { department, leaderId, viceLeaderIds, appointedByName } = req.body;
    const result = appointSubDepartmentLeaders(dbState.userList, {
      department,
      leaderId,
      viceLeaderIds: Array.isArray(viceLeaderIds) ? viceLeaderIds : [],
      appointedByName
    });
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    dbState.userList = result.updatedUsers;
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/terms/appoint-bcn", (req, res) => {
    const { termName, termYears, presidentId, vicePresidentIds, vicePositions, legacyContributions, legacyQuote } = req.body;
    const result = appointClubTermLeaders(
      dbState.userList,
      dbState.hallOfFame || [],
      dbState.termHistory || [],
      {
        termName,
        termYears,
        presidentId,
        vicePresidentIds: Array.isArray(vicePresidentIds) ? vicePresidentIds : [],
        vicePositions: Array.isArray(vicePositions) ? vicePositions : [],
        legacyContributions,
        legacyQuote,
        appointedAt: (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")
      }
    );
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    dbState.userList = result.updatedUsers;
    dbState.hallOfFame = result.updatedHallOfFame;
    dbState.termHistory = result.updatedTermHistory;
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/transactions", (req, res) => {
    const transaction = req.body;
    if (!transaction || !transaction.id || !transaction.title) {
      res.status(400).json({ error: "Invalid transaction payload" });
      return;
    }
    if (dbState.deletedItemIds) {
      dbState.deletedItemIds = dbState.deletedItemIds.filter((id) => id !== transaction.id);
    }
    dbState.transactions.unshift(transaction);
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, transactions: dbState.transactions, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/plans", (req, res) => {
    const plan = req.body;
    if (!plan || !plan.id || !plan.title) {
      res.status(400).json({ error: "Invalid plan payload" });
      return;
    }
    if (dbState.deletedItemIds) {
      dbState.deletedItemIds = dbState.deletedItemIds.filter((id) => id !== plan.id);
    }
    const idx = dbState.plans.findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      dbState.plans[idx] = plan;
    } else {
      dbState.plans.unshift(plan);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, plans: dbState.plans, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/items/delete", (req, res) => {
    const { key, itemId } = req.body;
    if (!key || !itemId || !(key in dbState)) {
      res.status(400).json({ error: "Missing or invalid key / itemId" });
      return;
    }
    if (!Array.isArray(dbState[key])) {
      res.status(400).json({ error: `Collection ${key} is not an array` });
      return;
    }
    if (!dbState.deletedItemIds) dbState.deletedItemIds = [];
    if (!dbState.deletedItemIds.includes(itemId)) {
      dbState.deletedItemIds.push(itemId);
    }
    dbState[key] = dbState[key].filter((item) => item && item.id !== itemId);
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, key, deletedItemId: itemId, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/theme", (req, res) => {
    const { theme, year, setBy, setAt } = req.body;
    if (!theme || !year) {
      res.status(400).json({ error: "Missing theme or year" });
      return;
    }
    dbState.annualTheme = {
      theme: theme.trim(),
      year: year.trim(),
      setBy: setBy || "Ch\u1EE7 nhi\u1EC7m CLB",
      setAt: setAt || (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")
    };
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, annualTheme: dbState.annualTheme, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/emergency-notices", (req, res) => {
    const notice = req.body;
    if (!notice || !notice.title) {
      res.status(400).json({ error: "Missing notice title" });
      return;
    }
    const newNotice = {
      ...notice,
      id: notice.id || `em-${Date.now()}`,
      issuedAt: notice.issuedAt || (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN"),
      isActive: true
    };
    if (!Array.isArray(dbState.emergencyNotices)) {
      dbState.emergencyNotices = [];
    }
    dbState.emergencyNotices.unshift(newNotice);
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, emergencyNotices: dbState.emergencyNotices, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/emergency-notices/dismiss", (req, res) => {
    const { noticeId } = req.body;
    if (!noticeId) {
      res.status(400).json({ error: "Missing noticeId" });
      return;
    }
    if (Array.isArray(dbState.emergencyNotices)) {
      dbState.emergencyNotices = dbState.emergencyNotices.map(
        (n) => n.id === noticeId ? { ...n, isActive: false } : n
      ).filter((n) => n.id !== noticeId);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, noticeId, emergencyNotices: dbState.emergencyNotices, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/users/delete", (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }
    const targetUser = dbState.userList.find((u) => u.id === userId);
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (targetUser.id === "bcn-root" || targetUser.adminType === "master_root") {
      res.status(403).json({ error: "Kh\xF4ng th\u1EC3 x\xF3a T\xE0i kho\u1EA3n G\u1ED1c V\u0129nh Vi\u1EC5n c\u1EE7a CLB!" });
      return;
    }
    if (!dbState.deletedUserIds) dbState.deletedUserIds = [];
    if (!dbState.deletedUserIds.includes(userId)) {
      dbState.deletedUserIds.push(userId);
    }
    dbState.userList = dbState.userList.filter((u) => u.id !== userId);
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, deletedUserId: userId, userList: dbState.userList, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/succession", (req, res) => {
    const { outgoingLeaderId, incomingMemberId, newLeader, hallOfFameRecord, positionTitle } = req.body;
    if (hallOfFameRecord) {
      dbState.hallOfFame.unshift(hallOfFameRecord);
    }
    if (outgoingLeaderId) {
      const outIdx = dbState.userList.findIndex((u) => u.id === outgoingLeaderId);
      if (outIdx >= 0) {
        const outU = dbState.userList[outIdx];
        const isVice = (outU.position || "").toLowerCase().includes("ph\xF3");
        const emeritusPosition = isVice ? "C\u1EF1u Ph\xF3 Ch\u1EE7 nhi\u1EC7m CLB (Ti\u1EC1n b\u1ED1i danh d\u1EF1)" : "C\u1EF1u Ch\u1EE7 nhi\u1EC7m CLB (Ti\u1EC1n b\u1ED1i danh d\u1EF1)";
        const badges = (outU.badges || []).includes("C\u1EF1u BCN Ti\u1EC1n Nhi\u1EC7m \u{1F396}\uFE0F") ? outU.badges : [...(outU.badges || []).filter((b) => !b.includes("Ch\u1EE7 Nhi\u1EC7m Nhi\u1EC7m K\u1EF3")), "C\u1EF1u BCN Ti\u1EC1n Nhi\u1EC7m \u{1F396}\uFE0F"];
        dbState.userList[outIdx] = {
          ...outU,
          role: "member",
          adminType: "member",
          position: emeritusPosition,
          badges
        };
      }
    }
    if (newLeader) {
      dbState.userList.unshift(newLeader);
    } else if (incomingMemberId) {
      const inIdx = dbState.userList.findIndex((u) => u.id === incomingMemberId);
      if (inIdx >= 0) {
        const inU = dbState.userList[inIdx];
        const badges = (inU.badges || []).includes("T\xE2n BCN \u0110\u01B0\u01A1ng Nhi\u1EC7m \u{1F451}") ? inU.badges : [...inU.badges || [], "T\xE2n BCN \u0110\u01B0\u01A1ng Nhi\u1EC7m \u{1F451}"];
        dbState.userList[inIdx] = {
          ...inU,
          role: "bcn_admin",
          adminType: "bcn_elected",
          department: "BQT",
          position: positionTitle || "Ch\u1EE7 nhi\u1EC7m CLB (Sinh vi\xEAn)",
          term: "Nhi\u1EC7m k\u1EF3 m\u1EDBi (2026-2027)",
          badges
        };
      }
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, state: dbState, lastUpdated: dbState.lastUpdated });
  });
  app.get("/api/backup/download", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename=agu_club_backup_${Date.now()}.json`);
    res.send(JSON.stringify(dbState, null, 2));
  });
  app.post("/api/backup/restore", (req, res) => {
    const { backupData, passcode } = req.body;
    if (passcode !== "AGU2026") {
      res.status(403).json({ error: "M\xE3 x\xE1c th\u1EF1c b\u1EA3o m\u1EADt c\xE2u l\u1EA1c b\u1ED9 kh\xF4ng ch\xEDnh x\xE1c!" });
      return;
    }
    if (!backupData || typeof backupData !== "object") {
      res.status(400).json({ error: "D\u1EEF li\u1EC7u file backup JSON kh\xF4ng h\u1EE3p l\u1EC7!" });
      return;
    }
    dbState = {
      ...getInitialDatabase(),
      ...backupData,
      lastUpdated: Date.now()
    };
    persistDb();
    res.json({ success: true, message: "\u0110\xE3 ph\u1EE5c h\u1ED3i c\u01A1 s\u1EDF d\u1EEF li\u1EC7u th\xE0nh c\xF4ng!", state: dbState, lastUpdated: dbState.lastUpdated });
  });
  app.post("/api/applications", (req, res) => {
    const appData = req.body;
    if (!appData || !appData.fullName || !appData.studentId) {
      res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 H\u1ECD t\xEAn v\xE0 M\xE3 s\u1ED1 sinh vi\xEAn!" });
      return;
    }
    const newApp = {
      ...appData,
      id: appData.id || `app-${Date.now().toString().slice(-4)}`,
      status: appData.status || "pending",
      submittedAt: appData.submittedAt || (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN")
    };
    if (!Array.isArray(dbState.applications)) {
      dbState.applications = [];
    }
    const existingIdx = dbState.applications.findIndex((a) => a.id === newApp.id);
    if (existingIdx >= 0) {
      dbState.applications[existingIdx] = newApp;
    } else {
      dbState.applications.unshift(newApp);
    }
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, application: newApp, applications: dbState.applications, lastUpdated: dbState.lastUpdated, state: dbState });
  });
  app.post("/api/books/search-grounding", async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp t\xEAn s\xE1ch ho\u1EB7c t\xE1c gi\u1EA3 c\u1EA7n tra c\u1EE9u!" });
      return;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: `H\xE3y tra c\u1EE9u th\xF4ng tin ch\xEDnh x\xE1c, c\u1EADp nh\u1EADt v\u1EC1 cu\u1ED1n s\xE1ch, t\xE1c gi\u1EA3 ho\u1EB7c ch\u1EE7 \u0111\u1EC1 v\u0103n h\u1ECDc sau cho C\xE2u l\u1EA1c b\u1ED9 \u0110\u1ECDc v\xE0 Gi\u1EDBi thi\u1EC7u s\xE1ch Tr\u01B0\u1EDDng \u0110\u1EA1i h\u1ECDc An Giang (AGU): "${query.trim()}". Tr\xECnh b\xE0y ng\u1EAFn g\u1ECDn, s\xFAc t\xEDch b\u1EB1ng ti\u1EBFng Vi\u1EC7t g\u1ED3m: 1) Gi\u1EDBi thi\u1EC7u t\xE1c ph\u1EA9m/t\xE1c gi\u1EA3, 2) Th\xF4ng \u0111i\u1EC7p & gi\xE1 tr\u1ECB c\u1ED1t l\xF5i, 3) G\u1EE3i \xFD th\u1EA3o lu\u1EADn cho bu\u1ED5i sinh ho\u1EA1t CLB.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks.map((chunk) => chunk.web ? { title: chunk.web.title || chunk.web.uri, uri: chunk.web.uri } : null).filter(Boolean);
      res.json({
        success: true,
        text: response.text || "Kh\xF4ng t\xECm th\u1EA5y k\u1EBFt qu\u1EA3 ph\xF9 h\u1EE3p.",
        sources
      });
    } catch (err) {
      console.error("[BookSearch] Gemini Google Search Grounding error:", err);
      res.status(500).json({
        error: err?.message || "Kh\xF4ng th\u1EC3 tra c\u1EE9u th\xF4ng tin s\xE1ch l\xFAc n\xE0y."
      });
    }
  });
  app.post("/api/reset-db", (req, res) => {
    const { passcode } = req.body;
    if (passcode !== "AGU2026") {
      res.status(403).json({ error: "Invalid master passcode" });
      return;
    }
    dbState = getInitialDatabase();
    dbState.lastUpdated = Date.now();
    persistDb();
    res.json({ success: true, message: "Database reset to initial club seed", lastUpdated: dbState.lastUpdated, state: dbState });
  });
  const distPath = path.join(__dirname, "dist");
  const isProd = process.env.NODE_ENV === "production" || __filename.endsWith("server.js");
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        watch: {
          ignored: ["**/data/**", "**/dist/**", "**/server.js"]
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Full-Stack Server] running on http://0.0.0.0:${PORT}`);
    });
  }
}

const serverReadyPromise = startServer();

export { serverReadyPromise };
export default async (req, res) => {
  await serverReadyPromise;
  return app(req, res);
};
