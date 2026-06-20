import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import Calendar from '@/components/Calendar';
import ScheduleCard from '@/components/ScheduleCard';
import { useAppStore } from '@/store';
import { getMergedGroups } from '@/utils/merge';
import { Schedule } from '@/types';
import { formatMoney, addMonths, formatDate } from '@/utils/date';
import styles from './index.module.scss';

const SchedulePage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'calendar' | 'availability'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date('2026-06-01'));
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-22');
  const [availabilityTeamId, setAvailabilityTeamId] = useState<string>('');
  const [conflictModalVisible, setConflictModalVisible] = useState(false);
  const [conflictModalDate, setConflictModalDate] = useState('');
  const [conflictModalSchedules, setConflictModalSchedules] = useState<Schedule[]>([]);

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

  const availabilityMonthStr = useMemo(() => {
    return `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  }, [currentMonth]);

  const teamAvailabilityData = useMemo(() => {
    if (!availabilityTeamId) return [];
    const teamSchedules = schedules.filter(s => s.teamId === availabilityTeamId && s.status !== 'cancelled');
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days: Array<{
      date: string;
      day: number;
      isCurrentMonth: boolean;
      status: 'free' | 'occupied' | 'conflict';
      schedules: Schedule[];
    }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      days.push({
        date: formatDate(new Date(year, month - 1, d)),
        day: d,
        isCurrentMonth: false,
        status: 'free',
        schedules: []
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(new Date(year, month, d));
      const daySchedules: Schedule[] = [];
      
      const seenGroups = new Set<string>();
      teamSchedules.forEach(s => {
        if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
          const t = new Date(dateStr).getTime();
          const start = new Date(s.mergedStartDate).getTime();
          const end = new Date(s.mergedEndDate).getTime();
          if (t >= start && t <= end) {
            if (!seenGroups.has(s.mergedGroupId!)) {
              seenGroups.add(s.mergedGroupId!);
              daySchedules.push(s);
            }
          }
        } else if (s.date === dateStr) {
          daySchedules.push(s);
        }
      });

      let status: 'free' | 'occupied' | 'conflict' = 'free';
      if (daySchedules.length > 0) {
        const hasConflict = daySchedules.some(s => s.isConflict);
        status = hasConflict ? 'conflict' : 'occupied';
      }

      days.push({
        date: dateStr,
        day: d,
        isCurrentMonth: true,
        status,
        schedules: daySchedules
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: formatDate(new Date(year, month + 1, d)),
        day: d,
        isCurrentMonth: false,
        status: 'free',
        schedules: []
      });
    }

    return days;
  }, [schedules, availabilityTeamId, currentMonth]);

  const availabilityStats = useMemo(() => {
    const currentMonthDays = teamAvailabilityData.filter(d => d.isCurrentMonth);
    const freeDays = currentMonthDays.filter(d => d.status === 'free').length;
    const occupiedDays = currentMonthDays.filter(d => d.status === 'occupied').length;
    const conflictDays = currentMonthDays.filter(d => d.status === 'conflict').length;
    return { freeDays, occupiedDays, conflictDays };
  }, [teamAvailabilityData]);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleTeamFilter = (teamId: string) => {
    setSelectedTeamId(teamId === selectedTeamId ? '' : teamId);
  };

  const handleAvailabilityTeamClick = (teamId: string) => {
    setAvailabilityTeamId(teamId === availabilityTeamId ? '' : teamId);
  };

  const handleAvailabilityDayClick = (dayData: { date: string; status: string; schedules: Schedule[] }) => {
    if (dayData.status === 'conflict') {
      setConflictModalDate(dayData.date);
      setConflictModalSchedules(dayData.schedules);
      setConflictModalVisible(true);
    } else if (dayData.status === 'occupied') {
      Taro.navigateTo({ url: `/pages/schedule-detail/index?id=${dayData.schedules[0]?.id}` });
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => addMonths(prev, -1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleCloseConflictModal = () => {
    setConflictModalVisible(false);
  };

  const handleScheduleClick = (scheduleId: string) => {
    Taro.navigateTo({ url: `/pages/schedule-detail/index?id=${scheduleId}` });
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

      <View className={styles.viewTabs}>
        <View
          className={[styles.viewTab, viewMode === 'calendar' && styles.activeViewTab].join(' ')}
          onClick={() => setViewMode('calendar')}
        >
          📅 日历视图
        </View>
        <View
          className={[styles.viewTab, viewMode === 'availability' && styles.activeViewTab].join(' ')}
          onClick={() => setViewMode('availability')}
        >
          📊 团队可用性
        </View>
      </View>

      {viewMode === 'calendar' ? (
        <>
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
        </>
      ) : (
        <>
          <View className={styles.teamSelect}>
            <Text className={styles.teamSelectLabel}>选择团队查看可用性：</Text>
            <View className={styles.teamSelectList}>
              {activeTeams.map(team => (
                <View
                  key={team.id}
                  className={[styles.teamChip, availabilityTeamId === team.id && styles.activeTeamChip].join(' ')}
                  onClick={() => handleAvailabilityTeamClick(team.id)}
                >
                  {team.name}
                </View>
              ))}
            </View>
          </View>

          {availabilityTeamId ? (
            <View className={styles.teamAvailability}>
              <View className={styles.monthHeader}>
                <View className={styles.monthNavBtn} onClick={handlePrevMonth}>‹</View>
                <Text className={styles.monthText}>{availabilityMonthStr}</Text>
                <View className={styles.monthNavBtn} onClick={handleNextMonth}>›</View>
              </View>

              <View className={styles.weekDays}>
                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                  <View key={day} className={styles.weekDay}>{day}</View>
                ))}
              </View>

              <View className={styles.calendarGrid}>
                {teamAvailabilityData.map((day, idx) => (
                  <View
                    key={idx}
                    className={[
                      styles.calDay,
                      !day.isCurrentMonth && styles.otherMonth,
                      styles[day.status]
                    ].join(' ')}
                    onClick={() => day.isCurrentMonth && handleAvailabilityDayClick(day)}
                  >
                    <Text className={styles.dayNumber}>{day.day}</Text>
                    {day.isCurrentMonth && (
                      <Text className={styles.dayStatus}>
                        {day.status === 'free' ? '空闲' : day.status === 'occupied' ? '占用' : '冲突'}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              <View className={styles.availabilityStats}>
                <View className={styles.availabilityStatItem}>
                  <Text className={[styles.availabilityStatNum, styles.greenText].join(' ')}>
                    {availabilityStats.freeDays}
                  </Text>
                  <Text className={styles.availabilityStatLabel}>空闲天数</Text>
                </View>
                <View className={styles.availabilityStatItem}>
                  <Text className={[styles.availabilityStatNum, styles.redText].join(' ')}>
                    {availabilityStats.occupiedDays}
                  </Text>
                  <Text className={styles.availabilityStatLabel}>已占用</Text>
                </View>
                <View className={styles.availabilityStatItem}>
                  <Text className={[styles.availabilityStatNum, styles.orangeText].join(' ')}>
                    {availabilityStats.conflictDays}
                  </Text>
                  <Text className={styles.availabilityStatLabel}>冲突天数</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>👆</Text>
              <Text className={styles.emptyText}>请选择一个团队查看当月可用性</Text>
            </View>
          )}

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
              <View className={[styles.legendDot, styles.conflict].join(' ')} />
              <Text className={styles.legendText}>冲突</Text>
            </View>
          </View>
        </>
      )}

      {conflictModalVisible && (
        <View className={styles.conflictModal} onClick={handleCloseConflictModal}>
          <View className={styles.conflictModalContent} onClick={e => e.stopPropagation()}>
            <View className={styles.closeModalBtn} onClick={handleCloseConflictModal}>×</View>
            <Text className={styles.conflictModalTitle}>档期冲突详情</Text>
            <Text className={styles.conflictModalDate}>📅 {conflictModalDate} 共 {conflictModalSchedules.length} 场婚礼撞期</Text>
            
            {conflictModalSchedules.map(schedule => (
              <View
                key={schedule.id}
                className={styles.conflictItem}
                onClick={() => handleScheduleClick(schedule.id)}
              >
                <Text className={styles.conflictCouple}>{schedule.coupleName}</Text>
                <Text className={styles.conflictTime}>
                  ⏰ {schedule.startTime} - {schedule.endTime} · {schedule.teamName}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default SchedulePage;
