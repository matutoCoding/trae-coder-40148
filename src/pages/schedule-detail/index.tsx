import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { useAppStore } from '@/store';
import { getMergedGroups } from '@/utils/merge';
import { Schedule, MergedScheduleGroup } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

const ScheduleDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id;

  const allSchedules = useAppStore(state => state.schedules);
  const cancelSchedule = useAppStore(state => state.cancelSchedule);
  const splitMergedSchedule = useAppStore(state => state.splitMergedSchedule);

  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [mergedGroup, setMergedGroup] = useState<MergedScheduleGroup | null>(null);

  const updateData = () => {
    const found = allSchedules.find(s => s.id === id);
    if (found) {
      setSchedule(found);
      if (found.isMerged && found.mergedGroupId) {
        const groups = getMergedGroups(allSchedules);
        const group = groups.find(g => g.id === found.mergedGroupId);
        if (group) {
          setMergedGroup(group);
        } else {
          setMergedGroup(null);
        }
      } else {
        setMergedGroup(null);
      }
    }
  };

  useEffect(() => {
    updateData();
  }, [id, allSchedules]);

  useDidShow(() => {
    updateData();
  });

  const groupSchedules = useMemo(() => {
    if (!schedule?.isMerged || !schedule.mergedGroupId) return [];
    return allSchedules.filter(s => s.mergedGroupId === schedule.mergedGroupId && s.status !== 'cancelled');
  }, [allSchedules, schedule]);

  const statusMap = {
    confirmed: { text: '已确认', color: '#00B42A' },
    pending: { text: '待确认', color: '#FF7D00' },
    cancelled: { text: '已取消', color: '#86909C' }
  };

  const handleEdit = () => {
    Taro.showToast({ title: '编辑功能开发中', icon: 'none' });
  };

  const handleCancel = () => {
    if (!schedule) return;

    const isMulti = schedule.isMerged && groupSchedules.length > 1;
    const content = isMulti
      ? `确定要取消 ${schedule.date} 的档期吗？\n连订档期将被拆分，剩余日期会重新合并。`
      : '确定要取消这个档期吗？';

    Taro.showModal({
      title: '确认取消',
      content,
      success: (res) => {
        if (res.confirm) {
          cancelSchedule(schedule.id);
          Taro.showToast({ title: '已取消档期', icon: 'success' });
          setTimeout(() => Taro.navigateBack(), 1000);
        }
      }
    });
  };

  const handleSplit = () => {
    if (!schedule?.isMerged || !schedule.mergedGroupId) return;

    Taro.showModal({
      title: '拆分连订',
      content: '确定要将这个连订档期拆分为独立档期吗？\n拆分后各日期档期可单独管理。',
      success: (res) => {
        if (res.confirm) {
          splitMergedSchedule(schedule.mergedGroupId!);
          Taro.showToast({ title: '已拆分档期', icon: 'success' });
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
            <Text className={styles.amountValue}>{formatMoney(Math.max(0, schedule.amount - schedule.deposit))}</Text>
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
          <View style={{ marginTop: '16rpx' }}>
            {groupSchedules.map(s => (
              <Text key={s.id} style={{ display: 'block', fontSize: '24rpx', color: '#86909C', marginTop: '4rpx' }}>
                • {s.date} {s.status === 'cancelled' ? '(已取消)' : ''}
              </Text>
            ))}
          </View>
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
          <Text className={styles.infoValue}>{formatMoney(Math.max(0, schedule.amount - schedule.deposit))}</Text>
        </View>
      </View>

      {schedule.remark && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>备注</Text>
          <Text className={styles.infoValue}>{schedule.remark}</Text>
        </View>
      )}

      <View style={{ height: 160 }} />

      {schedule.status !== 'cancelled' && (
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
      )}
    </ScrollView>
  );
};

export default ScheduleDetailPage;
