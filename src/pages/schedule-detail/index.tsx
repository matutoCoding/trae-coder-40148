import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { mockSchedules, mockMergedGroups } from '@/data/schedule';
import { Schedule, MergedScheduleGroup } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

const ScheduleDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id;
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [mergedGroup, setMergedGroup] = useState<MergedScheduleGroup | null>(null);

  useEffect(() => {
    const found = mockSchedules.find(s => s.id === id);
    if (found) {
      setSchedule(found);
      if (found.isMerged && found.mergedGroupId) {
        const group = mockMergedGroups.find(g => g.id === found.mergedGroupId);
        if (group) {
          setMergedGroup(group);
        }
      }
    }
    console.log('[ScheduleDetail] 档期详情:', id);
  }, [id]);

  const statusMap = {
    confirmed: { text: '已确认', color: '#00B42A' },
    pending: { text: '待确认', color: '#FF7D00' },
    cancelled: { text: '已取消', color: '#86909C' }
  };

  const handleEdit = () => {
    Taro.showToast({ title: '编辑功能开发中', icon: 'none' });
  };

  const handleCancel = () => {
    Taro.showModal({
      title: '确认取消',
      content: '确定要取消这个档期吗？取消后档期将被拆开。',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '已取消档期', icon: 'success' });
          console.log('[ScheduleDetail] 取消档期，触发拆分逻辑');
          setTimeout(() => Taro.navigateBack(), 1500);
        }
      }
    });
  };

  const handleSplit = () => {
    Taro.showModal({
      title: '拆分连订',
      content: '确定要将这个连订档期拆分为独立档期吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '已拆分档期', icon: 'success' });
          console.log('[ScheduleDetail] 拆分连订档期');
        }
      }
    });
  };

  if (!schedule) {
    return (
      <View className={styles.page}>
        <Text>加载中...</Text>
      </View>
    );
  }

  const status = statusMap[schedule.status];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.coupleName}>{schedule.coupleName}</Text>
        <View className={styles.statusBadge}>
          <Text className={styles.statusText}>{status.text}</Text>
        </View>
        <View className={styles.amountRow}>
          <View className={styles.amountItem}>
            <Text className={styles.amountValue}>{formatMoney(schedule.amount)}</Text>
            <Text className={styles.amountLabel}>总金额</Text>
          </View>
          <View className={styles.amountItem}>
            <Text className={styles.amountValue}>{formatMoney(schedule.deposit)}</Text>
            <Text className={styles.amountLabel}>已收定金</Text>
          </View>
          <View className={styles.amountItem}>
            <Text className={styles.amountValue}>{formatMoney(schedule.amount - schedule.deposit)}</Text>
            <Text className={styles.amountLabel}>待收款</Text>
          </View>
        </View>
      </View>

      {schedule.isMerged && mergedGroup && (
        <View className={styles.mergedInfo}>
          <Text className={styles.mergedTitle}>🔗 连订档期 ({mergedGroup.dayCount}天)</Text>
          <Text className={styles.mergedDesc}>
            {mergedGroup.startDate} ~ {mergedGroup.endDate}
          </Text>
        </View>
      )}

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>档期信息</Text>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>策划团队</Text>
          <Text className={styles.infoValue}>{schedule.teamName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>档期日期</Text>
          <Text className={styles.infoValue}>
            {schedule.isMerged
              ? `${schedule.mergedStartDate} ~ ${schedule.mergedEndDate}`
              : schedule.date
            }
          </Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>服务时间</Text>
          <Text className={styles.infoValue}>{schedule.startTime} - {schedule.endTime}</Text>
        </View>
        {schedule.isMerged && (
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>连订天数</Text>
            <Text className={styles.infoValue}>{schedule.mergedDayCount}天</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>费用明细</Text>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>服务费用</Text>
          <Text className={styles.infoValue}>{formatMoney(schedule.amount)}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>已收定金</Text>
          <Text className={styles.infoValue}>{formatMoney(schedule.deposit)}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>尾款金额</Text>
          <Text className={styles.infoValue}>{formatMoney(schedule.amount - schedule.deposit)}</Text>
        </View>
      </View>

      {schedule.remark && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>备注</Text>
          <Text className={styles.infoValue}>{schedule.remark}</Text>
        </View>
      )}

      <View style={{ height: 160 }} />

      <View className={styles.actionBar + ' safe-area-bottom'}>
        <View className={[styles.btn, styles.btnSecondary].join(' ')} onClick={handleEdit}>
          编辑
        </View>
        {schedule.isMerged && (
          <View className={[styles.btn, styles.btnSecondary].join(' ')} onClick={handleSplit}>
            拆分
          </View>
        )}
        <View className={[styles.btn, styles.btnDanger].join(' ')} onClick={handleCancel}>
          取消档期
        </View>
      </View>
    </ScrollView>
  );
};

export default ScheduleDetailPage;
