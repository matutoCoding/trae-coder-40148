import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Team } from '@/types';
import styles from './index.module.scss';

interface TeamCardProps {
  team: Team;
  onClick?: () => void;
  showStats?: boolean;
  scheduleCount?: number;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, onClick, showStats = false, scheduleCount = 0 }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/team-detail/index?id=${team.id}` });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.avatar}>
          <Text className={styles.avatarText}>{team.name.charAt(0)}</Text>
        </View>
        <View className={styles.info}>
          <Text className={styles.name}>{team.name}</Text>
          <Text className={styles.leader}>负责人：{team.leader}</Text>
        </View>
        <View
          className={[styles.statusTag, team.status === 'active' ? styles.active : styles.inactive].join(' ')}
        >
          <Text className={styles.statusText}>
            {team.status === 'active' ? '合作中' : '已暂停'}
          </Text>
        </View>
      </View>

      <View className={styles.stats}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{team.commissionRate}%</Text>
          <Text className={styles.statLabel}>分成比例</Text>
        </View>
        {showStats && (
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{scheduleCount}</Text>
            <Text className={styles.statLabel}>本月档期</Text>
          </View>
        )}
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{team.phone}</Text>
          <Text className={styles.statLabel}>联系电话</Text>
        </View>
      </View>

      {team.description && (
        <View className={styles.description}>
          <Text className={styles.descText}>{team.description}</Text>
        </View>
      )}
    </View>
  );
};

export default TeamCard;
