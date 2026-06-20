import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import TeamCard from '@/components/TeamCard';
import { mockTeams } from '@/data/team';
import { mockSchedules } from '@/data/schedule';
import { Team } from '@/types';
import styles from './index.module.scss';

type FilterType = 'all' | 'active' | 'inactive';

const TeamPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

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
      const teamSchedules = mockSchedules.filter(s => s.teamId === team.id && s.status !== 'cancelled');
      return sum + teamSchedules.length;
    }, 0);

    return {
      total: teams.length,
      active: activeTeams.length,
      totalSchedules: totalScheduleCount
    };
  }, [teams]);

  const getTeamScheduleCount = (teamId: string) => {
    return mockSchedules.filter(s => s.teamId === teamId && s.status !== 'cancelled').length;
  };

  const handleAddTeam = () => {
    console.log('[TeamPage] 新增团队');
    Taro.showToast({ title: '新建团队功能', icon: 'none' });
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
