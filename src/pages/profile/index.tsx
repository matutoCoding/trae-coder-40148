import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { mockTeams, mockSchedules, mockDiscrepancies } from '@/data';
import styles from './index.module.scss';

const ProfilePage: React.FC = () => {
  useDidShow(() => {
    console.log('[ProfilePage] 页面显示');
  });

  const stats = {
    totalTeams: mockTeams.filter(t => t.status === 'active').length,
    totalSchedules: mockSchedules.filter(s => s.status !== 'cancelled').length,
    pendingDiscrepancies: mockDiscrepancies.filter(d => d.status === 'pending').length,
    pendingApprovals: 1
  };

  const menuItems = [
    [
      {
        icon: '📋',
        text: '档期管理',
        bgColor: 'linear-gradient(135deg, #D4383C 0%, #FF6B6E 100%)',
        path: '/pages/schedule/index'
      },
      {
        icon: '👥',
        text: '团队管理',
        bgColor: 'linear-gradient(135deg, #165DFF 0%, #4080FF 100%)',
        path: '/pages/team/index'
      },
      {
        icon: '💰',
        text: '对账中心',
        bgColor: 'linear-gradient(135deg, #00B42A 0%, #23C343 100%)',
        badge: stats.pendingDiscrepancies,
        path: '/pages/reconciliation/index'
      }
    ],
    [
      {
        icon: '📝',
        text: '审批中心',
        bgColor: 'linear-gradient(135deg, #7B61FF 0%, #9D8CFF 100%)',
        badge: stats.pendingApprovals,
        path: '/pages/approval/index'
      },
      {
        icon: '📊',
        text: '数据报表',
        bgColor: 'linear-gradient(135deg, #FF7D00 0%, #FF9A2E 100%)',
        path: ''
      },
      {
        icon: '⚙️',
        text: '系统设置',
        bgColor: 'linear-gradient(135deg, #4E5969 0%, #86909C 100%)',
        path: ''
      }
    ],
    [
      {
        icon: '❓',
        text: '帮助中心',
        bgColor: 'linear-gradient(135deg, #165DFF 0%, #4080FF 100%)',
        path: ''
      },
      {
        icon: 'ℹ️',
        text: '关于我们',
        bgColor: 'linear-gradient(135deg, #00B42A 0%, #23C343 100%)',
        path: ''
      }
    ]
  ];

  const handleMenuItemClick = (path: string) => {
    if (path) {
      if (path.startsWith('/pages/schedule') ||
          path.startsWith('/pages/team') ||
          path.startsWith('/pages/reconciliation')) {
        Taro.switchTab({ url: path });
      } else {
        Taro.navigateTo({ url: path });
      }
    } else {
      Taro.showToast({ title: '功能开发中', icon: 'none' });
    }
  };

  const menuTitles = ['常用功能', '业务管理', '其他'];

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>
            <Text className={styles.avatarText}>管</Text>
          </View>
          <View className={styles.userDetail}>
            <Text className={styles.userName}>管理员</Text>
            <Text className={styles.userRole}>婚庆档期管理平台</Text>
          </View>
        </View>

        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.totalTeams}</Text>
            <Text className={styles.statLabel}>合作团队</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.totalSchedules}</Text>
            <Text className={styles.statLabel}>在档档期</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.pendingDiscrepancies}</Text>
            <Text className={styles.statLabel}>待处理差异</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statNumber}>{stats.pendingApprovals}</Text>
            <Text className={styles.statLabel}>待审批</Text>
          </View>
        </View>
      </View>

      {menuItems.map((group, groupIndex) => (
        <View className={styles.menuSection} key={groupIndex}>
          <Text className={styles.menuTitle}>{menuTitles[groupIndex]}</Text>
          {group.map((item, index) => (
            <View
              className={styles.menuItem}
              key={index}
              onClick={() => handleMenuItemClick(item.path)}
            >
              <View className={styles.iconWrapper}>
                <View
                  className={styles.menuIcon}
                  style={{ background: item.bgColor }}
                >
                  <Text>{item.icon}</Text>
                </View>
                {item.badge && item.badge > 0 && (
                  <View className={styles.badge}>
                    <Text>{item.badge > 99 ? '99+' : item.badge}</Text>
                  </View>
                )}
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuText}>{item.text}</Text>
              </View>
              <Text className={styles.menuArrow}>›</Text>
            </View>
          ))}
        </View>
      ))}

      <View className={styles.bottomTip}>
        <Text className={styles.tipText}>婚庆档期管理系统 v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

export default ProfilePage;
