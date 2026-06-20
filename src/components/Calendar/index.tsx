import React, { useState, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import { CalendarDay, Schedule } from '@/types';
import { getMonthDays, getFirstDayOfMonth, formatDate, isToday } from '@/utils/date';
import styles from './index.module.scss';

interface CalendarProps {
  currentMonth: Date;
  schedules: Schedule[];
  selectedTeamId?: string;
  onDateClick?: (date: string) => void;
  onMonthChange?: (month: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  currentMonth,
  schedules,
  selectedTeamId,
  onDateClick,
  onMonthChange
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const daysInMonth = getMonthDays(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const daysInPrevMonth = getMonthDays(prevYear, prevMonth);

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dateStr = formatDate(new Date(prevYear, prevMonth - 1, day));
      days.push({
        date: dateStr,
        day,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
        isToday: isToday(dateStr),
        schedules: [],
        status: 'free'
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(year, month - 1, day));
      const daySchedules = schedules.filter(s => {
        if (s.status === 'cancelled') return false;
        if (selectedTeamId && s.teamId !== selectedTeamId) return false;
        if (s.isMerged && s.mergedStartDate && s.mergedEndDate) {
          const d = new Date(dateStr).getTime();
          const start = new Date(s.mergedStartDate).getTime();
          const end = new Date(s.mergedEndDate).getTime();
          return d >= start && d <= end;
        }
        return s.date === dateStr;
      });

      let status: CalendarDay['status'] = 'free';
      if (daySchedules.length > 0) {
        status = 'occupied';
      }

      days.push({
        date: dateStr,
        day,
        month,
        year,
        isCurrentMonth: true,
        isToday: isToday(dateStr),
        schedules: daySchedules,
        status
      });
    }

    const remainingDays = 42 - days.length;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    for (let day = 1; day <= remainingDays; day++) {
      const dateStr = formatDate(new Date(nextYear, nextMonth - 1, day));
      days.push({
        date: dateStr,
        day,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        isToday: isToday(dateStr),
        schedules: [],
        status: 'free'
      });
    }

    return days;
  }, [year, month, schedules, selectedTeamId]);

  const handleDateClick = (date: string) => {
    onDateClick?.(date);
  };

  const handlePrevMonth = () => {
    const newDate = new Date(year, month - 2, 1);
    onMonthChange?.(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(year, month, 1);
    onMonthChange?.(newDate);
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <View className={styles.calendar}>
      <View className={styles.header}>
        <Text className={styles.navBtn} onClick={handlePrevMonth}>‹</Text>
        <Text className={styles.monthTitle}>{year}年{month}月</Text>
        <Text className={styles.navBtn} onClick={handleNextMonth}>›</Text>
      </View>

      <View className={styles.weekHeader}>
        {weekDays.map((day, index) => (
          <Text key={index} className={styles.weekDay}>{day}</Text>
        ))}
      </View>

      <View className={styles.daysGrid}>
        {calendarDays.map((day, index) => (
          <View
            key={index}
            className={[
              styles.dayCell,
              !day.isCurrentMonth && styles.otherMonth,
              day.isToday && styles.today,
              day.status === 'occupied' && styles.occupied,
              day.status === 'partial' && styles.partial
            ].filter(Boolean).join(' ')}
            onClick={() => handleDateClick(day.date)}
          >
            <Text className={styles.dayNumber}>{day.day}</Text>
            {day.schedules.length > 0 && (
              <View className={styles.scheduleDots}>
                {day.schedules.slice(0, 3).map((s, i) => (
                  <View
                    key={i}
                    className={[
                      styles.dot,
                      s.isMerged && styles.mergedDot
                    ].filter(Boolean).join(' ')}
                  />
                ))}
                {day.schedules.length > 3 && (
                  <Text className={styles.moreText}>+{day.schedules.length - 3}</Text>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default Calendar;
