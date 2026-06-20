import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import DiscrepancyCard from '@/components/DiscrepancyCard';
import TransactionCard from '@/components/TransactionCard';
import { useAppStore } from '@/store';
import { formatMoney } from '@/utils/date';
import { Discrepancy } from '@/types';
import styles from './index.module.scss';

type TabType = 'discrepancy' | 'platform' | 'team';
type DiscrepancyTabType = 'pending' | 'processing' | 'resolved';

const ReconciliationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('discrepancy');
  const [discrepancyTab, setDiscrepancyTab] = useState<DiscrepancyTabType>('pending');
  const [selectedDiscrepancyIds, setSelectedDiscrepancyIds] = useState<string[]>([]);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchPlanType, setBatchPlanType] = useState<'refund' | 'supplement' | 'adjust'>('supplement');
  const [batchPlanTitle, setBatchPlanTitle] = useState('');
  const [batchPlanDesc, setBatchPlanDesc] = useState('');
  const [batchPlanAmount, setBatchPlanAmount] = useState('');

  const transactions = useAppStore(state => state.transactions);
  const discrepancies = useAppStore(state => state.discrepancies);
  const executionPlans = useAppStore(state => state.executionPlans);
  const teams = useAppStore(state => state.teams);
  const runReconciliation = useAppStore(state => state.runReconciliation);
  const lastReconciliation = useAppStore(state => state.lastReconciliation);
  const reconcileFilters = useAppStore(state => state.reconcileFilters);
  const setReconcileFilters = useAppStore(state => state.setReconcileFilters);
  const batchCreateExecutionPlans = useAppStore(state => state.batchCreateExecutionPlans);

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
    const resolvedDiscrepancies = discrepancies.filter(d => d.status === 'resolved' || d.status === 'approved').length;
    const pending = transactions.filter(t => t.reconcileStatus === 'pending').length;
    const totalAmount = transactions
      .filter(t => t.type === 'platform')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      matched,
      pending: pendingDiscrepancies,
      processing: processingDiscrepancies,
      resolved: resolvedDiscrepancies,
      pendingReconcile: pending,
      totalAmount
    };
  }, [transactions, discrepancies, executionPlans]);

  const displayedDiscrepancies = useMemo(() => {
    let list = filteredDiscrepancies;

    if (discrepancyTab === 'pending') {
      list = list.filter(d => d.status === 'pending');
    } else if (discrepancyTab === 'processing') {
      list = list.filter(d => d.status === 'processing');
    } else {
      list = list.filter(d => d.status === 'resolved' || d.status === 'approved');
    }

    return list;
  }, [filteredDiscrepancies, discrepancyTab]);

  const newDiscrepancyList = useMemo(() => {
    if (!lastReconciliation?.newDiscrepancyIds) return [];
    return discrepancies.filter(d => lastReconciliation.newDiscrepancyIds!.includes(d.id));
  }, [discrepancies, lastReconciliation]);

  const selectedAmountDiscrepancies = useMemo(() => {
    return displayedDiscrepancies.filter(d =>
      d.type === 'amount' && selectedDiscrepancyIds.includes(d.id)
    );
  }, [displayedDiscrepancies, selectedDiscrepancyIds]);

  const canBatch = useMemo(() => {
    return discrepancyTab === 'pending' && selectedDiscrepancyIds.length > 0;
  }, [discrepancyTab, selectedDiscrepancyIds]);

  const filteredStats = useMemo(() => {
    const list = filteredDiscrepancies;
    return {
      total: list.length,
      pending: list.filter(d => d.status === 'pending').length,
      processing: list.filter(d => d.status === 'processing').length,
      resolved: list.filter(d => d.status === 'resolved' || d.status === 'approved').length
    };
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

  const handleDiscrepancyTabChange = (tab: DiscrepancyTabType) => {
    setDiscrepancyTab(tab);
    setSelectedDiscrepancyIds([]);
  };

  const handleToggleSelect = (id: string, type: string) => {
    if (type !== 'amount') {
      Taro.showToast({ title: '仅金额差异支持批量处理', icon: 'none' });
      return;
    }
    setSelectedDiscrepancyIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const amountDiscrepancies = displayedDiscrepancies.filter(d => d.type === 'amount');
    if (selectedDiscrepancyIds.length === amountDiscrepancies.length) {
      setSelectedDiscrepancyIds([]);
    } else {
      setSelectedDiscrepancyIds(amountDiscrepancies.map(d => d.id));
    }
  };

  const handleOpenBatchModal = () => {
    if (selectedDiscrepancyIds.length === 0) {
      Taro.showToast({ title: '请先选择差异项', icon: 'none' });
      return;
    }
    setBatchPlanTitle('批量补缴方案');
    setBatchPlanDesc('');
    setBatchModalVisible(true);
  };

  const handleCloseBatchModal = () => {
    setBatchModalVisible(false);
  };

  const handleSubmitBatchPlan = () => {
    if (!batchPlanTitle) {
      Taro.showToast({ title: '请输入方案标题', icon: 'none' });
      return;
    }
    const totalDiff = selectedAmountDiscrepancies.reduce((sum, d) => sum + d.diffAmount, 0);

    batchCreateExecutionPlans({
      discrepancyIds: selectedDiscrepancyIds,
      type: batchPlanType,
      title: batchPlanTitle,
      description: batchPlanDesc,
      amount: totalDiff
    });

    Taro.showToast({ title: `已批量创建${selectedDiscrepancyIds.length}个方案`, icon: 'success' });
    setBatchModalVisible(false);
    setSelectedDiscrepancyIds([]);
    setDiscrepancyTab('processing');
  };

  const getTypeTagClass = (type: string) => {
    switch (type) {
      case 'amount': return styles.tagAmount;
      case 'time': return styles.tagTime;
      default: return styles.tagMissing;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'amount': return '金额';
      case 'time': return '时间';
      case 'missing_platform': return '平台缺失';
      case 'missing_team': return '团队缺失';
      default: return type;
    }
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
            <Text className={styles.summaryItemValue}>{stats.pending + stats.processing}</Text>
            <Text className={styles.summaryItemLabel}>待处理</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryItemValue}>{stats.pendingReconcile}</Text>
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
            <Text className={styles.resultTitle}>本次对账结果</Text>
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

          {newDiscrepancyList.length > 0 && (
            <View className={styles.reconcileResultDetail}>
              <Text className={styles.resultDetailTitle}>
                新增差异明细 ({newDiscrepancyList.length}条)
              </Text>
              <View className={styles.resultList}>
                {newDiscrepancyList.map(d => (
                  <View key={d.id} className={styles.resultItem}>
                    <Text className={styles.resultItemDesc} numberOfLines={1}>
                      {d.description}
                    </Text>
                    <View className={[styles.resultItemTag, getTypeTagClass(d.type)].join(' ')}>
                      {getTypeLabel(d.type)}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      <View className={styles.tabs}>
        <View
          className={[styles.tab, activeTab === 'discrepancy' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('discrepancy')}
        >
          差异项 ({filteredStats.total})
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
        <>
          <View className={styles.subTabs}>
            <View
              className={[styles.subTab, discrepancyTab === 'pending' && styles.activeSubTab].join(' ')}
              onClick={() => handleDiscrepancyTabChange('pending')}
            >
              待处理 ({filteredStats.pending})
            </View>
            <View
              className={[styles.subTab, discrepancyTab === 'processing' && styles.activeSubTab].join(' ')}
              onClick={() => handleDiscrepancyTabChange('processing')}
            >
              待审批 ({filteredStats.processing})
            </View>
            <View
              className={[styles.subTab, discrepancyTab === 'resolved' && styles.activeSubTab].join(' ')}
              onClick={() => handleDiscrepancyTabChange('resolved')}
            >
              已处理 ({filteredStats.resolved})
            </View>
          </View>

          {discrepancyTab === 'pending' && (
            <View className={styles.batchBar}>
              <Text className={styles.batchInfo}>
                已选择 <Text className={styles.batchCount}>{selectedDiscrepancyIds.length}</Text> 条金额差异
              </Text>
              <View className={styles.batchActions}>
                <View className={[styles.batchBtn, styles.batchBtnSecondary].join(' ')} onClick={handleSelectAll}>
                  全选
                </View>
                <View
                  className={[styles.batchBtn, styles.batchBtnPrimary].join(' ')}
                  onClick={handleOpenBatchModal}
                >
                  批量生成方案
                </View>
              </View>
            </View>
          )}

          <View className={styles.discrepancyList}>
            <View className={styles.listHeader}>
              <Text className={styles.listTitle}>
                {discrepancyTab === 'pending' ? '待处理差异' :
                 discrepancyTab === 'processing' ? '待审批方案' : '已处理差异'}
                {reconcileFilters.month || reconcileFilters.teamId || reconcileFilters.type ? ' (已筛选)' : ''}
              </Text>
              <Text className={styles.viewAll} onClick={handleViewAllDiscrepancies}>
                查看全部
              </Text>
            </View>
            {displayedDiscrepancies.length > 0 ? (
              displayedDiscrepancies.map(discrepancy => (
                <View key={discrepancy.id} className={styles.discrepancyCardWrapper}>
                  {discrepancyTab === 'pending' && (
                    <View
                      className={[
                        styles.checkbox,
                        selectedDiscrepancyIds.includes(discrepancy.id) && styles.checked
                      ].join(' ')}
                      onClick={() => handleToggleSelect(discrepancy.id, discrepancy.type)}
                    >
                      {selectedDiscrepancyIds.includes(discrepancy.id) && '✓'}
                    </View>
                  )}
                  <DiscrepancyCard discrepancy={discrepancy} />
                </View>
              ))
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>✅</Text>
                <Text className={styles.emptyText}>
                  {reconcileFilters.month || reconcileFilters.teamId || reconcileFilters.type
                    ? '当前筛选条件下暂无差异'
                    : discrepancyTab === 'pending' ? '暂无待处理差异' :
                      discrepancyTab === 'processing' ? '暂无待审批方案' : '暂无已处理差异'
                  }
                </Text>
              </View>
            )}
          </View>
        </>
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

      {batchModalVisible && (
        <View className={styles.batchModal} onClick={handleCloseBatchModal}>
          <View className={styles.batchModalContent} onClick={e => e.stopPropagation()}>
            <View className={styles.closeBatchModal} onClick={handleCloseBatchModal}>×</View>
            <Text className={styles.batchModalTitle}>批量生成方案</Text>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>方案类型</Text>
              <View className={styles.typeOptions}>
                <View
                  className={[styles.typeOption, batchPlanType === 'supplement' && styles.typeOptionActive].join(' ')}
                  onClick={() => setBatchPlanType('supplement')}
                >
                  补缴
                </View>
                <View
                  className={[styles.typeOption, batchPlanType === 'refund' && styles.typeOptionActive].join(' ')}
                  onClick={() => setBatchPlanType('refund')}
                >
                  退款
                </View>
                <View
                  className={[styles.typeOption, batchPlanType === 'adjust' && styles.typeOptionActive].join(' ')}
                  onClick={() => setBatchPlanType('adjust')}
                >
                  调整
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>方案标题</Text>
              <Input
                className={styles.formInput}
                placeholder="请输入方案标题"
                value={batchPlanTitle}
                onInput={e => setBatchPlanTitle(e.detail.value)}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>
                已选 {selectedDiscrepancyIds.length} 条金额差异
              </Text>
              <Text className={styles.formLabel} style={{ marginTop: '8rpx', color: '#7B61FF' }}>
                方案金额按每条差异的差额自动分配
              </Text>
              <Text className={styles.formLabel} style={{ marginTop: '8rpx' }}>
                差额总计：{formatMoney(selectedAmountDiscrepancies.reduce((s, d) => s + d.diffAmount, 0))}
              </Text>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>明细（各差异对应方案金额）</Text>
              <View className={styles.resultList}>
                {selectedAmountDiscrepancies.map(d => (
                  <View key={d.id} className={styles.resultItem}>
                    <Text className={styles.resultItemDesc} numberOfLines={1}>
                      {d.description}
                    </Text>
                    <View className={[styles.resultItemTag, styles.tagAmount].join(' ')}>
                      {formatMoney(d.diffAmount)}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>方案说明</Text>
              <Textarea
                className={styles.formTextarea}
                placeholder="请输入方案说明（选填）"
                value={batchPlanDesc}
                onInput={e => setBatchPlanDesc(e.detail.value)}
              />
            </View>

            <View className={styles.modalActions}>
              <View
                className={[styles.modalBtn, styles.modalBtnSecondary].join(' ')}
                onClick={handleCloseBatchModal}
              >
                取消
              </View>
              <View
                className={[styles.modalBtn, styles.modalBtnPrimary].join(' ')}
                onClick={handleSubmitBatchPlan}
              >
                提交方案
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ReconciliationPage;
