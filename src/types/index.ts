// 策划团队
export interface Team {
  id: string;
  name: string;
  leader: string;
  phone: string;
  commissionRate: number;
  description: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// 新人信息
export interface Couple {
  id: string;
  groomName: string;
  brideName: string;
  phone: string;
  wechat?: string;
  address?: string;
  remark?: string;
}

// 档期
export interface Schedule {
  id: string;
  teamId: string;
  teamName: string;
  coupleId: string;
  coupleName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  amount: number;
  deposit: number;
  isMerged: boolean;
  mergedGroupId?: string;
  mergedStartDate?: string;
  mergedEndDate?: string;
  mergedDayCount?: number;
  remark?: string;
  createdAt: string;
}

// 合并档期组
export interface MergedScheduleGroup {
  id: string;
  coupleId: string;
  coupleName: string;
  teamId: string;
  teamName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  totalAmount: number;
  scheduleIds: string[];
  status: 'confirmed' | 'pending' | 'partial_cancelled';
  createdAt: string;
}

// 流水记录
export interface Transaction {
  id: string;
  orderNo: string;
  type: 'platform' | 'team';
  amount: number;
  date: string;
  scheduleId?: string;
  teamId: string;
  teamName: string;
  coupleName: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  reconcileStatus: 'matched' | 'discrepancy' | 'pending';
  counterpartId?: string;
  discrepancyReason?: string;
  discrepancyType?: 'amount' | 'time' | 'missing';
}

// 差异记录
export interface Discrepancy {
  id: string;
  platformTransactionId: string;
  teamTransactionId?: string;
  type: 'amount' | 'time' | 'missing_platform' | 'missing_team';
  description: string;
  platformAmount: number;
  teamAmount?: number;
  diffAmount: number;
  date: string;
  status: 'pending' | 'resolved' | 'approved';
  handler?: string;
  handleRemark?: string;
  handleTime?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// 执行方案
export interface ExecutionPlan {
  id: string;
  discrepancyId: string;
  title: string;
  description: string;
  type: 'refund' | 'supplement' | 'adjust';
  amount: number;
  proposer: string;
  status: 'pending' | 'approved' | 'rejected';
  approver?: string;
  approvalTime?: string;
  approvalRemark?: string;
  createdAt: string;
}

// 日历日期
export interface CalendarDay {
  date: string;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: Schedule[];
  status: 'free' | 'partial' | 'occupied';
  mergedGroups?: MergedScheduleGroup[];
}

// 统计数据
export interface Statistics {
  totalSchedules: number;
  totalAmount: number;
  totalTeams: number;
  pendingReconciliations: number;
  discrepancyCount: number;
}
