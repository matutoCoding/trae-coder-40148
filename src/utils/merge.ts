import { Schedule, MergedScheduleGroup } from '@/types';
import { addDays, diffDays, formatDate } from './date';

export const mergeSchedules = (
  schedules: Schedule[],
  coupleId: string,
  teamId: string
): Schedule[] => {
  const coupleSchedules = schedules
    .filter(s => s.coupleId === coupleId && s.teamId === teamId && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (coupleSchedules.length < 2) return schedules;

  const mergedGroups: MergedScheduleGroup[] = [];
  let currentGroup: MergedScheduleGroup | null = null;

  for (let i = 0; i < coupleSchedules.length; i++) {
    const current = coupleSchedules[i];
    const next = coupleSchedules[i + 1];

    if (!currentGroup) {
      currentGroup = {
        id: `mg_${Date.now()}_${i}`,
        coupleId: current.coupleId,
        coupleName: current.coupleName,
        teamId: current.teamId,
        teamName: current.teamName,
        startDate: current.date,
        endDate: current.date,
        dayCount: 1,
        totalAmount: current.amount,
        scheduleIds: [current.id],
        status: current.status,
        createdAt: new Date().toISOString()
      };
    }

    if (next) {
      const nextDay = addDays(current.date, 1);
      if (next.date === nextDay) {
        currentGroup.endDate = next.date;
        currentGroup.dayCount++;
        currentGroup.totalAmount += next.amount;
        currentGroup.scheduleIds.push(next.id);
      } else {
        if (currentGroup.dayCount > 1) {
          mergedGroups.push(currentGroup);
        }
        currentGroup = null;
      }
    } else {
      if (currentGroup.dayCount > 1) {
        mergedGroups.push(currentGroup);
      }
    }
  }

  const updatedSchedules = schedules.map(s => {
    const group = mergedGroups.find(g => g.scheduleIds.includes(s.id));
    if (group) {
      return {
        ...s,
        isMerged: true,
        mergedGroupId: group.id,
        mergedStartDate: group.startDate,
        mergedEndDate: group.endDate,
        mergedDayCount: group.dayCount
      };
    }
    return s;
  });

  return updatedSchedules;
};

export const splitSchedule = (
  schedules: Schedule[],
  scheduleId: string
): Schedule[] => {
  const schedule = schedules.find(s => s.id === scheduleId);
  if (!schedule || !schedule.isMerged) return schedules;

  const groupId = schedule.mergedGroupId;
  const groupSchedules = schedules.filter(s => s.mergedGroupId === groupId);

  if (groupSchedules.length <= 2) {
    return schedules.map(s => {
      if (s.mergedGroupId === groupId) {
        return {
          ...s,
          isMerged: false,
          mergedGroupId: undefined,
          mergedStartDate: undefined,
          mergedEndDate: undefined,
          mergedDayCount: undefined
        };
      }
      return s;
    });
  }

  const cancelledSchedule = { ...schedule, status: 'cancelled' as const, isMerged: false };
  const remainingSchedules = groupSchedules
    .filter(s => s.id !== scheduleId)
    .map(s => ({ ...s, isMerged: false }));

  const remerged = mergeSchedules([...remainingSchedules], schedule.coupleId, schedule.teamId);

  return schedules.map(s => {
    if (s.id === scheduleId) {
      return cancelledSchedule;
    }
    const remergedSchedule = remerged.find(rs => rs.id === s.id);
    if (remergedSchedule) {
      return remergedSchedule;
    }
    return s;
  });
};

export const canMergeSchedules = (
  schedule1: Schedule,
  schedule2: Schedule
): boolean => {
  if (schedule1.coupleId !== schedule2.coupleId) return false;
  if (schedule1.teamId !== schedule2.teamId) return false;
  if (schedule1.status === 'cancelled' || schedule2.status === 'cancelled') return false;

  const date1 = new Date(schedule1.date);
  const date2 = new Date(schedule2.date);
  const diff = Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24);

  return diff === 1;
};

export const getMergedGroups = (schedules: Schedule[]): MergedScheduleGroup[] => {
  const groups: Map<string, MergedScheduleGroup> = new Map();

  schedules.forEach(s => {
    if (!s.isMerged || !s.mergedGroupId) return;

    if (!groups.has(s.mergedGroupId)) {
      groups.set(s.mergedGroupId, {
        id: s.mergedGroupId,
        coupleId: s.coupleId,
        coupleName: s.coupleName,
        teamId: s.teamId,
        teamName: s.teamName,
        startDate: s.mergedStartDate || s.date,
        endDate: s.mergedEndDate || s.date,
        dayCount: s.mergedDayCount || 1,
        totalAmount: 0,
        scheduleIds: [],
        status: s.status,
        createdAt: s.createdAt
      });
    }

    const group = groups.get(s.mergedGroupId)!;
    group.totalAmount += s.amount;
    group.scheduleIds.push(s.id);
  });

  return Array.from(groups.values());
};
