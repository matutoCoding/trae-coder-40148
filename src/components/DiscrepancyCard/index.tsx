import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Discrepancy } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

interface DiscrepancyCardProps {
  discrepancy: Discrepancy;
  onClick?: () => void;
}

const DiscrepancyCard: React.FC<DiscrepancyCardProps> = ({ discrepancy, onClick }) => {
  const typeMap = {
    amount: { text: '金额差异', icon: '¥', color: '#F53F3F' },
    time: { text: '时间差异', icon: '⏰', color: '#FF7D00' },
    missing_platform: { text: '平台缺失', icon: '!', color: '#7B61FF' },
    missing_team: { text: '团队缺失', icon: '!', color: '#7B61FF' }
  };

  const statusMap = {
    pending: { text: '待处理', color: '#FF7D00', bg: 'rgba(255, 125, 0, 0.1)' },
    processing: { text: '处理中(待审批)', color: '#165DFF', bg: 'rgba(22, 93, 255, 0.1)' },
    resolved: { text: '已处理', color: '#00B42A', bg: 'rgba(0, 180, 42, 0.1)' },
    approved: { text: '已审批', color: '#165DFF', bg: 'rgba(22, 93, 255, 0.1)' }
  };

  const type = typeMap[discrepancy.type];
  const status = statusMap[discrepancy.status] || statusMap.pending;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/discrepancy-detail/index?id=${discrepancy.id}` });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.typeIcon} style={{ background: type.color }}>
          <Text className={styles.iconText}>{type.icon}</Text>
        </View>
        <View className={styles.typeInfo}>
          <Text className={styles.typeText}>{type.text}</Text>
          <Text className={styles.date}>{discrepancy.date}</Text>
        </View>
        <View className={styles.statusTag} style={{ color: status.color, background: status.bg }}>
          {status.text}
        </View>
      </View>

      <View className={styles.description}>
        <Text className={styles.descText}>{discrepancy.description}</Text>
      </View>

      <View className={styles.amountRow}>
        <View className={styles.amountItem}>
          <Text className={styles.amountLabel}>平台金额</Text>
          <Text className={styles.amountValue}>{formatMoney(discrepancy.platformAmount)}</Text>
        </View>
        <View className={styles.amountItem}>
          <Text className={styles.amountLabel}>团队金额</Text>
          <Text className={styles.amountValue}>{formatMoney(discrepancy.teamAmount || 0)}</Text>
        </View>
        <View className={styles.diffItem}>
          <Text className={styles.diffLabel}>差额</Text>
          <Text className={styles.diffValue}>{formatMoney(discrepancy.diffAmount)}</Text>
        </View>
      </View>

      {discrepancy.handler && (
        <View className={styles.handler}>
          <Text className={styles.handlerLabel}>处理人：</Text>
          <Text className={styles.handlerName}>{discrepancy.handler}</Text>
        </View>
      )}
    </View>
  );
};

export default DiscrepancyCard;
