import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { mockDiscrepancies, mockTransactions, mockExecutionPlans } from '@/data/transaction';
import { Discrepancy, Transaction, ExecutionPlan } from '@/types';
import { formatMoney } from '@/utils/date';
import styles from './index.module.scss';

const DiscrepancyDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id;
  const [discrepancy, setDiscrepancy] = useState<Discrepancy | null>(null);
  const [platformTx, setPlatformTx] = useState<Transaction | null>(null);
  const [teamTx, setTeamTx] = useState<Transaction | null>(null);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);

  useEffect(() => {
    const found = mockDiscrepancies.find(d => d.id === id);
    if (found) {
      setDiscrepancy(found);
      const pTx = mockTransactions.find(t => t.id === found.platformTransactionId);
      if (pTx) setPlatformTx(pTx);
      if (found.teamTransactionId) {
        const tTx = mockTransactions.find(t => t.id === found.teamTransactionId);
        if (tTx) setTeamTx(tTx);
      }
      const relatedPlan = mockExecutionPlans.find(p => p.discrepancyId === found.id);
      if (relatedPlan) setPlan(relatedPlan);
    }
    console.log('[DiscrepancyDetail] 差异详情:', id);
  }, [id]);

  const typeMap = {
    amount: { text: '金额差异', icon: '¥' },
    time: { text: '时间差异', icon: '⏰' },
    missing_platform: { text: '平台缺失', icon: '⚠' },
    missing_team: { text: '团队缺失', icon: '⚠' }
  };

  const statusMap = {
    pending: { text: '待处理', className: styles.pending, icon: '○' },
    resolved: { text: '已处理', className: styles.resolved, icon: '✓' },
    approved: { text: '已审批', className: styles.approved, icon: '✓' }
  };

  const handleResolve = () => {
    Taro.showActionSheet({
      itemList: ['标记为已解决', '创建执行方案', '联系团队核实'],
      success: (res) => {
        if (res.tapIndex === 0) {
          Taro.showModal({
            title: '确认解决',
            content: '确定将此差异标记为已解决吗？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                Taro.showToast({ title: '已标记为解决', icon: 'success' });
              }
            }
          });
        } else if (res.tapIndex === 1) {
          Taro.showToast({ title: '创建执行方案', icon: 'none' });
        } else {
          Taro.showToast({ title: '联系团队核实', icon: 'none' });
        }
      }
    });
  };

  const handleViewPlan = () => {
    Taro.navigateTo({ url: '/pages/approval/index' });
  };

  const handleViewTransaction = (txId: string) => {
    Taro.navigateTo({ url: `/pages/transaction-detail/index?id=${txId}` });
  };

  if (!discrepancy) {
    return (
      <View className={styles.page}>
        <Text>加载中...</Text>
      </View>
    );
  }

  const type = typeMap[discrepancy.type];
  const status = statusMap[discrepancy.status];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.diffAmount}>{discrepancy.diffAmount > 0 ? formatMoney(discrepancy.diffAmount) : '无金额差'}</Text>
        <View className={styles.typeBadge}>
          <Text className={styles.typeText}>{type.icon} {type.text}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>差异信息</Text>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>差异编号</Text>
          <Text className={styles.infoValue}>{discrepancy.id}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>差异描述</Text>
          <Text className={styles.infoValue}>{discrepancy.description}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>发生日期</Text>
          <Text className={styles.infoValue}>{discrepancy.date}</Text>
        </View>
        <View className={styles.infoRow}>
          <Text className={styles.infoLabel}>发现时间</Text>
          <Text className={styles.infoValue}>{discrepancy.createdAt}</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>双向对账对比</Text>
        <View className={styles.compareSection}>
          <View className={styles.compareRow}>
            <View className={styles.compareItem}>
              <Text className={styles.compareLabel}>平台流水</Text>
              <Text className={[styles.compareValue, styles.platformValue].join(' ')}>
                {platformTx ? formatMoney(discrepancy.platformAmount) : '—'}
              </Text>
            </View>
            <View className={styles.vsIcon}>VS</View>
            <View className={styles.compareItem}>
              <Text className={styles.compareLabel}>团队流水</Text>
              <Text className={[styles.compareValue, styles.teamValue].join(' ')}>
                {teamTx ? formatMoney(discrepancy.teamAmount || 0) : '—'}
              </Text>
            </View>
          </View>

          {discrepancy.type === 'time' && platformTx && teamTx && (
            <View className={styles.compareRow}>
              <View className={styles.compareItem}>
                <Text className={styles.compareLabel}>平台日期</Text>
                <Text className={styles.compareValue}>{platformTx.date}</Text>
              </View>
              <View className={styles.vsIcon}>VS</View>
              <View className={styles.compareItem}>
                <Text className={styles.compareLabel}>团队日期</Text>
                <Text className={styles.compareValue}>{teamTx.date}</Text>
              </View>
            </View>
          )}
        </View>

        {platformTx && (
          <View className={styles.infoRow} onClick={() => handleViewTransaction(platformTx.id)}>
            <Text className={styles.infoLabel}>平台流水号</Text>
            <Text className={styles.infoValue} style={{ color: '#D4383C' }}>{platformTx.orderNo} →</Text>
          </View>
        )}
        {teamTx && (
          <View className={styles.infoRow} onClick={() => handleViewTransaction(teamTx.id)}>
            <Text className={styles.infoLabel}>团队流水号</Text>
            <Text className={styles.infoValue} style={{ color: '#165DFF' }}>{teamTx.orderNo} →</Text>
          </View>
        )}
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>处理状态</Text>
        <View className={styles.statusSection}>
          <View className={styles.statusBadgeRow}>
            <View className={[styles.statusIcon, status.className].join(' ')}>
              <Text>{status.icon}</Text>
            </View>
            <Text className={styles.statusText}>{status.text}</Text>
          </View>

          {discrepancy.status === 'pending' && (
            <Text className={styles.handleInfo}>
              请尽快核实差异原因，确认处理方案
            </Text>
          )}

          {discrepancy.handler && (
            <View className={styles.handleInfo}>
              <Text>处理人：{discrepancy.handler}</Text>
            </View>
          )}
          {discrepancy.handleTime && (
            <View className={styles.handleInfo}>
              <Text>处理时间：{discrepancy.handleTime}</Text>
            </View>
          )}
          {discrepancy.handleRemark && (
            <View className={styles.handleRemark}>
              <Text>处理意见：{discrepancy.handleRemark}</Text>
            </View>
          )}

          {discrepancy.approvalStatus && (
            <View className={styles.statusBadgeRow} style={{ marginTop: '16rpx' }}>
              <View className={[styles.statusIcon, discrepancy.approvalStatus === 'approved' ? styles.approved : styles.pending].join(' ')}>
                <Text>{discrepancy.approvalStatus === 'approved' ? '✓' : '○'}</Text>
              </View>
              <Text className={styles.statusText}>
                审批状态：{discrepancy.approvalStatus === 'approved' ? '已通过' : discrepancy.approvalStatus === 'rejected' ? '已拒绝' : '待审批'}
              </Text>
            </View>
          )}
        </View>

        {plan && (
          <View className={styles.planCard} onClick={handleViewPlan}>
            <Text className={styles.planTitle}>{plan.title}</Text>
            <Text className={styles.planDesc}>{plan.description}</Text>
            <View className={styles.planMeta}>
              <Text>提议人：{plan.proposer}</Text>
              <Text className={styles.planAmount}>
                {plan.type === 'refund' ? '退款' : plan.type === 'supplement' ? '补缴' : '调整'}：{formatMoney(plan.amount)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {discrepancy.status === 'pending' && (
        <View className={styles.actionBar}>
          <View className={[styles.actionBtn, styles.secondaryBtn].join(' ')} onClick={handleResolve}>
            标记已解决
          </View>
          <View className={[styles.actionBtn, styles.primaryBtn].join(' ')} onClick={handleResolve}>
            处理差异
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default DiscrepancyDetailPage;
