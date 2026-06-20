import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Schedule } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

interface ScheduleCardProps {
  schedule: Schedule;
  showDate?: boolean;
  onClick?: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, showDate = true, onClick }) => {
  const statusMap = {
    confirmed: { text: '已确认', color: '#00B42A', bg: 'rgba(0, 180, 42, 0.1)' },
    pending: { text: '待确认', color: '#FF7D00', bg: 'rgba(255, 125, 0, 0.1)' },
    cancelled: { text: '已取消', color: '#86909C', bg: 'rgba(134, 144, 156, 0.1)' }
  };

  const status = statusMap[schedule.status];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/schedule-detail/index?id=${schedule.id}` });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.coupleInfo}>
          <Text className={styles.coupleName}>{schedule.coupleName}</Text>
          <View className={styles.statusTag} style={{ color: status.color, background: status.bg }}>
            {status.text}
          </View>
        </View>
        {schedule.isMerged && (
          <View className={styles.mergedTag}>
            <Text className={styles.mergedText}>连订{schedule.mergedDayCount}天</Text>
          </View>
        )}
      </View>

      <View className={styles.content}>
        <View className={styles.infoRow}>
          <Text className={styles.label}>策划团队</Text>
          <Text className={styles.value}>{schedule.teamName}</Text>
        </View>
        {showDate && (
          <View className={styles.infoRow}>
            <Text className={styles.label}>档期日期</Text>
            <Text className={styles.value}>
              {schedule.isMerged ? `${schedule.mergedStartDate} ~ ${schedule.mergedEndDate}` : schedule.date}
            </Text>
          </View>
        )}
        <View className={styles.infoRow}>
          <Text className={styles.label}>服务时间</Text>
          <Text className={styles.value}>{schedule.startTime} - {schedule.endTime}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.amountInfo}>
          <Text className={styles.amountLabel}>总金额</Text>
          <Text className={styles.amount}>{formatMoney(schedule.amount)}</Text>
        </View>
        <View className={styles.depositInfo}>
          <Text className={styles.depositLabel}>定金</Text>
          <Text className={styles.deposit}>{formatMoney(schedule.deposit)}</Text>
        </View>
      </View>
    </View>
  );
};

export default ScheduleCard;
