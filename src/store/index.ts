import { create } from 'zustand';
import { Team, Schedule, MergedScheduleGroup, Transaction, Discrepancy, ExecutionPlan } from '@/types';
import { mockTeams } from '@/data/team';
import { mockSchedules, mockMergedGroups } from '@/data/schedule';
import { mockTransactions, mockDiscrepancies, mockExecutionPlans } from '@/data/transaction';
import { mergeSchedules, splitSchedule } from '@/utils/merge';
import { diffDays, addDays, formatDate } from '@/utils/date';

interface AppState {
  teams: Team[];
  schedules: Schedule[];
  mergedGroups: MergedScheduleGroup[];
  transactions: Transaction[];
  discrepancies: Discrepancy[];
  executionPlans: ExecutionPlan[];
  currentUser: { name: string; role: string };

  addTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void;
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
    remark?: string;
  }) => void;
  cancelSchedule: (scheduleId: string) => void;
  splitMergedSchedule: (groupId: string) => void;

  runReconciliation: () => void;
  resolveDiscrepancy: (id: string, remark: string) => void;
  createExecutionPlan: (plan: Omit<ExecutionPlan, 'id' | 'createdAt' | 'status'>) => void;
  approvePlan: (id: string, approver: string, remark: string) => void;
  rejectPlan: (id: string, approver: string, remark: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  teams: [...mockTeams],
  schedules: [...mockSchedules],
  mergedGroups: [...mockMergedGroups],
  transactions: [...mockTransactions],
  discrepancies: [...mockDiscrepancies],
  executionPlans: [...mockExecutionPlans],
  currentUser: { name: '管理员', role: 'admin' },

  addTeam: (teamData) => {
    const newTeam: Team = {
      ...teamData,
      id: `team_${Date.now()}`,
      createdAt: formatDate(new Date())
    };
    set(state => ({ teams: [...state.teams, newTeam] }));
  },

  addSchedule: (data) => {
    const { groomName, brideName, phone, teamId, teamName, date, endDate, startTime, endTime, amount, deposit, isMultiDay, remark } = data;
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
      return { schedules: merged };
    });
  },

  cancelSchedule: (scheduleId) => {
    set(state => {
      const schedule = state.schedules.find(s => s.id === scheduleId);
      if (!schedule) return state;

      if (schedule.isMerged && schedule.mergedGroupId) {
        const updated = splitSchedule(state.schedules, scheduleId);
        return { schedules: updated };
      } else {
        return {
          schedules: state.schedules.map(s =>
            s.id === scheduleId ? { ...s, status: 'cancelled' } : s
          )
        };
      }
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
  },

  runReconciliation: () => {
    set(state => {
      const { transactions } = state;
      const platformTxs = transactions.filter(t => t.type === 'platform');
      const teamTxs = transactions.filter(t => t.type === 'team');
      const newDiscrepancies: Discrepancy[] = [];
      const matchedPlatformIds = new Set<string>();
      const matchedTeamIds = new Set<string>();

      platformTxs.forEach(pTx => {
        const matchedTeam = teamTxs.find(t => t.orderNo === pTx.orderNo);
        if (matchedTeam) {
          matchedPlatformIds.add(pTx.id);
          matchedTeamIds.add(matchedTeam.id);

          if (pTx.amount !== matchedTeam.amount) {
            newDiscrepancies.push({
              id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              platformTransactionId: pTx.id,
              teamTransactionId: matchedTeam.id,
              type: 'amount',
              description: `金额差异：平台${pTx.amount} vs 团队${matchedTeam.amount}`,
              platformAmount: pTx.amount,
              teamAmount: matchedTeam.amount,
              diffAmount: Math.abs(pTx.amount - matchedTeam.amount),
              date: pTx.date,
              status: 'pending',
              createdAt: formatDate(new Date())
            });
          } else if (pTx.date !== matchedTeam.date) {
            newDiscrepancies.push({
              id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              platformTransactionId: pTx.id,
              teamTransactionId: matchedTeam.id,
              type: 'time',
              description: `时间差异：平台${pTx.date} vs 团队${matchedTeam.date}`,
              platformAmount: pTx.amount,
              teamAmount: matchedTeam.amount,
              diffAmount: 0,
              date: pTx.date,
              status: 'pending',
              createdAt: formatDate(new Date())
            });
          }
        }
      });

      platformTxs.forEach(pTx => {
        if (!matchedPlatformIds.has(pTx.id)) {
          newDiscrepancies.push({
            id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            platformTransactionId: pTx.id,
            type: 'missing_team',
            description: `团队端缺失：${pTx.coupleName} ${pTx.description}`,
            platformAmount: pTx.amount,
            diffAmount: pTx.amount,
            date: pTx.date,
            status: 'pending',
            createdAt: formatDate(new Date())
          });
        }
      });

      teamTxs.forEach(tTx => {
        if (!matchedTeamIds.has(tTx.id)) {
          newDiscrepancies.push({
            id: `disc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            platformTransactionId: tTx.id,
            type: 'missing_platform',
            description: `平台端缺失：${tTx.coupleName} ${tTx.description}`,
            platformAmount: 0,
            teamAmount: tTx.amount,
            diffAmount: tTx.amount,
            date: tTx.date,
            status: 'pending',
            createdAt: formatDate(new Date())
          });
        }
      });

      const existingPendingIds = new Set(
        state.discrepancies.filter(d => d.status === 'pending').map(d => d.description)
      );
      const uniqueNewDiscrepancies = newDiscrepancies.filter(d => !existingPendingIds.has(d.description));

      return {
        discrepancies: [...state.discrepancies, ...uniqueNewDiscrepancies]
      };
    });
  },

  resolveDiscrepancy: (id, remark) => {
    const { currentUser } = get();
    set(state => ({
      discrepancies: state.discrepancies.map(d =>
        d.id === id
          ? {
              ...d,
              status: 'resolved',
              handler: currentUser.name,
              handleRemark: remark,
              handleTime: formatDate(new Date())
            }
          : d
      )
    }));
  },

  createExecutionPlan: (planData) => {
    const newPlan: ExecutionPlan = {
      ...planData,
      id: `plan_${Date.now()}`,
      status: 'pending',
      createdAt: formatDate(new Date())
    };
    set(state => ({ executionPlans: [...state.executionPlans, newPlan] }));
  },

  approvePlan: (id, approver, remark) => {
    set(state => ({
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
        const plan = state.executionPlans.find(p => p.id === id);
        if (plan && d.id === plan.discrepancyId) {
          return { ...d, approvalStatus: 'approved' };
        }
        return d;
      })
    }));
  },

  rejectPlan: (id, approver, remark) => {
    set(state => ({
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
        const plan = state.executionPlans.find(p => p.id === id);
        if (plan && d.id === plan.discrepancyId) {
          return { ...d, approvalStatus: 'rejected' };
        }
        return d;
      })
    }));
  }
}));
