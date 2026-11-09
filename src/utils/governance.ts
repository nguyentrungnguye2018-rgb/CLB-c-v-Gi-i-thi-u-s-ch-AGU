import {
  UserProfile,
  DepartmentType,
  HallOfFameItem,
  ClubTermRecord,
  RoleType,
  ConcurrentDeptAssignment,
  EvaluationRatingType
} from '../types';

export const SUB_DEPARTMENTS: DepartmentType[] = [
  'Truyền thông',
  'Nội dung',
  'Nhân sự & Kế hoạch',
  'Hậu cần'
];

/**
 * Checks if the user is the Permanent Master Root Account ("Account Chính")
 */
export function isMasterRootUser(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.id === 'bcn-root' || user.adminType === 'master_root' || user.clubRole === 'root';
}

/**
 * Checks if the user is the current Term Club President ("Trưởng Câu Lạc Bộ / Chủ nhiệm CLB")
 */
export function isClubPresidentUser(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.clubRole === 'president') return true;
  if (user.adminType !== 'bcn_elected' && user.role !== 'bcn_admin') return false;
  if (isMasterRootUser(user)) return false;

  const pos = (user.position || '').toLowerCase();
  if (pos.includes('cựu')) return false;
  if (pos.includes('phó chủ nhiệm')) return false;
  return (
    user.departmentRole === 'leader' ||
    pos.includes('chủ nhiệm clb') ||
    pos.includes('trưởng clb') ||
    pos.includes('trưởng câu lạc bộ')
  );
}

/**
 * Checks if the user is a current Term Club Vice President ("Phó Câu Lạc Bộ / Phó Chủ nhiệm CLB")
 */
export function isClubVicePresidentUser(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (user.clubRole === 'vice_president') return true;
  if (user.adminType !== 'bcn_elected' && user.role !== 'bcn_admin') return false;
  if (isMasterRootUser(user) || isClubPresidentUser(user)) return false;

  const pos = (user.position || '').toLowerCase();
  if (pos.includes('cựu')) return false;
  return user.departmentRole === 'vice_leader' || pos.includes('phó');
}

/**
 * Normalizes all sub-department roles held by a user (supports kiêm nhiệm nhiều ban cùng lúc)
 */
export function getUserConcurrentRoles(user?: UserProfile | null): ConcurrentDeptAssignment[] {
  if (!user) return [];
  const map = new Map<DepartmentType, ConcurrentDeptAssignment>();

  if (Array.isArray(user.concurrentRoles)) {
    for (const item of user.concurrentRoles) {
      if (item && item.department && SUB_DEPARTMENTS.includes(item.department)) {
        map.set(item.department, item);
      }
    }
  }

  // Ensure primary department is also included if it's one of the 4 sub-departments and approved
  if (
    user.department &&
    SUB_DEPARTMENTS.includes(user.department) &&
    user.departmentStatus === 'approved' &&
    !map.has(user.department)
  ) {
    const dRole = user.departmentRole || 'member';
    const dTitle =
      dRole === 'leader'
        ? `Trưởng Ban ${user.department}`
        : dRole === 'vice_leader'
        ? `Phó Ban ${user.department}`
        : `Thành viên Ban ${user.department}`;
    map.set(user.department, {
      department: user.department,
      departmentRole: dRole,
      title: dTitle
    });
  }

  return Array.from(map.values());
}

/**
 * Checks if a user belongs to (or kiêm nhiệm) a given sub-department
 */
export function isUserInDepartment(user?: UserProfile | null, dept?: DepartmentType): boolean {
  if (!user || !dept) return false;
  if (user.departmentStatus !== 'approved' && user.adminType !== 'bcn_elected' && !isMasterRootUser(user)) {
    return false;
  }
  const roles = getUserConcurrentRoles(user);
  if (roles.some(r => r.department === dept)) return true;
  return user.department === dept && user.departmentStatus === 'approved';
}

/**
 * Returns the user's role in a specific sub-department ('leader' | 'vice_leader' | 'member' | null)
 */
export function getUserRoleInDepartment(
  user?: UserProfile | null,
  dept?: DepartmentType
): 'leader' | 'vice_leader' | 'member' | null {
  if (!user || !dept) return null;
  const roles = getUserConcurrentRoles(user);
  const found = roles.find(r => r.department === dept);
  if (found) return found.departmentRole;
  if (user.department === dept && user.departmentStatus === 'approved') {
    return user.departmentRole || 'member';
  }
  return null;
}

/**
 * Formats a combined position string when a user holds one or multiple concurrent roles
 */
export function formatCombinedPosition(
  user: Partial<UserProfile>,
  concurrentRoles: ConcurrentDeptAssignment[]
): string {
  const parts: string[] = [];

  if (user.clubRole === 'president') {
    parts.push('Chủ nhiệm CLB');
  } else if (user.clubRole === 'vice_president') {
    parts.push('Phó Chủ nhiệm CLB');
  }

  // Sort leader roles first, then vice_leader, then member
  const sorted = [...concurrentRoles].sort((a, b) => {
    const score = (r: string) => (r === 'leader' ? 0 : r === 'vice_leader' ? 1 : 2);
    return score(a.departmentRole) - score(b.departmentRole);
  });

  for (const r of sorted) {
    const label =
      r.departmentRole === 'leader'
        ? `Trưởng Ban ${r.department}`
        : r.departmentRole === 'vice_leader'
        ? `Phó Ban ${r.department}`
        : `TV Ban ${r.department}`;
    if (!parts.includes(label)) {
      parts.push(label);
    }
  }

  if (parts.length === 0) {
    return user.position || `Thành viên Ban ${user.department || 'Nội dung'}`;
  }
  if (parts.length === 1) {
    return parts[0].startsWith('TV Ban ')
      ? parts[0].replace('TV Ban ', 'Thành viên Ban ')
      : parts[0];
  }
  return `${parts[0]} • Kiêm ${parts.slice(1).join(' & ')}`;
}

/**
 * Rule: Quyền duyệt thành viên vào nhóm / ban:
 * - Chủ nhiệm CLB & Phó Chủ nhiệm CLB: Quản lý toàn thể CLB, duyệt vào bất kỳ ban nào.
 * - Trưởng nhóm & Phó nhóm của nhóm đó (kể cả kiêm nhiệm): Được quyền duyệt thành viên vào nhóm của mình!
 * - Tài khoản Chính: Toàn quyền quản trị.
 */
export function canApproveDepartmentEntry(user?: UserProfile | null, dept?: DepartmentType): boolean {
  if (!user) return false;
  if (isMasterRootUser(user) || isClubPresidentUser(user) || isClubVicePresidentUser(user)) {
    return true;
  }
  if (dept) {
    const roleInDept = getUserRoleInDepartment(user, dept);
    if (roleInDept === 'leader' || roleInDept === 'vice_leader') return true;
  }
  return false;
}

/**
 * Quyền yêu cầu chuyển nhóm (fix lỗi duyệt lộn nhóm / đổi ban / thêm kiêm nhiệm):
 */
export function canInitiateGroupTransfer(user?: UserProfile | null, member?: UserProfile): boolean {
  if (!user || !member) return false;
  if (isMasterRootUser(user) || isClubPresidentUser(user) || isClubVicePresidentUser(user)) return true;
  const userRoles = getUserConcurrentRoles(user).filter(
    r => r.departmentRole === 'leader' || r.departmentRole === 'vice_leader'
  );
  return userRoles.some(r => isUserInDepartment(member, r.department));
}

/**
 * Quyền duyệt tiếp nhận thành viên từ nhóm khác chuyển sang:
 */
export function canApproveGroupTransfer(user?: UserProfile | null, targetDept?: DepartmentType): boolean {
  if (!user) return false;
  if (isMasterRootUser(user) || isClubPresidentUser(user) || isClubVicePresidentUser(user)) return true;
  if (targetDept) {
    const roleInDept = getUserRoleInDepartment(user, targetDept);
    if (roleInDept === 'leader' || roleInDept === 'vice_leader') return true;
  }
  return false;
}

/**
 * Trưởng CLB (hoặc Phó CLB / Account Chính) chọn Trưởng ban & Phó ban cho 4 ban nhỏ
 */
export function canSelectSubDeptLeaders(user?: UserProfile | null): boolean {
  return isMasterRootUser(user) || isClubPresidentUser(user) || isClubVicePresidentUser(user);
}

/**
 * Phân quyền Trưởng & Phó CLB theo nhiệm kỳ
 */
export function canAssignTermClubLeaders(user?: UserProfile | null): boolean {
  return isMasterRootUser(user) || isClubPresidentUser(user);
}

/**
 * Checks if a member's department membership is officially approved
 */
export function isMemberDepartmentApproved(user: UserProfile): boolean {
  if (isMasterRootUser(user) || user.adminType === 'bcn_elected') return true;
  return user.departmentStatus !== 'pending_approval' && user.departmentStatus !== 'rejected' && user.departmentStatus !== 'pending_transfer';
}

/**
 * Duyệt thành viên vào ban / nhóm
 */
export function approveUserIntoDepartment(
  userList: UserProfile[],
  targetUserId: string,
  targetDepartment?: DepartmentType,
  note?: string,
  approvedByName?: string,
  approvedDate: string = new Date().toLocaleDateString('vi-VN')
): UserProfile[] {
  return userList.map(u => {
    if (u.id !== targetUserId) return u;
    const finalDept = targetDepartment || u.requestedDepartment || u.department || 'Nội dung';
    const existingConcurrent = getUserConcurrentRoles(u).filter(r => r.department !== finalDept);
    const currentRoleInTarget = getUserRoleInDepartment(u, finalDept) || 'member';
    const nextConcurrent: ConcurrentDeptAssignment[] = [
      ...existingConcurrent,
      {
        department: finalDept,
        departmentRole: currentRoleInTarget,
        title:
          currentRoleInTarget === 'leader'
            ? `Trưởng Ban ${finalDept}`
            : currentRoleInTarget === 'vice_leader'
            ? `Phó Ban ${finalDept}`
            : `Thành viên Ban ${finalDept}`
      }
    ];

    const nextPosition = formatCombinedPosition(
      { ...u, department: finalDept },
      nextConcurrent
    );
    const safeBadges = Array.isArray(u.badges) ? u.badges : [];
    const nextBadges = safeBadges.includes(`Thành Viên Ban ${finalDept}`)
      ? safeBadges
      : [...safeBadges.filter(b => !b.includes('Chờ Duyệt') && !b.includes('Chờ Chuyển')), `Thành Viên Ban ${finalDept}`];

    return {
      ...u,
      department: u.department === 'BQT' ? 'BQT' : finalDept,
      concurrentRoles: nextConcurrent,
      requestedDepartment: undefined,
      transferFromDept: undefined,
      transferReason: undefined,
      transferRequestedBy: undefined,
      departmentStatus: 'approved' as const,
      departmentRole: currentRoleInTarget,
      position: nextPosition,
      departmentApprovalNote: note || `Được ${approvedByName || 'Ban Quản trị'} phê duyệt vào Ban ${finalDept}`,
      approvedByRootAt: approvedDate,
      badges: nextBadges
    };
  });
}

/**
 * Từ chối yêu cầu vào ban / nhóm
 */
export function rejectUserDepartmentRequest(
  userList: UserProfile[],
  targetUserId: string,
  note?: string
): UserProfile[] {
  return userList.map(u => {
    if (u.id !== targetUserId) return u;
    return {
      ...u,
      departmentStatus: 'rejected' as const,
      position: `Chưa phân ban (Chờ xét duyệt lại)`,
      departmentApprovalNote: note || 'Chưa được duyệt vào ban chuyên môn trong đợt này.'
    };
  });
}

/**
 * Trưởng nhóm / Phó nhóm yêu cầu chuyển nhóm cho thành viên (sửa lỗi duyệt lộn nhóm)
 */
export function requestMemberGroupTransfer(
  userList: UserProfile[],
  targetUserId: string,
  newDept: DepartmentType,
  reason: string,
  requestedByName: string
): { updatedUsers: UserProfile[]; reportItem?: any } {
  const target = userList.find(u => u.id === targetUserId);
  const oldDept = target?.department || 'Nội dung';

  const updatedUsers = userList.map(u => {
    if (u.id !== targetUserId) return u;
    return {
      ...u,
      departmentStatus: 'pending_transfer' as const,
      transferFromDept: oldDept,
      requestedDepartment: newDept,
      transferReason: reason || 'Chuyển nhóm sinh hoạt phù hợp nguyện vọng',
      transferRequestedBy: requestedByName
    };
  });

  const reportItem = {
    id: `rep-transfer-${Date.now()}`,
    recipientType: 'bcn_master' as const,
    category: 'Góp ý sinh hoạt' as const,
    title: `[Điều chuyển nhóm] Chuyển bạn ${target?.name || ''} từ Ban ${oldDept} sang Ban ${newDept}`,
    content: `Trưởng/Phó nhóm ${oldDept} (${requestedByName}) đã yêu cầu điều chuyển thành viên ${target?.name} (MSSV: ${target?.studentId}) sang Ban ${newDept}.\nLý do: ${reason || 'Điều chỉnh phân ban phù hợp năng lực & nguyện vọng'}.\nNhóm ${newDept} sẽ kiểm tra và bấm duyệt tiếp nhận.`,
    isEncrypted: false,
    encryptedCode: 'TRANSFER-ALERT',
    realSenderName: requestedByName,
    realSenderStudentId: 'BCN-SYSTEM',
    realSenderDept: oldDept,
    createdAt: new Date().toLocaleDateString('vi-VN'),
    status: 'processing' as const,
    urgency: 'medium' as const,
    bcnResponse: 'Hệ thống đã tự động gửi thông báo tới Chủ nhiệm & Phó Chủ nhiệm CLB để nắm bắt tình hình điều chuyển.'
  };

  return { updatedUsers, reportItem };
}

/**
 * Chủ nhiệm CLB chuyển thẳng thành viên sang nhóm mới hoặc cho kiêm nhiệm thêm nhóm mới lập tức
 */
export function directTransferMemberGroup(
  userList: UserProfile[],
  targetUserId: string,
  newDept: DepartmentType,
  directTransferByName: string,
  reason?: string
): UserProfile[] {
  const isConcurrentAdd = Boolean(reason && reason.includes('[KIEM_NHIEM]'));
  const cleanReason = (reason || '').replace('[KIEM_NHIEM]', '').trim();

  return userList.map(u => {
    if (u.id !== targetUserId) return u;

    const existingRoles = getUserConcurrentRoles(u);
    let nextConcurrent: ConcurrentDeptAssignment[];

    if (isConcurrentAdd) {
      // Giữ nguyên các ban/chức vụ cũ, thêm ban mới
      const withoutTarget = existingRoles.filter(r => r.department !== newDept);
      nextConcurrent = [
        ...withoutTarget,
        {
          department: newDept,
          departmentRole: 'member',
          title: `Thành viên Ban ${newDept}`
        }
      ];
    } else {
      // Chuyển hẳn từ ban chính cũ sang ban mới (nhưng vẫn giữ các ban kiêm nhiệm khác nếu có)
      const withoutOldAndTarget = existingRoles.filter(
        r => r.department !== u.department && r.department !== newDept
      );
      nextConcurrent = [
        ...withoutOldAndTarget,
        {
          department: newDept,
          departmentRole: 'member',
          title: `Thành viên Ban ${newDept}`
        }
      ];
    }

    const nextPrimaryDept = isConcurrentAdd && SUB_DEPARTMENTS.includes(u.department) ? u.department : newDept;
    const nextPosition = formatCombinedPosition({ ...u, department: nextPrimaryDept }, nextConcurrent);

    return {
      ...u,
      department: u.department === 'BQT' ? 'BQT' : nextPrimaryDept,
      concurrentRoles: nextConcurrent,
      departmentStatus: 'approved' as const,
      departmentRole: nextConcurrent.some(r => r.departmentRole === 'leader')
        ? 'leader'
        : nextConcurrent.some(r => r.departmentRole === 'vice_leader')
        ? 'vice_leader'
        : 'member',
      requestedDepartment: undefined,
      transferFromDept: undefined,
      transferReason: undefined,
      transferRequestedBy: undefined,
      position: nextPosition,
      departmentApprovalNote: isConcurrentAdd
        ? `Được phân công kiêm nhiệm thêm Ban ${newDept} bởi ${directTransferByName}. ${cleanReason ? `Ghi chú: ${cleanReason}` : ''}`
        : `Chủ nhiệm CLB (${directTransferByName}) trực tiếp điều chuyển sang Ban ${newDept}. ${cleanReason ? `Lý do: ${cleanReason}` : ''}`,
      approvedByRootAt: new Date().toLocaleDateString('vi-VN')
    };
  });
}

/**
 * Chọn Trưởng Ban và Phó Ban cho 1 trong 4 ban chuyên môn.
 * Hỗ trợ KIÊM NHIỆM NHIỀU CHỨC BAN CÙNG LÚC:
 * Một người có thể vừa là Trưởng/Phó ban này, vừa là Trưởng/Phó/Thành viên ban khác hoặc Chủ nhiệm/Phó chủ nhiệm CLB!
 */
export function appointSubDepartmentLeaders(
  userList: UserProfile[],
  payload: {
    department: DepartmentType;
    leaderId: string;
    viceLeaderIds: string[];
    appointedByName?: string;
  }
): { updatedUsers: UserProfile[]; error?: string } {
  const { department, leaderId, viceLeaderIds } = payload;

  if (!SUB_DEPARTMENTS.includes(department)) {
    return { updatedUsers: userList, error: 'Ban chuyên môn không hợp lệ.' };
  }

  const cleanViceIds = Array.from(new Set((viceLeaderIds || []).filter(Boolean)));
  if (leaderId && cleanViceIds.includes(leaderId)) {
    return {
      updatedUsers: userList,
      error: 'Trong cùng một ban, Trưởng ban và Phó ban phải là hai người khác nhau!'
    };
  }

  const updatedUsers = userList.map(u => {
    if (isMasterRootUser(u)) return u;

    const currentRoles = getUserConcurrentRoles(u);
    const otherDeptRoles = currentRoles.filter(r => r.department !== department);
    const prevRoleInThisDept = currentRoles.find(r => r.department === department);

    // 1. Được chọn làm Trưởng Ban của `department`
    if (leaderId && u.id === leaderId) {
      const nextConcurrent: ConcurrentDeptAssignment[] = [
        {
          department,
          departmentRole: 'leader',
          title: `Trưởng Ban ${department}`
        },
        ...otherDeptRoles
      ];
      const badgeName = `Trưởng Ban ${department} ⭐`;
      const cleanedBadges = (u.badges || []).filter(
        b => b !== `Trưởng Ban ${department} ⭐` && b !== `Phó Ban ${department} ✨`
      );
      const hasAnyLeader = nextConcurrent.some(
        r => r.departmentRole === 'leader' || r.departmentRole === 'vice_leader'
      );
      return {
        ...u,
        department: u.department === 'BQT' ? 'BQT' : department,
        concurrentRoles: nextConcurrent,
        departmentStatus: 'approved' as const,
        requestedDepartment: undefined,
        departmentRole: 'leader' as const,
        role: (u.adminType === 'bcn_elected' ? 'bcn_admin' : hasAnyLeader ? 'lead' : 'member') as RoleType,
        position: formatCombinedPosition(u, nextConcurrent),
        badges: [badgeName, ...cleanedBadges]
      };
    }

    // 2. Được chọn làm Phó Ban của `department`
    if (cleanViceIds.includes(u.id)) {
      const nextConcurrent: ConcurrentDeptAssignment[] = [
        {
          department,
          departmentRole: 'vice_leader',
          title: `Phó Ban ${department}`
        },
        ...otherDeptRoles
      ];
      const badgeName = `Phó Ban ${department} ✨`;
      const cleanedBadges = (u.badges || []).filter(
        b => b !== `Trưởng Ban ${department} ⭐` && b !== `Phó Ban ${department} ✨`
      );
      const hasLeaderElsewhere = nextConcurrent.some(r => r.departmentRole === 'leader');
      return {
        ...u,
        department: u.department === 'BQT' ? 'BQT' : (SUB_DEPARTMENTS.includes(u.department) ? u.department : department),
        concurrentRoles: nextConcurrent,
        departmentStatus: 'approved' as const,
        requestedDepartment: undefined,
        departmentRole: (hasLeaderElsewhere ? 'leader' : 'vice_leader') as 'leader' | 'vice_leader',
        role: (u.adminType === 'bcn_elected' ? 'bcn_admin' : 'lead') as RoleType,
        position: formatCombinedPosition(u, nextConcurrent),
        badges: [badgeName, ...cleanedBadges]
      };
    }

    // 3. Nếu trước đó người này là Trưởng/Phó của `department` nhưng nay đổi người khác -> chuyển thành Thành viên ở `department`, GIỮ NGUYÊN chức vụ ở các ban khác!
    if (
      prevRoleInThisDept &&
      (prevRoleInThisDept.departmentRole === 'leader' || prevRoleInThisDept.departmentRole === 'vice_leader')
    ) {
      const nextConcurrent: ConcurrentDeptAssignment[] = [
        ...otherDeptRoles,
        {
          department,
          departmentRole: 'member',
          title: `Thành viên Ban ${department}`
        }
      ];
      const cleanedBadges = (u.badges || []).filter(
        b => b !== `Trưởng Ban ${department} ⭐` && b !== `Phó Ban ${department} ✨`
      );
      const highestRole: 'leader' | 'vice_leader' | 'member' = nextConcurrent.some(r => r.departmentRole === 'leader')
        ? 'leader'
        : nextConcurrent.some(r => r.departmentRole === 'vice_leader')
        ? 'vice_leader'
        : 'member';
      return {
        ...u,
        concurrentRoles: nextConcurrent,
        departmentRole: highestRole,
        role: (u.adminType === 'bcn_elected' ? 'bcn_admin' : highestRole !== 'member' ? 'lead' : 'member') as RoleType,
        position: formatCombinedPosition(u, nextConcurrent),
        badges: cleanedBadges
      };
    }

    return u;
  });

  return { updatedUsers };
}

/**
 * Single-user role assignment in a sub-department (supports concurrent roles across multiple departments)
 */
export function assignSingleMemberSubDeptRole(
  userList: UserProfile[],
  payload: {
    targetUserId: string;
    department: DepartmentType;
    departmentRole: 'leader' | 'vice_leader' | 'member';
    roleTitle?: string;
    roleType?: RoleType;
  }
): UserProfile[] {
  const { targetUserId, department, departmentRole, roleTitle } = payload;

  return userList.map(u => {
    if (isMasterRootUser(u)) return u;

    const currentRoles = getUserConcurrentRoles(u);
    const otherDeptRoles = currentRoles.filter(r => r.department !== department);

    if (u.id === targetUserId) {
      const itemTitle =
        roleTitle ||
        (departmentRole === 'leader'
          ? `Trưởng Ban ${department}`
          : departmentRole === 'vice_leader'
          ? `Phó Ban ${department}`
          : `Thành viên Ban ${department}`);
      const nextConcurrent: ConcurrentDeptAssignment[] = [
        {
          department,
          departmentRole,
          title: itemTitle
        },
        ...otherDeptRoles
      ];
      const highestRole: 'leader' | 'vice_leader' | 'member' = nextConcurrent.some(r => r.departmentRole === 'leader')
        ? 'leader'
        : nextConcurrent.some(r => r.departmentRole === 'vice_leader')
        ? 'vice_leader'
        : 'member';
      const computedRole: RoleType =
        u.adminType === 'bcn_elected' ? 'bcn_admin' : highestRole !== 'member' ? 'lead' : 'member';

      return {
        ...u,
        department: u.department === 'BQT' ? 'BQT' : department,
        concurrentRoles: nextConcurrent,
        departmentStatus: 'approved',
        requestedDepartment: undefined,
        departmentRole: highestRole,
        position: formatCombinedPosition(u, nextConcurrent),
        role: computedRole
      };
    }

    // If appointing a new Trưởng Ban ('leader'), demote the previous Trưởng Ban of that SAME department only (preserving their other departments)
    const prevInDept = currentRoles.find(r => r.department === department);
    if (departmentRole === 'leader' && prevInDept?.departmentRole === 'leader') {
      const nextConcurrent: ConcurrentDeptAssignment[] = [
        ...otherDeptRoles,
        {
          department,
          departmentRole: 'member',
          title: `Thành viên Ban ${department}`
        }
      ];
      const highestRole: 'leader' | 'vice_leader' | 'member' = nextConcurrent.some(r => r.departmentRole === 'leader')
        ? 'leader'
        : nextConcurrent.some(r => r.departmentRole === 'vice_leader')
        ? 'vice_leader'
        : 'member';
      return {
        ...u,
        concurrentRoles: nextConcurrent,
        departmentRole: highestRole,
        role: u.adminType === 'bcn_elected' ? 'bcn_admin' : highestRole !== 'member' ? 'lead' : 'member',
        position: formatCombinedPosition(u, nextConcurrent)
      };
    }

    return u;
  });
}

/**
 * Account Chính / Chủ nhiệm bổ nhiệm Chủ nhiệm & Phó Chủ nhiệm CLB nhiệm kỳ mới
 * (Cho phép chỉ chọn 1 Chủ nhiệm khi CLB ít người, và vẫn giữ các chức vụ kiêm nhiệm ở 4 Ban!)
 */
export function appointClubTermLeaders(
  userList: UserProfile[],
  hallOfFame: HallOfFameItem[],
  termHistory: ClubTermRecord[],
  payload: {
    termName: string;
    termYears: string;
    presidentId: string;
    vicePresidentIds: string[];
    vicePositions?: string[];
    legacyContributions?: string;
    legacyQuote?: string;
    appointedAt?: string;
  }
): {
  updatedUsers: UserProfile[];
  updatedHallOfFame: HallOfFameItem[];
  updatedTermHistory: ClubTermRecord[];
  error?: string;
} {
  const {
    termName,
    termYears,
    presidentId,
    vicePresidentIds,
    vicePositions = [],
    legacyContributions,
    legacyQuote,
    appointedAt = new Date().toLocaleDateString('vi-VN')
  } = payload;

  if (!termName.trim()) {
    return {
      updatedUsers: userList,
      updatedHallOfFame: hallOfFame,
      updatedTermHistory: termHistory,
      error: 'Vui lòng nhập tên Nhiệm kỳ (ví dụ: Nhiệm kỳ VI 2026-2027).'
    };
  }

  if (!presidentId) {
    return {
      updatedUsers: userList,
      updatedHallOfFame: hallOfFame,
      updatedTermHistory: termHistory,
      error: 'Vui lòng chọn 1 thành viên làm Chủ nhiệm CLB.'
    };
  }

  const cleanViceIds = Array.from(new Set((vicePresidentIds || []).filter(Boolean))).filter(id => id !== presidentId);

  const presidentUser = userList.find(u => u.id === presidentId);
  if (!presidentUser || isMasterRootUser(presidentUser)) {
    return {
      updatedUsers: userList,
      updatedHallOfFame: hallOfFame,
      updatedTermHistory: termHistory,
      error: 'Người được chọn làm Chủ nhiệm CLB không hợp lệ.'
    };
  }

  const uniqueIds = new Set([presidentId, ...cleanViceIds]);
  const newHofEntries: HallOfFameItem[] = [];

  const updatedUsers = userList.map(u => {
    if (isMasterRootUser(u)) return u;

    const wasElectedBcn = u.adminType === 'bcn_elected' || u.clubRole === 'president' || u.clubRole === 'vice_president';
    const isSelectedInNewTerm = uniqueIds.has(u.id);
    const existingConcurrent = getUserConcurrentRoles(u);

    if (wasElectedBcn && !isSelectedInNewTerm) {
      const wasVice = isClubVicePresidentUser(u) || (u.position || '').toLowerCase().includes('phó');
      const formerTitle = wasVice
        ? `Cựu Phó Chủ nhiệm CLB (${u.term || 'Tiền nhiệm'})`
        : `Cựu Chủ nhiệm CLB (${u.term || 'Tiền nhiệm'})`;

      const alreadyInHof = hallOfFame.some(h => h.studentId === u.studentId && h.title.includes(u.term || ''));
      if (!alreadyInHof) {
        newHofEntries.push({
          id: `hof-${Date.now()}-${u.id}`,
          name: u.name,
          nickname: u.nickname,
          studentId: u.studentId,
          title: formerTitle,
          termYears: termYears || '2026 - 2027',
          bestContributions:
            legacyContributions?.trim() ||
            `Hoàn thành xuất sắc sứ mệnh dẫn dắt CLB Đọc và Giới thiệu sách trong ${u.term || 'nhiệm kỳ qua'}.`,
          avatar: u.avatar,
          legacyQuote:
            legacyQuote?.trim() ||
            'Mỗi nhiệm kỳ khép lại là một chương sách rực rỡ mở ra cho thế hệ tiếp nối.'
        });
      }

      const cleanedBadges = (u.badges || []).filter(
        b => !b.includes('Đương Nhiệm') && !b.includes('Chủ Nhiệm Nhiệm Kỳ')
      );
      return {
        ...u,
        role: (existingConcurrent.some(r => r.departmentRole !== 'member') ? 'lead' : 'member') as RoleType,
        adminType: 'member' as const,
        clubRole: 'former_bcn' as const,
        department: existingConcurrent[0]?.department || (u.department === 'BQT' ? ('Nhân sự & Kế hoạch' as DepartmentType) : u.department),
        concurrentRoles: existingConcurrent,
        departmentRole: existingConcurrent[0]?.departmentRole || 'member',
        departmentStatus: 'approved' as const,
        position: existingConcurrent.length > 0 ? formatCombinedPosition({ ...u, clubRole: 'former_bcn' }, existingConcurrent) : formerTitle,
        badges: cleanedBadges.includes('Cựu BCN Tiền Nhiệm 🎖️')
          ? cleanedBadges
          : ['Cựu BCN Tiền Nhiệm 🎖️', ...cleanedBadges]
      };
    }

    // Selected as New Term President (Chủ nhiệm CLB) — preserves concurrent sub-dept roles!
    if (u.id === presidentId) {
      const cleanedBadges = (u.badges || []).filter(b => !b.includes('Cựu BCN'));
      const nextPos = formatCombinedPosition({ ...u, clubRole: 'president' }, existingConcurrent);
      return {
        ...u,
        role: 'bcn_admin' as RoleType,
        adminType: 'bcn_elected' as const,
        clubRole: 'president' as const,
        concurrentRoles: existingConcurrent,
        departmentRole: 'leader' as const,
        departmentStatus: 'approved' as const,
        requestedDepartment: undefined,
        position: nextPos,
        term: termName,
        badges: cleanedBadges.includes('Chủ Nhiệm CLB Đương Nhiệm 👑')
          ? cleanedBadges
          : ['Chủ Nhiệm CLB Đương Nhiệm 👑', ...cleanedBadges]
      };
    }

    // Selected as New Term Vice President (Phó Chủ nhiệm CLB) — preserves concurrent sub-dept roles!
    const viceIdx = cleanViceIds.indexOf(u.id);
    if (viceIdx !== -1) {
      const customViceTitle = vicePositions[viceIdx]?.trim();
      const cleanedBadges = (u.badges || []).filter(b => !b.includes('Cựu BCN'));
      const nextPos =
        existingConcurrent.length > 0
          ? formatCombinedPosition({ ...u, clubRole: 'vice_president' }, existingConcurrent)
          : customViceTitle || 'Phó Chủ nhiệm CLB';
      return {
        ...u,
        role: 'bcn_admin' as RoleType,
        adminType: 'bcn_elected' as const,
        clubRole: 'vice_president' as const,
        concurrentRoles: existingConcurrent,
        departmentRole: 'vice_leader' as const,
        departmentStatus: 'approved' as const,
        requestedDepartment: undefined,
        position: nextPos,
        term: termName,
        badges: cleanedBadges.includes('Phó Chủ Nhiệm Đương Nhiệm ✨')
          ? cleanedBadges
          : ['Phó Chủ Nhiệm Đương Nhiệm ✨', ...cleanedBadges]
      };
    }

    return u;
  });

  const newPresidentSummary = updatedUsers.find(u => u.id === presidentId)!;
  const newViceSummaries = cleanViceIds
    .map(id => updatedUsers.find(u => u.id === id))
    .filter((u): u is UserProfile => Boolean(u))
    .map(u => ({
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      studentId: u.studentId,
      faculty: u.faculty,
      avatar: u.avatar,
      position: u.position,
      roleType: 'vice_president' as const
    }));

  const newTermRecord: ClubTermRecord = {
    id: `term-${Date.now()}`,
    termName,
    termYears: termYears || '2026 - 2027',
    isCurrent: true,
    president: {
      id: newPresidentSummary.id,
      name: newPresidentSummary.name,
      nickname: newPresidentSummary.nickname,
      studentId: newPresidentSummary.studentId,
      faculty: newPresidentSummary.faculty,
      avatar: newPresidentSummary.avatar,
      position: newPresidentSummary.position,
      roleType: 'president'
    },
    vicePresidents: newViceSummaries,
    appointedBy: 'Tài khoản Chính CLB Đọc và Giới thiệu sách',
    appointedAt,
    highlights:
      legacyContributions?.trim() ||
      `Phân quyền Ban Chủ Nhiệm ${termName} bởi Tài khoản Chính thức CLB.`
  };

  const updatedTermHistory = [
    newTermRecord,
    ...termHistory.map(t => ({ ...t, isCurrent: false }))
  ];

  return {
    updatedUsers,
    updatedHallOfFame: [...newHofEntries, ...hallOfFame],
    updatedTermHistory
  };
}

/**
 * Trả về danh sách các Ban chuyên môn mà người dùng hiện tại có quyền Đánh giá năng lực thành viên:
 * - BCN (Tài khoản Chính, Chủ nhiệm, Phó Chủ nhiệm): Được đánh giá cả 4 ban.
 * - Trưởng ban / Phó ban (kể cả kiêm nhiệm nhiều ban): Được đánh giá các thành viên thuộc ban mình quản lý.
 */
export function getManagedDepartmentsForEvaluator(
  user?: UserProfile | null,
  isBcnMode: boolean = false
): DepartmentType[] {
  if (!user) return [];
  if (
    isMasterRootUser(user) ||
    isClubPresidentUser(user) ||
    isClubVicePresidentUser(user) ||
    isBcnMode ||
    user.role === 'bcn_admin'
  ) {
    return [...SUB_DEPARTMENTS];
  }

  const managed = new Set<DepartmentType>();
  const concurrent = getUserConcurrentRoles(user);
  for (const r of concurrent) {
    if (
      SUB_DEPARTMENTS.includes(r.department) &&
      (r.departmentRole === 'leader' || r.departmentRole === 'vice_leader')
    ) {
      managed.add(r.department);
    }
  }

  if (
    SUB_DEPARTMENTS.includes(user.department) &&
    (user.departmentRole === 'leader' ||
      user.departmentRole === 'vice_leader' ||
      user.role === 'lead' ||
      (user.position || '').toLowerCase().includes('trưởng ban') ||
      (user.position || '').toLowerCase().includes('phó ban'))
  ) {
    managed.add(user.department);
  }

  return Array.from(managed);
}

/**
 * Kiểm tra xem người dùng có quyền đánh giá năng lực thành viên (nói chung hoặc trong 1 ban cụ thể) hay không
 */
export function canEvaluateDepartmentMembers(
  user?: UserProfile | null,
  dept?: DepartmentType,
  isBcnMode: boolean = false
): boolean {
  const managed = getManagedDepartmentsForEvaluator(user, isBcnMode);
  if (!dept) return managed.length > 0;
  return managed.includes(dept);
}

/**
 * Tính điểm trung bình (thang 10) và xếp loại tự động cho Phiếu đánh giá năng lực thành viên
 */
export function computeEvaluationResult(scores: {
  responsibility: number;
  quality: number;
  teamwork: number;
  initiative: number;
}): { overallScore: number; rating: EvaluationRatingType } {
  const clamp = (n: number) => Math.max(1, Math.min(10, Number(n) || 1));
  const r = clamp(scores.responsibility);
  const q = clamp(scores.quality);
  const t = clamp(scores.teamwork);
  const i = clamp(scores.initiative);
  const overallScore = Math.round(((r + q + t + i) / 4) * 10) / 10;

  let rating: EvaluationRatingType = 'Đạt';
  if (overallScore >= 8.5) {
    rating = 'Xuất sắc';
  } else if (overallScore >= 7.0) {
    rating = 'Tốt';
  } else if (overallScore >= 5.0) {
    rating = 'Đạt';
  } else {
    rating = 'Cần cố gắng';
  }

  return { overallScore, rating };
}

