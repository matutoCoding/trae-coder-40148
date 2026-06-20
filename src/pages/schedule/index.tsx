import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import Calendar from '@/components/Calendar';
import ScheduleCard from '@/components/ScheduleCard';
import { useAppStore } from '@/store';
import { getMergedGroups } from '@/utils/merge';
import { Schedule } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

const SchedulePage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-06-01'));
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-22');

  const schedules = useAppStore(state => state.schedules);
  const teams = useAppStore(state => state.teams);

  useDidShow(() => {
    console.log('[SchedulePage] 页面显示');
  });

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (s.status === 'cancelled') return false;
      if (selectedTeamId && s.teamId !== selectedTeamId) return false;
      return true;
    });
  }, [schedules, selectedTeamId]);

  const selectedDateSchedules = useMemo(() => {
    const daySchedules: Schedule[] = [];
    const seenGroups = new Set<string>();

    filteredSchedules.forEach(s => {
      if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
        const d = new Date(selectedDate).getTime();
        const start = new Date(s.mergedStartDate).getTime();
        const end = new Date(s.mergedEndDate).getTime();
        if (d >= start && d <= end) {
          if (!seenGroups.has(s.mergedGroupId!)) {
            seenGroups.add(s.mergedGroupId!);
            daySchedules.push(s);
          }
        }
      } else if (s.date === selectedDate) {
        daySchedules.push(s);
      }
    });

    return daySchedules;
  }, [filteredSchedules, selectedDate]);

  const stats = useMemo(() => {
    const monthSchedules = filteredSchedules.filter(s => {
      const date = new Date(s.date);
      return date.getFullYear() === currentMonth.getFullYear() &&
             date.getMonth() === currentMonth.getMonth();
    });

    const totalAmount = monthSchedules.reduce((sum, s) => sum + s.amount, 0);
    const mergedGroups = getMergedGroups(filteredSchedules);
    const mergedCount = mergedGroups.filter(g => {
      const startDate = new Date(g.startDate);
      return startDate.getFullYear() === currentMonth.getFullYear() &&
             startDate.getMonth() === currentMonth.getMonth();
    }).length;

    return {
      scheduleCount: monthSchedules.length,
      totalAmount,
      mergedCount
    };
  }, [filteredSchedules, currentMonth]);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleTeamFilter = (teamId: string) => {
    setSelectedTeamId(teamId === selectedTeamId ? '' : teamId);
  };

  const handleAddSchedule = () => {
    Taro.navigateTo({ url: `/pages/schedule-create/index?date=${selectedDate}` });
  };

  const handleViewAll = () => {
    console.log('[SchedulePage] 查看全部档期');
  };

  const activeTeams = teams.filter(t => t.status === 'active');

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>档期排期</Text>
        <Text className={styles.subtitle}>管理婚庆策划档期，实时掌握预约情况</Text>
      </View>

      <View className={styles.statsBar}>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{stats.scheduleCount}</Text>
          <Text className={styles.statLabel}>本月档期</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>¥{(stats.totalAmount / 10000).toFixed(1)}万</Text>
          <Text className={styles.statLabel}>预计营收</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statNumber}>{stats.mergedCount}</Text>
          <Text className={styles.statLabel}>连订订单</Text>
        </View>
      </View>

      <View className={styles.teamFilter}>
        <Text className={styles.filterLabel}>按团队筛选：</Text>
        <ScrollView scrollX className={styles.teamTabs}>
          <View
            className={[styles.teamTab, !selectedTeamId && styles.activeTab].join(' ')}
            onClick={() => handleTeamFilter('')}
          >
            全部团队
          </View>
          {activeTeams.map(team => (
            <View
              key={team.id}
              className={[styles.teamTab, selectedTeamId === team.id && styles.activeTab].join(' ')}
              onClick={() => handleTeamFilter(team.id)}
            >
              {team.name}
            </View>
          ))}
        </ScrollView>
      </View>

      <View className={styles.legend}>
        <View className={styles.legendItem}>
          <View className={[styles.legendDot, styles.free].join(' ')} />
          <Text className={styles.legendText}>空闲</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={[styles.legendDot, styles.occupied].join(' ')} />
          <Text className={styles.legendText}>已占用</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={[styles.legendDot, styles.merged].join(' ')} />
          <Text className={styles.legendText}>连订</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={[styles.legendDot, styles.conflict].join(' ')} />
          <Text className={styles.legendText}>冲突</Text>
        </View>
      </View>

      <View className={styles.calendarSection}>
        <Calendar
          currentMonth={currentMonth}
          schedules={filteredSchedules}
          selectedTeamId={selectedTeamId || undefined}
          onDateClick={handleDateClick}
          onMonthChange={setCurrentMonth}
        />
      </View>

      <View className={styles.selectedDateSection}>
        <View className={styles.selectedDateHeader}>
          <Text className={styles.selectedDateTitle}>{selectedDate} 档期</Text>
          <View className={styles.addBtn} onClick={handleAddSchedule}>
            + 新增
          </View>
        </View>

        <View className={styles.scheduleList}>
          {selectedDateSchedules.length > 0 ? (
            selectedDateSchedules.map(schedule => (
              <ScheduleCard key={schedule.id} schedule={schedule} showDate={false} />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📅</Text>
              <Text className={styles.emptyText}>当日暂无档期，点击上方按钮新增</Text>
            </View>
          )}
        </View>
      </View>

      <View className={styles.quickActions}>
        <View className={styles.actionCard} onClick={handleAddSchedule}>
          <View className={styles.actionIcon}>
            <Text className={styles.actionIconText}>+</Text>
          </View>
          <Text className={styles.actionText}>新增档期</Text>
        </View>
        <View className={styles.actionCard} onClick={handleViewAll}>
          <View className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #9D8CFF 100%)' }}>
            <Text className={styles.actionIconText}>📋</Text>
          </View>
          <Text className={styles.actionText}>全部档期</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SchedulePage;
