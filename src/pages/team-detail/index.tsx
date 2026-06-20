import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { useAppStore } from '@/store';
import { Team, Schedule } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

const TeamDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id;

  const teams = useAppStore(state => state.teams);
  const schedules = useAppStore(state => state.schedules);

  const [team, setTeam] = useState<Team | null>(null);

  const refreshData = () => {
    const found = teams.find(t => t.id === id);
    if (found) {
      setTeam(found);
    }
  };

  useEffect(() => {
    refreshData();
  }, [id, teams]);

  useDidShow(() => {
    refreshData();
  });

  const teamSchedules = useMemo(() => {
    return schedules
      .filter(s => s.teamId === id && s.status !== 'cancelled')
      .slice(0, 5);
  }, [schedules, id]);

  const handleEdit = () => {
    Taro.showToast({ title: '编辑功能开发中', icon: 'none' });
  };

  const handleAddSchedule = () => {
    Taro.navigateTo({ url: `/pages/schedule-create/index?teamId=${id}` });
  };

  const handleToggleStatus = () => {
    Taro.showModal({
      title: '确认操作',
      content: team?.status === 'active' ? '确定要暂停与该团队的合作吗？' : '确定要恢复与该团队的合作吗？',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({ title: '操作成功', icon: 'success' });
        }
      }
    });
  };

  if (!team) {
    return (
      <View className={styles.page}>
        <Text>加载中...</Text>
      </View>
    );
  }

  const totalAmount = teamSchedules.reduce((sum, s) => sum + s.amount, 0);

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View className={styles.teamInfo}>
          <View className={styles.avatar}>
            <Text className={styles.avatarText}>{team.name.charAt(0)}</Text>
          </View>
          <View className={styles.teamDetail}>
            <Text className={styles.teamName}>{team.name}</Text>
            <Text className={styles.leaderName}>负责人：{team.leader}</Text>
          </View>
          <View className={styles.statusBadge}>
            <Text className={styles.statusText}>
              {team.status === 'active' ? '合作中' : '已暂停'}
            </Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{team.commissionRate}%</Text>
            <Text className={styles.statLabel}>分成比例</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{teamSchedules.length}</Text>
            <Text className={styles.statLabel}>在档档期</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>¥{(totalAmount / 10000).toFixed(1)}万</Text>
            <Text className={styles.statLabel}>业绩金额</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>基本信息</Text>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>团队名称</Text>
            <Text className={styles.infoValue}>{team.name}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>负责人</Text>
            <Text className={styles.infoValue}>{team.leader}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>联系电话</Text>
            <Text className={styles.infoValue}>{team.phone}</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>分成比例</Text>
            <Text className={styles.infoValue}>{team.commissionRate}%</Text>
          </View>
          <View className={styles.infoRow}>
            <Text className={styles.infoLabel}>加入时间</Text>
            <Text className={styles.infoValue}>{team.createdAt}</Text>
          </View>
        </View>

        {team.description && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>团队介绍</Text>
            <Text className={styles.descText}>{team.description}</Text>
          </View>
        )}

        <View className={styles.section}>
          <View className={styles.listHeader}>
            <Text className={styles.listTitle}>近期档期</Text>
            <Text className={styles.viewMore}>查看全部 ›</Text>
          </View>
          {teamSchedules.length > 0 ? (
            teamSchedules.map(schedule => (
              <View
                key={schedule.id}
                className={styles.scheduleItem}
                onClick={() => Taro.navigateTo({ url: `/pages/schedule-detail/index?id=${schedule.id}` })}
              >
                <Text className={styles.scheduleDate}>{schedule.date}</Text>
                <Text className={styles.scheduleCouple}>
                  {schedule.coupleName} · {formatMoney(schedule.amount)}
                </Text>
              </View>
            ))
          ) : (
            <Text className={styles.infoValue}>暂无档期</Text>
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />

      <View className={styles.actionBar + ' safe-area-bottom'}>
        <View className={[styles.btn, styles.btnSecondary].join(' ')} onClick={handleEdit}>
          编辑信息
        </View>
        <View className={[styles.btn, styles.btnSecondary].join(' ')} onClick={handleToggleStatus}>
          {team.status === 'active' ? '暂停合作' : '恢复合作'}
        </View>
        <View className={[styles.btn, styles.btnPrimary].join(' ')} onClick={handleAddSchedule}>
          新增档期
        </View>
      </View>
    </ScrollView>
  );
};

export default TeamDetailPage;
