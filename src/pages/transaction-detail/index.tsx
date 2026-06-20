import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { useAppStore } from '@/store';
import { Transaction } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

const TransactionDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id;

  const transactions = useAppStore(state => state.transactions);
  const discrepancies = useAppStore(state => state.discrepancies);

  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const refreshData = () => {
    const found = transactions.find(t => t.id === id);
    if (found) {
      setTransaction(found);
    }
  };

  useEffect(() => {
    refreshData();
  }, [id, transactions]);

  useDidShow(() => {
    refreshData();
  });

  const relatedDiscrepancy = useMemo(() => {
    if (!transaction) return null;
    return discrepancies.find(d =>
      d.platformTransactionId === transaction.id ||
      d.teamTransactionId === transaction.id
    );
  }, [discrepancies, transaction]);

  const handleViewDiscrepancy = () => {
    if (relatedDiscrepancy) {
      Taro.navigateTo({ url: `/pages/discrepancy-detail/index?id=${relatedDiscrepancy.id}` });
    } else {
      Taro.navigateTo({ url: '/pages/discrepancy-detail/index?id=disc001' });
    }
  };

  const handleReconcile = () => {
    Taro.showToast({ title: '对账操作', icon: 'none' });
  };

  if (!transaction) {
    return (
      <View className={styles.page}>
        <Text>加载中...</Text>
      </View>
    );
  }

  const reconcileMap = {
    matched: { text: '已对账', icon: '✓', className: styles.matched },
    discrepancy: { text: '有差异', icon: '!', className: styles.discrepancy },
    pending: { text: '待对账', icon: '○', className: styles.pending }
  };

  const reconcile = reconcileMap[transaction.reconcileStatus];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.amount}>{formatMoney(transaction.amount)}</Text>
        <View className={styles.statusBadge}>
          <Text className={styles.statusText}>
            {transaction.type === 'platform' ? '平台流水' : '团队流水'}
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>基本信息</Text>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>订单编号</Text>
          <Text className={styles.infoValue}>{transaction.orderNo}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>交易日期</Text>
          <Text className={styles.infoValue}>{transaction.date}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>交易状态</Text>
          <Text className={styles.infoValue}>
            {transaction.status === 'completed' ? '已完成' : '处理中'}
          </Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>关联信息</Text>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>新人</Text>
          <Text className={styles.infoValue}>{transaction.coupleName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>策划团队</Text>
          <Text className={styles.infoValue}>{transaction.teamName}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>费用说明</Text>
          <Text className={styles.infoValue}>{transaction.description}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>对账信息</Text>
        <View className={styles.reconcileSection}>
          <View className={styles.reconcileStatus}>
            <View className={[styles.reconcileIcon, reconcile.className].join(' ')}>
              <Text>{reconcile.icon}</Text>
            </View>
            <Text
              className={styles.reconcileText}
              style={{ color: transaction.reconcileStatus === 'matched' ? '#00B42A' :
                              transaction.reconcileStatus === 'discrepancy' ? '#F53F3F' : '#FF7D00' }}
            >
              {reconcile.text}
            </Text>
          </View>
          {transaction.discrepancyReason && (
            <Text className={styles.reconcileDesc}>
              差异原因：{transaction.discrepancyReason}
            </Text>
          )}
          {transaction.counterpartId && (
            <Text className={styles.reconcileDesc}>
              对应{transaction.type === 'platform' ? '团队' : '平台'}流水：{transaction.counterpartId}
            </Text>
          )}
        </View>

        {transaction.reconcileStatus === 'discrepancy' && (
          <View className={styles.actionBtn} onClick={handleViewDiscrepancy}>
            查看差异详情
          </View>
        )}

        {transaction.reconcileStatus === 'pending' && (
          <View className={styles.actionBtn} onClick={handleReconcile}>
            立即对账
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default TransactionDetailPage;
