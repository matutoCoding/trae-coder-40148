import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useAppStore } from '@/store';
import { ExecutionPlan, Discrepancy } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

type TabType = 'pending' | 'approved' | 'rejected';

const ApprovalPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  const executionPlans = useAppStore(state => state.executionPlans);
  const discrepancies = useAppStore(state => state.discrepancies);
  const approvePlan = useAppStore(state => state.approvePlan);
  const rejectPlan = useAppStore(state => state.rejectPlan);
  const currentUser = useAppStore(state => state.currentUser);

  const stats = useMemo(() => {
    const pending = executionPlans.filter(p => p.status === 'pending').length;
    const approved = executionPlans.filter(p => p.status === 'approved').length;
    const rejected = executionPlans.filter(p => p.status === 'rejected').length;
    const totalAmount = executionPlans
      .filter(p => p.status !== 'rejected')
      .reduce((sum, p) => sum + p.amount, 0);
    return { pending, approved, rejected, totalAmount };
  }, [executionPlans]);

  const filteredPlans = useMemo(() => {
    return executionPlans.filter(p => p.status === activeTab);
  }, [executionPlans, activeTab]);

  const getDiscrepancy = (discrepancyId: string): Discrepancy | undefined => {
    return discrepancies.find(d => d.id === discrepancyId);
  };

  const typeMap = {
    refund: '退款方案',
    supplement: '补缴方案',
    adjust: '调整方案'
  };

  const statusMap = {
    pending: { text: '待审批', className: styles.statusPending },
    approved: { text: '已通过', className: styles.statusApproved },
    rejected: { text: '已拒绝', className: styles.statusRejected }
  };

  const handleApprove = (planId: string) => {
    Taro.showModal({
      title: '确认审批',
      editable: true,
      placeholderText: '请输入审批意见（选填）',
      content: '',
      confirmText: '同意',
      confirmColor: '#D4383C',
      success: (res) => {
        if (res.confirm) {
          approvePlan(planId, currentUser.name, res.content || '同意此方案');
          Taro.showToast({ title: '审批通过', icon: 'success' });
        }
      }
    });
  };

  const handleReject = (planId: string) => {
    Taro.showModal({
      title: '拒绝方案',
      editable: true,
      placeholderText: '请输入拒绝原因',
      content: '',
      confirmText: '拒绝',
      confirmColor: '#F53F3F',
      success: (res) => {
        if (res.confirm) {
          rejectPlan(planId, currentUser.name, res.content || '方案不合理，请重新制定');
          Taro.showToast({ title: '已拒绝', icon: 'none' });
        }
      }
    });
  };

  const handleViewDetail = (plan: ExecutionPlan) => {
    Taro.navigateTo({ url: `/pages/discrepancy-detail/index?id=${plan.discrepancyId}` });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.title}>审批中心</Text>
        <Text className={styles.subtitle}>执行方案审批，差异处理结果确认</Text>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.pending}</Text>
            <Text className={styles.statLabel}>待审批</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.approved}</Text>
            <Text className={styles.statLabel}>已通过</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{formatMoney(stats.totalAmount)}</Text>
            <Text className={styles.statLabel}>涉及金额</Text>
          </View>
        </View>
      </View>

      <View className={styles.tabs}>
        <View
          className={[styles.tab, activeTab === 'pending' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('pending')}
        >
          待审批 ({stats.pending})
        </View>
        <View
          className={[styles.tab, activeTab === 'approved' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('approved')}
        >
          已通过 ({stats.approved})
        </View>
        <View
          className={[styles.tab, activeTab === 'rejected' && styles.activeTab].join(' ')}
          onClick={() => setActiveTab('rejected')}
        >
          已拒绝 ({stats.rejected})
        </View>
      </View>

      {filteredPlans.length > 0 ? (
        filteredPlans.map(plan => {
          const discrepancy = getDiscrepancy(plan.discrepancyId);
          const status = statusMap[plan.status];
          return (
            <View key={plan.id} className={styles.planCard}>
              <View className={styles.planHeader}>
                <Text className={styles.planTitle} numberOfLines={1}>{plan.title}</Text>
                <View className={[styles.statusBadge, status.className].join(' ')}>
                  {status.text}
                </View>
              </View>

              <View style={{ marginBottom: '16rpx' }}>
                <Text className={styles.planType}>{typeMap[plan.type]}</Text>
                {discrepancy && (
                  <Text className={styles.planType} style={{ background: 'rgba(245,63,63,0.1)', color: '#F53F3F' }}>
                    {discrepancy.type === 'amount' ? '金额差异' :
                     discrepancy.type === 'time' ? '时间差异' :
                     discrepancy.type === 'missing_platform' ? '平台缺失' : '团队缺失'}
                  </Text>
                )}
              </View>

              <Text className={styles.planDesc}>{plan.description}</Text>

              <View className={styles.planMeta}>
                <View className={styles.planInfo}>
                  <Text className={styles.proposer}>提议人：{plan.proposer}</Text>
                  <Text className={styles.planDate}>提交时间：{plan.createdAt}</Text>
                </View>
                <Text className={styles.planAmount}>{formatMoney(plan.amount)}</Text>
              </View>

              {plan.status === 'pending' && (
                <View className={styles.actionRow}>
                  <View className={[styles.actionBtn, styles.rejectBtn].join(' ')} onClick={() => handleReject(plan.id)}>
                    拒绝
                  </View>
                  <View className={[styles.actionBtn, styles.approveBtn].join(' ')} onClick={() => handleApprove(plan.id)}>
                    同意
                  </View>
                </View>
              )}

              {plan.status !== 'pending' && plan.approver && (
                <View className={styles.approvalInfo}>
                  <Text className={styles.approver}>审批人：{plan.approver}</Text>
                  <Text className={styles.approvalTime}>审批时间：{plan.approvalTime}</Text>
                  {plan.approvalRemark && (
                    <View className={styles.approvalRemark}>
                      <Text>审批意见：{plan.approvalRemark}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={{ marginTop: '16rpx' }} onClick={() => handleViewDetail(plan)}>
                <Text style={{ fontSize: '24rpx', color: '#D4383C' }}>查看关联差异 →</Text>
              </View>
            </View>
          );
        })
      ) : (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📋</Text>
          <Text className={styles.emptyText}>
            {activeTab === 'pending' ? '暂无待审批方案' :
             activeTab === 'approved' ? '暂无已通过方案' : '暂无已拒绝方案'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ApprovalPage;
