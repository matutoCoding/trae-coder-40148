import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { Transaction } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
  showType?: boolean;
}

const TransactionCard: React.FC<TransactionCardProps> = ({ transaction, onClick, showType = false }) => {
  const reconcileMap = {
    matched: { text: '已对账', color: '#00B42A', icon: '✓' },
    discrepancy: { text: '有差异', color: '#F53F3F', icon: '!' },
    pending: { text: '待对账', color: '#FF7D00', icon: '○' }
  };

  const reconcile = reconcileMap[transaction.reconcileStatus];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({ url: `/pages/transaction-detail/index?id=${transaction.id}` });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.orderInfo}>
          <Text className={styles.orderNo}>{transaction.orderNo}</Text>
          <Text className={styles.date}>{transaction.date}</Text>
        </View>
        <View className={[styles.reconcileTag, styles[transaction.reconcileStatus]].join(' ')}>
          <Text className={styles.reconcileIcon}>{reconcile.icon}</Text>
          <Text className={styles.reconcileText}>{reconcile.text}</Text>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.row}>
          <Text className={styles.label}>新人</Text>
          <Text className={styles.value}>{transaction.coupleName}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>团队</Text>
          <Text className={styles.value}>{transaction.teamName}</Text>
        </View>
        <View className={styles.row}>
          <Text className={styles.label}>说明</Text>
          <Text className={styles.value}>{transaction.description}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        {showType && (
          <View className={styles.typeTag}>
            <Text className={styles.typeText}>
              {transaction.type === 'platform' ? '平台流水' : '团队流水'}
            </Text>
          </View>
        )}
        <View className={styles.amountWrapper}>
          <Text className={styles.amountLabel}>金额</Text>
          <Text className={styles.amount}>{formatMoney(transaction.amount)}</Text>
        </View>
      </View>
    </View>
  );
};

export default TransactionCard;
