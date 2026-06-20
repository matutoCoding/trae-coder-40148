import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import DiscrepancyCard from '@/components/DiscrepancyCard';
import TransactionCard from '@/components/TransactionCard';
import { useAppStore } from '@/store';
import { formatMoney } from '@/utils/date';
import { Discrepancy } from '@/types';
import styles from './index.module.scss';

type TabType = 'discrepancy' | 'platform' | 'team';

const ReconciliationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('discrepancy');

  const transactions = useAppStore(state => state.transactions);
  const discrepancies = useAppStore(state => state.discrepancies);
  const executionPlans = useAppStore(state => state.executionPlans);
  const teams = useAppStore(state => state.teams);
  const runReconciliation = useAppStore(state => state.runReconciliation);
  const lastReconciliation = useAppStore(state => state.lastReconciliation);
  const reconcileFilters = useAppStore(state => state.reconcileFilters);
  const setReconcileFilters = useAppStore(state => state.setReconcileFilters);

  useDidShow(() => {
    console.log('[ReconciliationPage] 页面显示');
  });

  const filteredDiscrepancies = useMemo(() => {
    let list = discrepancies;

    if (reconcileFilters.month) {
      list = list.filter(d => d.date.startsWith(reconcileFilters.month!));
    }
    if (reconcileFilters.teamId) {
      const teamTx = transactions.find(t =>
        (t.id === list[0]?.platformTransactionId || t.id === list[0]?.teamTransactionId)
      );
      if (teamTx) {
        list = list.filter(d => {
          const pTx = transactions.find(t => t.id === d.platformTransactionId);
          const tTx = d.teamTransactionId ? transactions.find(t => t.id === d.teamTransactionId) : null;
          return (pTx && pTx.teamId === reconcileFilters.teamId) ||
                 (tTx && tTx.teamId === reconcileFilters.teamId);
        });
      }
    }
    if (reconcileFilters.type) {
      list = list.filter(d => d.type === reconcileFilters.type);
    }

    return list;
  }, [discrepancies, reconcileFilters, transactions]);

  const stats = useMemo(() => {
    const matched = transactions.filter(t => t.reconcileStatus === 'matched').length;
    const pendingDiscrepancies = discrepancies.filter(d => d.status === 'pending').length;
    const processingDiscrepancies = discrepancies.filter(d => d.status === 'processing').length;
    const pending = transactions.filter(t => t.reconcileStatus === 'pending').length;
    const totalAmount = transactions
      .filter(t => t.type === 'platform')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      matched,
      discrepancy: pendingDiscrepancies + processingDiscrepancies,
      pendingProcessing: processingDiscrepancies,
      pending,
      totalAmount
    };
  }, [transactions, discrepancies, executionPlans]);

  const pendingDiscrepancies = useMemo(() => {
    return filteredDiscrepancies.filter(d => d.status === 'pending' || d.status === 'processing');
  }, [filteredDiscrepancies]);

  const platformTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'platform').slice(0, 5);
  }, [transactions]);

  const teamTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'team').slice(0, 5);
  }, [transactions]);

  const months = ['2026-06', '2026-05', '2026-04'];
  const discrepancyTypes: { value: Discrepancy['type'] | ''; label: string }[] = [
    { value: '', label: '全部类型' },
    { value: 'amount', label: '金额差异' },
    { value: 'time', label: '时间差异' },
    { value: 'missing_platform', label: '平台缺失' },
    { value: 'missing_team', label: '团队缺失' }
  ];

  const handleViewAllDiscrepancies = () => {
    console.log('[ReconciliationPage] 查看全部差异');
  };

  const handleStartReconcile = () => {
    Taro.showLoading({ title: '对账中...' });
    setTimeout(() => {
      const summary = runReconciliation();
      Taro.hideLoading();
      Taro.showToast({
        title: `对账完成，新增${summary.newDiscrepancies}条差异`,
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

      <View className={styles.filterSection}>
        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>对账月份</Text>
          <View className={styles.filterChips}>
            <View
              className={[styles.chip, !reconcileFilters.month && styles.activeChip].join(' ')}
              onClick={() => setReconcileFilters({ month: undefined })}
            >
              全部
            </View>
            {months.map(m => (
              <View
                key={m}
                className={[styles.chip, reconcileFilters.month === m && styles.activeChip].join(' ')}
                onClick={() => setReconcileFilters({ month: m })}
              >
                {m}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>策划团队</Text>
          <View className={styles.filterChips}>
            <View
              className={[styles.chip, !reconcileFilters.teamId && styles.activeChip].join(' ')}
              onClick={() => setReconcileFilters({ teamId: undefined })}
            >
              全部团队
            </View>
            {teams.slice(0, 4).map(team => (
              <View
                key={team.id}
                className={[styles.chip, reconcileFilters.teamId === team.id && styles.activeChip].join(' ')}
                onClick={() => setReconcileFilters({ teamId: team.id })}
              >
                {team.name}
              </View>
            ))}
          </View>
        </View>

        <View className={styles.filterRow}>
          <Text className={styles.filterLabel}>差异类型</Text>
          <View className={styles.filterChips}>
            {discrepancyTypes.map(t => (
              <View
                key={t.value || 'all'}
                className={[styles.chip, reconcileFilters.type === t.value && styles.activeChip].join(' ')}
                onClick={() => setReconcileFilters({ type: (t.value as any) || undefined })}
              >
                {t.label}
              </View>
            ))}
          </View>
        </View>
      </View>

      {lastReconciliation && (
        <View className={styles.reconcileResult}>
          <View className={styles.resultHeader}>
            <View className={styles.resultIcon}>✓</View>
            <Text className={styles.resultTitle}>对账完成汇总</Text>
            <Text className={styles.resultTime}>{lastReconciliation.runAt}</Text>
          </View>
          <View className={styles.resultStats}>
            <View className={styles.resultStatItem}>
              <Text className={[styles.resultStatValue, styles.newValue].join(' ')}>
                {lastReconciliation.newDiscrepancies}
              </Text>
              <Text className={styles.resultStatLabel}>本次新增差异</Text>
            </View>
            <View className={styles.resultStatItem}>
              <Text className={[styles.resultStatValue, styles.resolvedValue].join(' ')}>
                {lastReconciliation.resolvedDiscrepancies}
              </Text>
              <Text className={styles.resultStatLabel}>累计已处理</Text>
            </View>
            <View className={styles.resultStatItem}>
              <Text className={[styles.resultStatValue, styles.planValue].join(' ')}>
                {lastReconciliation.pendingPlans}
              </Text>
              <Text className={styles.resultStatLabel}>待审批方案</Text>
            </View>
          </View>
        </View>
      )}

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
            <Text className={styles.listTitle}>
              待处理差异
              {reconcileFilters.month || reconcileFilters.teamId || reconcileFilters.type ? ' (已筛选)' : ''}
            </Text>
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
              <Text className={styles.emptyText}>
                {reconcileFilters.month || reconcileFilters.teamId || reconcileFilters.type
                  ? '当前筛选条件下暂无差异'
                  : '暂无待处理差异'
                }
              </Text>
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
