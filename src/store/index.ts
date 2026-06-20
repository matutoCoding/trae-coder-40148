import { create } from 'zustand';
import { Team, Schedule, MergedScheduleGroup, Transaction, Discrepancy, ExecutionPlan, ProcessRecord } from '@/types';
import { mockTeams } from '@/data/team';
import { mockSchedules, mockMergedGroups } from '@/data/schedule';
import { mockTransactions, mockDiscrepancies, mockExecutionPlans } from '@/data/transaction';
import { mergeSchedules, splitSchedule } from '@/utils/merge';
import { diffDays, addDays, formatDate } from '@/utils/date';

interface ConflictCheckResult {
  hasConflict: boolean;
  conflictDates: string[];
  conflictScheduleIds: string[];
}

interface ReconciliationSummary {
  runAt: string;
  newDiscrepancies: number;
  resolvedDiscrepancies: number;
  pendingPlans: number;
  newDiscrepancyIds?: string[];
}

interface AppState {
  teams: Team[];
  schedules: Schedule[];
  mergedGroups: MergedScheduleGroup[];
  transactions: Transaction[];
  discrepancies: Discrepancy[];
  executionPlans: ExecutionPlan[];
  currentUser: { name: string; role: string };

  lastReconciliation?: ReconciliationSummary;
  reconcileFilters: {
    month?: string;
    teamId?: string;
    type?: Discrepancy['type'];
  };

  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void;
  checkScheduleConflict: (teamId: string, date: string, endDate?: string) => ConflictCheckResult;
  addSchedule: (scheduleData: {
    groomName: string;
    brideName: string;
    phone: string;
    teamId: string;
    teamName: string;
    date: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    amount: number;
    deposit: number;
    isMultiDay: boolean;
    allowConflict?: boolean;
    remark?: string;
  }) => void;
  cancelSchedule: (scheduleId: string) => void;
  splitMergedSchedule: (groupId: string) => void;
  recomputeConflicts: () => void;

  setReconcileFilters: (filters: Partial<AppState['reconcileFilters']>) => void;
  runReconciliation: () => ReconciliationSummary;
  resolveDiscrepancy: (id: string, remark: string) => void;
  createExecutionPlan: (plan: Omit<ExecutionPlan, 'id' | 'createdAt' | 'status'>) => void;
  batchCreateExecutionPlans: (planData: {
    discrepancyIds: string[];
    type: 'refund' | 'supplement' | 'adjust';
    title: string;
    description: string;
    amount: number;
  }) => void;
  approvePlan: (id: string, approver: string, remark: string) => void;
  rejectPlan: (id: string, approver: string, remark: string) => void;
}

const buildProcessRecord = (step: ProcessRecord['step'], operator: string, remark: string): ProcessRecord => ({
  step,
  operator,
  time: formatDate(new Date()),
  remark
});

const buildDiscrepancyKey = (
  type: Discrepancy['type'],
  platformTxId: string,
  teamTxId?: string
) => {
  return `${type}__${platformTxId}__${teamTxId || 'none'}`;
};

export const useAppStore = create<AppState>((set, get) => ({
  teams: [...mockTeams],
  schedules: [...mockSchedules],
  mergedGroups: [...mockMergedGroups],
  transactions: [...mockTransactions],
  discrepancies: [...mockDiscrepancies],
  executionPlans: [...mockExecutionPlans],
  currentUser: { name: '管理员', role: 'admin' },
  reconcileFilters: {},

  addTeam: (teamData) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}`,
      createdAt: formatDate(new Date())
    };
    set(state => ({ teams: [...state.teams, newTeam] }));
  },

  checkScheduleConflict: (teamId, date, endDate) => {
    const { schedules } = get();
    const conflictDates: string[] = [];
    const conflictScheduleIds: string[] = [];

    const dates: string[] = [];
    if (endDate) {
      const days = diffDays(date, endDate) + 1;
      for (let i = 0; i < days; i++) {
        dates.push(addDays(date, i));
      }
    } else {
      dates.push(date);
    }

    dates.forEach(d => {
      schedules.forEach(s => {
        if (s.status === 'cancelled' || s.teamId !== teamId) return;

        let occupy = false;
        if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
          const t = new Date(d).getTime();
          const start = new Date(s.mergedStartDate).getTime();
          const end = new Date(s.mergedEndDate).getTime();
          occupy = t >= start && t <= end;
        } else {
          occupy = s.date === d;
        }

        if (occupy && !conflictScheduleIds.includes(s.id)) {
          conflictDates.push(d);
          conflictScheduleIds.push(s.id);
        }
      });
    });

    return {
      hasConflict: conflictDates.length > 0,
      conflictDates,
      conflictScheduleIds
    };
  },

  recomputeConflicts: () => {
    set(state => {
      const { schedules } = state;
      const teamDateMap = new Map<string, Schedule[]>();

      schedules.forEach(s => {
        if (s.status === 'cancelled') return;
        if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
          const days = diffDays(s.mergedStartDate, s.mergedEndDate) + 1;
          for (let i = 0; i < days; i++) {
            const d = addDays(s.mergedStartDate, i);
            const key = `${s.teamId}__${d}`;
            if (!teamDateMap.has(key)) teamDateMap.set(key, []);
            teamDateMap.get(key)!.push(s);
          }
        } else {
          const key = `${s.teamId}__${s.date}`;
          if (!teamDateMap.has(key)) teamDateMap.set(key, []);
          teamDateMap.get(key)!.push(s);
        }
      });

      const conflictScheduleIds = new Set<string>();
      const conflictMap = new Map<string, string[]>();

      teamDateMap.forEach((list) => {
        if (list.length > 1) {
          list.forEach(s => {
            conflictScheduleIds.add(s.id);
            if (!conflictMap.has(s.id)) conflictMap.set(s.id, []);
          });
          const ids = list.map(s => s.id);
          list.forEach(s => {
            const others = ids.filter(i => i !== s.id);
            conflictMap.set(s.id, Array.from(new Set([...(conflictMap.get(s.id) || []), ...others])));
          });
        }
      });

      return {
        schedules: schedules.map(s => ({
          ...s,
          isConflict: conflictScheduleIds.has(s.id),
          conflictSchedules: conflictMap.get(s.id)
        }))
      };
    });
  },

  addSchedule: (data) => {
    const { groomName, brideName, phone, teamId, teamName, date, endDate, startTime, endTime, amount, deposit, isMultiDay, allowConflict, remark } = data;
    const coupleId = `couple_${Date.now()}`;
    const coupleName = `${groomName}先生 & ${brideName}女士`;
    const newSchedules: Schedule[] = [];

    if (isMultiDay && endDate) {
      const days = diffDays(date, endDate) + 1;
      const perDayAmount = Math.floor(amount / days);
      const perDayDeposit = Math.floor(deposit / days);

      for (let i = 0; i < days; i++) {
        const currentDate = addDays(date, i);
        newSchedules.push({
          id: `sch_${Date.now()}_${i}`,
          teamId,
          teamName,
          coupleId,
          coupleName,
          date: currentDate,
          startTime,
          endTime,
          status: 'confirmed',
          amount: i === days - 1 ? amount - perDayAmount * (days - 1) : perDayAmount,
          deposit: i === days - 1 ? deposit - perDayDeposit * (days - 1) : perDayDeposit,
          isMerged: false,
          remark,
          createdAt: formatDate(new Date())
        });
      }
    } else {
      newSchedules.push({
        id: `sch_${Date.now()}`,
        teamId,
        teamName,
        coupleId,
        coupleName,
        date,
        startTime,
        endTime,
        status: 'confirmed',
        amount,
        deposit,
        isMerged: false,
        remark,
        createdAt: formatDate(new Date())
      });
    }

    set(state => {
      const allSchedules = [...state.schedules, ...newSchedules];
      const merged = mergeSchedules(allSchedules, coupleId, teamId);

      const teamDateMap = new Map<string, Schedule[]>();
      merged.forEach(s => {
        if (s.status === 'cancelled') return;
        if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
          const days = diffDays(s.mergedStartDate, s.mergedEndDate) + 1;
          for (let i = 0; i < days; i++) {
            const d = addDays(s.mergedStartDate, i);
            const key = `${s.teamId}__${d}`;
            if (!teamDateMap.has(key)) teamDateMap.set(key, []);
            teamDateMap.get(key)!.push(s);
          }
        } else {
          const key = `${s.teamId}__${s.date}`;
          if (!teamDateMap.has(key)) teamDateMap.set(key, []);
          teamDateMap.get(key)!.push(s);
        }
      });

      const conflictScheduleIds = new Set<string>();
      const conflictMap = new Map<string, string[]>();
      teamDateMap.forEach((list) => {
        if (list.length > 1) {
          list.forEach(s => {
            conflictScheduleIds.add(s.id);
            if (!conflictMap.has(s.id)) conflictMap.set(s.id, []);
          });
          const ids = list.map(s => s.id);
          list.forEach(s => {
            const others = ids.filter(i => i !== s.id);
            conflictMap.set(s.id, Array.from(new Set([...(conflictMap.get(s.id) || []), ...others])));
          });
        }
      });

      const finalSchedules = merged.map(s => ({
        ...s,
        isConflict: allowConflict ? false : conflictScheduleIds.has(s.id),
        conflictSchedules: allowConflict ? undefined : conflictMap.get(s.id)
      }));

      return { schedules: finalSchedules };
    });
  },

  cancelSchedule: (scheduleId) => {
    set(state => {
      const schedule = state.schedules.find(s => s.id === scheduleId);
      if (!schedule) return state;

      let updated: Schedule[];
      if (schedule.isMerged && schedule.mergedGroupId) {
        updated = splitSchedule(state.schedules, scheduleId);
      } else {
        updated = state.schedules.map(s =>
          s.id === scheduleId ? { ...s, status: 'cancelled', isConflict: false, conflictSchedules: undefined } : s
        );
      }

      const teamDateMap = new Map<string, Schedule[]>();
      updated.forEach(s => {
        if (s.status === 'cancelled') return;
        if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
          const days = diffDays(s.mergedStartDate, s.mergedEndDate) + 1;
          for (let i = 0; i < days; i++) {
            const d = addDays(s.mergedStartDate, i);
            const key = `${s.teamId}__${d}`;
            if (!teamDateMap.has(key)) teamDateMap.set(key, []);
            teamDateMap.get(key)!.push(s);
          }
        } else {
          const key = `${s.teamId}__${s.date}`;
          if (!teamDateMap.has(key)) teamDateMap.set(key, []);
          teamDateMap.get(key)!.push(s);
        }
      });

      const conflictScheduleIds = new Set<string>();
      const conflictMap = new Map<string, string[]>();
      teamDateMap.forEach((list) => {
        if (list.length > 1) {
          list.forEach(s => {
            conflictScheduleIds.add(s.id);
            if (!conflictMap.has(s.id)) conflictMap.set(s.id, []);
          });
          const ids = list.map(s => s.id);
          list.forEach(s => {
            const others = ids.filter(i => i !== s.id);
            conflictMap.set(s.id, Array.from(new Set([...(conflictMap.get(s.id) || []), ...others])));
          });
        }
      });

      return {
        schedules: updated.map(s => ({
          ...s,
          isConflict: s.status === 'cancelled' ? false : conflictScheduleIds.has(s.id),
          conflictSchedules: s.status === 'cancelled' ? undefined : conflictMap.get(s.id)
        }))
      };
    });
  },

  splitMergedSchedule: (groupId) => {
    set(state => ({
      schedules: state.schedules.map(s =>
        s.mergedGroupId === groupId
          ? { ...s, isMerged: false, mergedGroupId: undefined, mergedStartDate: undefined, mergedEndDate: undefined, mergedDayCount: undefined }
          : s
      )
    }));
    setTimeout(() => get().recomputeConflicts(), 0);
  },

  setReconcileFilters: (filters) => {
    set(state => ({ reconcileFilters: { ...state.reconcileFilters, ...filters } }));
  },

  runReconciliation: () => {
    const summary: ReconciliationSummary = {
      runAt: formatDate(new Date()),
      newDiscrepancies: 0,
      resolvedDiscrepancies: 0,
      pendingPlans: 0
    };

    set(state => {
      const { transactions, discrepancies, executionPlans, reconcileFilters } = state;
      let platformTxs = transactions.filter(t => t.type === 'platform');
      let teamTxs = transactions.filter(t => t.type === 'team');

      if (reconcileFilters.month) {
        const prefix = reconcileFilters.month;
        platformTxs = platformTxs.filter(t => t.date.startsWith(prefix));
        teamTxs = teamTxs.filter(t => t.date.startsWith(prefix));
      }
      if (reconcileFilters.teamId) {
        platformTxs = platformTxs.filter(t => t.teamId === reconcileFilters.teamId);
        teamTxs = teamTxs.filter(t => t.teamId === reconcileFilters.teamId);
      }

      const newDiscrepancies: Discrepancy[] = [];
      const matchedPlatformIds = new Set<string>();
      const matchedTeamIds = new Set<string>();

      platformTxs.forEach(pTx => {
        const matchedTeam = teamTxs.find(t => t.orderNo === pTx.orderNo);
        if (matchedTeam) {
          matchedPlatformIds.add(pTx.id);
          matchedTeamIds.add(matchedTeam.id);

          const hasAmountDiff = pTx.amount !== matchedTeam.amount;
          const hasTimeDiff = pTx.date !== matchedTeam.date;

          if (hasAmountDiff) {
            newDiscrepancies.push({
              id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              platformTransactionId: pTx.id,
              teamTransactionId: matchedTeam.id,
              type: 'amount',
              description: `金额差异：${pTx.coupleName} 平台${pTx.amount} vs 团队${matchedTeam.amount}`,
              platformAmount: pTx.amount,
              teamAmount: matchedTeam.amount,
              diffAmount: Math.abs(pTx.amount - matchedTeam.amount),
              date: pTx.date,
              status: 'pending',
              processRecords: [buildProcessRecord('created', '系统', '自动对账发现金额差异')],
              createdAt: formatDate(new Date())
            });
          }
          if (hasTimeDiff) {
            newDiscrepancies.push({
              id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_t`,
              platformTransactionId: pTx.id,
              teamTransactionId: matchedTeam.id,
              type: 'time',
              description: `时间差异：${pTx.coupleName} 平台${pTx.date} vs 团队${matchedTeam.date}`,
              platformAmount: pTx.amount,
              teamAmount: matchedTeam.amount,
              diffAmount: 0,
              date: pTx.date,
              status: 'pending',
              processRecords: [buildProcessRecord('created', '系统', '自动对账发现时间差异')],
              createdAt: formatDate(new Date())
            });
          }
        }
      });

      platformTxs.forEach(pTx => {
        if (!matchedPlatformIds.has(pTx.id)) {
          newDiscrepancies.push({
            id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_mt`,
            platformTransactionId: pTx.id,
            type: 'missing_team',
            description: `团队端缺失：${pTx.coupleName} ${pTx.description}`,
            platformAmount: pTx.amount,
            diffAmount: pTx.amount,
            date: pTx.date,
            status: 'pending',
            processRecords: [buildProcessRecord('created', '系统', '自动对账发现团队端缺失流水')],
            createdAt: formatDate(new Date())
          });
        }
      });

      teamTxs.forEach(tTx => {
        if (!matchedTeamIds.has(tTx.id)) {
          newDiscrepancies.push({
            id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_mp`,
            platformTransactionId: tTx.id,
            type: 'missing_platform',
            description: `平台端缺失：${tTx.coupleName} ${tTx.description}`,
            platformAmount: 0,
            teamAmount: tTx.amount,
            diffAmount: tTx.amount,
            date: tTx.date,
            status: 'pending',
            processRecords: [buildProcessRecord('created', '系统', '自动对账发现平台端缺失流水')],
            createdAt: formatDate(new Date())
          });
        }
      });

      const existingKeys = new Set(
        discrepancies.map(d => buildDiscrepancyKey(d.type, d.platformTransactionId, d.teamTransactionId))
      );

      const uniqueNew = newDiscrepancies.filter(d => {
        const key = buildDiscrepancyKey(d.type, d.platformTransactionId, d.teamTransactionId);
        return !existingKeys.has(key);
      });

      summary.newDiscrepancies = uniqueNew.length;
      summary.newDiscrepancyIds = uniqueNew.map(d => d.id);
      summary.resolvedDiscrepancies = discrepancies.filter(d => d.status === 'resolved' || d.status === 'approved').length;
      summary.pendingPlans = executionPlans.filter(p => p.status === 'pending').length;

      if (reconcileFilters.type) {
        // 类型筛选条件在UI层应用
      }

      return {
        discrepancies: [...discrepancies, ...uniqueNew],
        lastReconciliation: summary
      };
    });

    return summary;
  },

  resolveDiscrepancy: (id, remark) => {
    const { currentUser } = get();
    set(state => ({
      discrepancies: state.discrepancies.map(d => {
        if (d.id !== id) return d;
        const prevRecords = d.processRecords || [];
        return {
          ...d,
          status: 'resolved',
          handler: currentUser.name,
          handleRemark: remark,
          handleTime: formatDate(new Date()),
          processRecords: [...prevRecords, buildProcessRecord('resolved', currentUser.name, remark)]
        };
      })
    }));
  },

  createExecutionPlan: (planData) => {
    const { currentUser } = get();
    const newPlan: ExecutionPlan = {
      ...planData,
      id: `plan_${Date.now()}`,
      status: 'pending',
      createdAt: formatDate(new Date())
    };

    set(state => ({
      executionPlans: [...state.executionPlans, newPlan],
      discrepancies: state.discrepancies.map(d => {
        if (d.id !== planData.discrepancyId) return d;
        const prevRecords = d.processRecords || [];
        return {
          ...d,
          status: 'processing',
          approvalStatus: 'pending',
          processRecords: [...prevRecords, buildProcessRecord('plan_created', currentUser.name, `创建${planData.type === 'refund' ? '退款' : planData.type === 'supplement' ? '补缴' : '调整'}方案：${planData.title}`)]
        };
      })
    }));
  },

  batchCreateExecutionPlans: (planData) => {
    const { currentUser } = get();
    const { discrepancyIds, type, title, description, amount } = planData;
    const typeLabel = type === 'refund' ? '退款' : type === 'supplement' ? '补缴' : '调整';

    set(state => {
      const newPlans: ExecutionPlan[] = discrepancyIds.map((id, idx) => ({
        id: `plan_${Date.now()}_${idx}`,
        discrepancyId: id,
        title,
        description,
        type,
        amount,
        proposer: currentUser.name,
        status: 'pending',
        createdAt: formatDate(new Date())
      }));

      const updatedDiscrepancies = state.discrepancies.map(d => {
        if (!discrepancyIds.includes(d.id)) return d;
        const prevRecords = d.processRecords || [];
        return {
          ...d,
          status: 'processing',
          approvalStatus: 'pending',
          processRecords: [...prevRecords, buildProcessRecord('plan_created', currentUser.name, `批量创建${typeLabel}方案：${title}`)]
        };
      });

      return {
        executionPlans: [...state.executionPlans, ...newPlans],
        discrepancies: updatedDiscrepancies
      };
    });
  },

  approvePlan: (id, approver, remark) => {
    set(state => {
      const plan = state.executionPlans.find(p => p.id === id);
      if (!plan) return state;

      return {
        executionPlans: state.executionPlans.map(p =>
          p.id === id
            ? {
                ...p,
                status: 'approved',
                approver,
                approvalRemark: remark,
                approvalTime: formatDate(new Date())
              }
            : p
        ),
        discrepancies: state.discrepancies.map(d => {
          if (d.id !== plan.discrepancyId) return d;
          const prevRecords = d.processRecords || [];
          return {
            ...d,
            approvalStatus: 'approved',
            status: 'approved',
            processRecords: [...prevRecords, buildProcessRecord('approved', approver, remark)]
          };
        })
      };
    });
  },

  rejectPlan: (id, approver, remark) => {
    set(state => {
      const plan = state.executionPlans.find(p => p.id === id);
      if (!plan) return state;

      return {
        executionPlans: state.executionPlans.map(p =>
          p.id === id
            ? {
                ...p,
                status: 'rejected',
                approver,
                approvalRemark: remark,
                approvalTime: formatDate(new Date())
              }
            : p
        ),
        discrepancies: state.discrepancies.map(d => {
          if (d.id !== plan.discrepancyId) return d;
          const prevRecords = d.processRecords || [];
          return {
            ...d,
            approvalStatus: 'rejected',
            status: 'pending',
            processRecords: [...prevRecords, buildProcessRecord('rejected', approver, remark)]
          };
        })
      };
    });
  }
}));
