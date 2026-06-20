import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import DiscrepancyCard from '@/components/DiscrepancyCard';
import TransactionCard from '@/components/TransactionCard';
import { useAppStore } from '@/store';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

type TabType = 'discrepancy' | 'platform' | 'team';

const ReconciliationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('discrepancy');

  const transactions = useAppStore(state => state.transactions);
  const discrepancies = useAppStore(state => state.discrepancies);
  const runReconciliation = useAppStore(state => state.runReconciliation);

  useDidShow(() => {
    console.log('[ReconciliationPage] 页面显示');
  });

  const stats = useMemo(() => {
    const matched = transactions.filter(t => t.reconcileStatus === 'matched').length;
    const pendingDiscrepancies = discrepancies.filter(d => d.status === 'pending').length;
    const pending = transactions.filter(t => t.reconcileStatus === 'pending').length;
    const totalAmount = transactions
      .filter(t => t.type === 'platform')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      matched,
      discrepancy: pendingDiscrepancies,
      pending,
      totalAmount
    };
  }, [transactions, discrepancies]);

  const pendingDiscrepancies = useMemo(() => {
    return discrepancies.filter(d => d.status === 'pending');
  }, [discrepancies]);

  const platformTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'platform').slice(0, 5);
  }, [transactions]);

  const teamTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'team').slice(0, 5);
  }, [transactions]);

  const handleViewAllDiscrepancies = () => {
    console.log('[ReconciliationPage] 查看全部差异');
  };

  const handleStartReconcile = () => {
    Taro.showLoading({ title: '对账中...' });
    setTimeout(() => {
      runReconciliation();
      Taro.hideLoading();
      const newCount = discrepancies.filter(d => d.status === 'pending').length;
      Taro.showToast({
        title: `对账完成，发现${newCount}条差异`,
        icon: 'none',
        duration: 2000
      });
    }, 1200);
  };

  const handleExportReport = () => {
    Taro.showToast({ title: '报表生成中...', icon: 'none' });
  };

  const handleViewApproval = () => {
    Taro.navigateTo({ url: '/pages/approval/index' });
  };

  const handleViewAllTransactions = (type: 'platform' | 'team') => {
    console.log('[ReconciliationPage] 查看全部流水:', type);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>对账中心</Text>
        <Text className={styles.subtitle}>平台与团队双向对账，差异自动识别</Text>
      </View>

      <View className={styles.summaryCard}>
        <Text className={styles.summaryTitle}>本月平台流水总额</Text>
        <Text className={styles.summaryAmount}>{formatMoney(stats.totalAmount)}</Text>
        <View className={styles.summaryInfo}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryItemValue}>{stats.matched}</Text>
            <Text className={styles.summaryItemLabel}>已对账</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryItemValue}>{stats.discrepancy}</Text>
            <Text className={styles.summaryItemLabel}>待处理</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryItemValue}>{stats.pending}</Text>
            <Text className={styles.summaryItemLabel}>待对账</Text>
          </View>
        </View>
      </View>

      <View className={styles.tabs}>
        <View
          className={[styles.tab, activeTab === 'discrepancy' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('discrepancy')}
        >
          差异项 ({stats.discrepancy})
        </View>
        <View
          className={[styles.tab, activeTab === 'platform' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('platform')}
        >
          平台流水
        </View>
        <View
          className={[styles.tab, activeTab === 'team' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('team')}
        >
          团队流水
        </View>
      </View>

      {activeTab === 'discrepancy' && (
        <View className={styles.discrepancyList}>
          <View className={styles.listHeader}>
            <Text className={styles.listTitle}>待处理差异</Text>
            <Text className={styles.viewAll} onClick={handleViewAllDiscrepancies}>
              查看全部
            </Text>
          </View>
          {pendingDiscrepancies.length > 0 ? (
            pendingDiscrepancies.map(discrepancy => (
              <DiscrepancyCard key={discrepancy.id} discrepancy={discrepancy} />
            ))
          ) : (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>✅</Text>
              <Text className={styles.emptyText}>暂无待处理差异</Text>
            </View>
          )}
        </View>
      )}

      {activeTab === 'platform' && (
        <View>
          <View className={styles.listHeader}>
            <Text className={styles.listTitle}>平台流水记录</Text>
            <Text className={styles.viewAll} onClick={() => handleViewAllTransactions('platform')}>
              查看全部
            </Text>
          </View>
          {platformTransactions.map(transaction => (
            <TransactionCard key={transaction.id} transaction={transaction} showType />
          ))}
        </View>
      )}

      {activeTab === 'team' && (
        <View>
          <View className={styles.listHeader}>
            <Text className={styles.listTitle}>团队流水记录</Text>
            <Text className={styles.viewAll} onClick={() => handleViewAllTransactions('team')}>
              查看全部
            </Text>
          </View>
          {teamTransactions.map(transaction => (
            <TransactionCard key={transaction.id} transaction={transaction} showType />
          ))}
        </View>
      )}

      <View className={styles.quickActions}>
        <View className={styles.actionCard} onClick={handleStartReconcile}>
          <View
            className={styles.actionIcon}
            style={{ background: 'linear-gradient(135deg, #00B42A 0%, #23C343 100%)' }}
          >
            <Text className={styles.actionIconText}>🔄</Text>
          </View>
          <Text className={styles.actionText}>开始对账</Text>
        </View>
        <View className={styles.actionCard} onClick={handleExportReport}>
          <View
            className={styles.actionIcon}
            style={{ background: 'linear-gradient(135deg, #165DFF 0%, #4080FF 100%)' }}
          >
            <Text className={styles.actionIconText}>📊</Text>
          </View>
          <Text className={styles.actionText}>导出报表</Text>
        </View>
        <View className={styles.actionCard} onClick={handleViewApproval}>
          <View
            className={styles.actionIcon}
            style={{ background: 'linear-gradient(135deg, #7B61FF 0%, #9D8CFF 100%)' }}
          >
            <Text className={styles.actionIconText}>📝</Text>
          </View>
          <Text className={styles.actionText}>审批中心</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ReconciliationPage;
