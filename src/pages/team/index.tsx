import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import TeamCard from '@/components/TeamCard';
import { useAppStore } from '@/store';
import { Team } from '@/types';
import styles from './index.module.scss';

type FilterType = 'all' | 'active' | 'inactive';

const TeamPage: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const teams = useAppStore(state => state.teams);
  const schedules = useAppStore(state => state.schedules);
  const addTeam = useAppStore(state => state.addTeam);

  useDidShow(() => {
    console.log('[TeamPage] 页面显示');
  });

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      if (filterType === 'active' && team.status !== 'active') return false;
      if (filterType === 'inactive' && team.status !== 'inactive') return false;

      if (searchText) {
        const search = searchText.toLowerCase();
        return (
          team.name.toLowerCase().includes(search) ||
          team.leader.toLowerCase().includes(search) ||
          team.phone.includes(search)
        );
      }

      return true;
    });
  }, [teams, searchText, filterType]);

  const stats = useMemo(() => {
    const activeTeams = teams.filter(t => t.status === 'active');
    const totalScheduleCount = activeTeams.reduce((sum, team) => {
      const teamSchedules = schedules.filter(s => s.teamId === team.id && s.status !== 'cancelled');
      return sum + teamSchedules.length;
    }, 0);

    return {
      total: teams.length,
      active: activeTeams.length,
      totalSchedules: totalScheduleCount
    };
  }, [teams, schedules]);

  const getTeamScheduleCount = (teamId: string) => {
    return schedules.filter(s => s.teamId === teamId && s.status !== 'cancelled').length;
  };

  const handleAddTeam = () => {
    Taro.showModal({
      title: '新增策划团队',
      editable: true,
      placeholderText: '请输入团队名称',
      content: '',
      success: (nameRes) => {
        if (!nameRes.confirm || !nameRes.content) return;
        const name = nameRes.content.trim();
        if (!name) return;

        Taro.showModal({
          title: '负责人姓名',
          editable: true,
          placeholderText: '请输入负责人姓名',
          content: '',
          success: (leaderRes) => {
            if (!leaderRes.confirm || !leaderRes.content) return;
            const leader = leaderRes.content.trim();
            if (!leader) return;

            Taro.showModal({
              title: '联系电话',
              editable: true,
              placeholderText: '请输入联系电话',
              content: '',
              success: (phoneRes) => {
                if (!phoneRes.confirm || !phoneRes.content) return;
                const phone = phoneRes.content.trim();
                if (!phone) return;

                Taro.showModal({
                  title: '分成比例（%）',
                  editable: true,
                  placeholderText: '请输入分成比例，如 70',
                  content: '70',
                  success: (rateRes) => {
                    if (!rateRes.confirm) return;
                    const rate = parseInt(rateRes.content || '70');
                    if (isNaN(rate) || rate < 0 || rate > 100) {
                      Taro.showToast({ title: '分成比例需在0-100之间', icon: 'none' });
                      return;
                    }

                    addTeam({
                      name,
                      leader,
                      phone,
                      commissionRate: rate,
                      description: '婚庆策划服务团队',
                      status: 'active'
                    });

                    Taro.showToast({ title: '团队创建成功', icon: 'success' });
                  }
                });
              }
            });
          }
        });
      }
    });
  };

  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
  };

  const handleSearch = (e: any) => {
    setSearchText(e.detail.value);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>团队管理</Text>
        <Text className={styles.subtitle}>管理策划团队，设置分成比例</Text>
      </View>

      <View className={styles.searchBar}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Input
          className={styles.searchInput}
          placeholder="搜索团队名称、负责人..."
          value={searchText}
          onInput={handleSearch}
        />
      </View>

      <View className={styles.statsOverview}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.total}</Text>
          <Text className={styles.statLabel}>全部团队</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.active}</Text>
          <Text className={styles.statLabel}>合作中</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.totalSchedules}</Text>
          <Text className={styles.statLabel}>总档期数</Text>
        </View>
      </View>

      <View className={styles.filterBar}>
        <View
          className={[styles.filterTab, filterType === 'all' && styles.activeFilter].join(' ')}
          onClick={() => handleFilterChange('all')}
        >
          全部
        </View>
        <View
          className={[styles.filterTab, filterType === 'active' && styles.activeFilter].join(' ')}
          onClick={() => handleFilterChange('active')}
        >
          合作中
        </View>
        <View
          className={[styles.filterTab, filterType === 'inactive' && styles.activeFilter].join(' ')}
          onClick={() => handleFilterChange('inactive')}
        >
          已暂停
        </View>
      </View>

      <View className={styles.teamList}>
        {filteredTeams.length > 0 ? (
          filteredTeams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              showStats
              scheduleCount={getTeamScheduleCount(team.id)}
            />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>👥</Text>
            <Text className={styles.emptyText}>暂无符合条件的团队</Text>
            <View className={styles.emptyBtn} onClick={handleAddTeam}>
              + 新增团队
            </View>
          </View>
        )}
      </View>

      <View className={styles.addBtn} onClick={handleAddTeam}>
        <Text className={styles.addBtnIcon}>+</Text>
      </View>
    </ScrollView>
  );
};

export default TeamPage;
