import React, { useState } from 'react';
import { View, Text, Input, Switch, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useAppStore } from '@/store';
import styles from './index.module.scss';

const ScheduleCreatePage: React.FC = () => {
  const router = useRouter();
  const initialDate = router.params.date || '2026-06-22';
  const teams = useAppStore(state => state.teams);
  const addSchedule = useAppStore(state => state.addSchedule);

  const [formData, setFormData] = useState({
    groomName: '',
    brideName: '',
    phone: '',
    teamId: '',
    teamName: '请选择',
    date: initialDate,
    endDate: '',
    startTime: '09:00',
    endTime: '18:00',
    amount: '',
    deposit: '',
    isMultiDay: false,
    remark: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectTeam = () => {
    const teamNames = teams.filter(t => t.status === 'active').map(t => t.name);
    if (teamNames.length === 0) {
      Taro.showToast({ title: '暂无可选团队', icon: 'none' });
      return;
    }
    Taro.showActionSheet({
      itemList: teamNames,
      success: (res) => {
        const selected = teams.filter(t => t.status === 'active')[res.tapIndex];
        setFormData(prev => ({
          ...prev,
          teamId: selected.id,
          teamName: selected.name
        }));
      }
    });
  };

  const handleDateSelect = (field: 'date' | 'endDate') => {
    const current = formData[field] || formData.date;
    const parts = current.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);

    const pickerOptions: any = { year, month, day };
    if (field === 'endDate') {
      pickerOptions.minDate = new Date(formData.date);
    }

    Taro.showDatePicker?.({
      ...pickerOptions,
      success: (res: any) => {
        const selectedDate = `${res.year}-${String(res.month + 1).padStart(2, '0')}-${String(res.day).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, [field]: selectedDate }));
      },
      fail: () => {
        Taro.showToast({ title: '请直接编辑日期', icon: 'none' });
      }
    });

    if (typeof Taro.showDatePicker !== 'function') {
      Taro.showModal({
        title: '选择日期',
        editable: true,
        placeholderText: '格式: YYYY-MM-DD',
        content: current,
        success: (res) => {
          if (res.confirm && res.content) {
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (regex.test(res.content)) {
              setFormData(prev => ({ ...prev, [field]: res.content }));
            } else {
              Taro.showToast({ title: '日期格式错误', icon: 'none' });
            }
          }
        }
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.groomName || !formData.brideName) {
      Taro.showToast({ title: '请填写新人姓名', icon: 'none' });
      return;
    }
    if (!formData.teamId) {
      Taro.showToast({ title: '请选择策划团队', icon: 'none' });
      return;
    }
    if (!formData.amount) {
      Taro.showToast({ title: '请填写金额', icon: 'none' });
      return;
    }
    if (formData.isMultiDay && !formData.endDate) {
      Taro.showToast({ title: '请选择结束日期', icon: 'none' });
      return;
    }
    if (formData.isMultiDay && new Date(formData.endDate) <= new Date(formData.date)) {
      Taro.showToast({ title: '结束日期需晚于开始日期', icon: 'none' });
      return;
    }

    addSchedule({
      groomName: formData.groomName,
      brideName: formData.brideName,
      phone: formData.phone,
      teamId: formData.teamId,
      teamName: formData.teamName,
      date: formData.date,
      endDate: formData.isMultiDay ? formData.endDate : undefined,
      startTime: formData.startTime,
      endTime: formData.endTime,
      amount: parseFloat(formData.amount) || 0,
      deposit: parseFloat(formData.deposit) || 0,
      isMultiDay: formData.isMultiDay,
      remark: formData.remark
    });

    Taro.showToast({ title: '创建成功', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 1000);
  };

  const handleReset = () => {
    setFormData({
      groomName: '',
      brideName: '',
      phone: '',
      teamId: '',
      teamName: '请选择',
      date: initialDate,
      endDate: '',
      startTime: '09:00',
      endTime: '18:00',
      amount: '',
      deposit: '',
      isMultiDay: false,
      remark: ''
    });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>新人信息</Text>
        <View className={styles.formItem}>
          <Text className={styles.label}>新郎姓名</Text>
          <Input
            className={styles.input}
            placeholder="请输入新郎姓名"
            value={formData.groomName}
            onInput={(e) => handleInputChange('groomName', e.detail.value)}
          />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.label}>新娘姓名</Text>
          <Input
            className={styles.input}
            placeholder="请输入新娘姓名"
            value={formData.brideName}
            onInput={(e) => handleInputChange('brideName', e.detail.value)}
          />
        </View>
        <View className={styles.formItem}>
          <Text className={styles.label}>联系电话</Text>
          <Input
            className={styles.input}
            type="number"
            placeholder="请输入联系电话"
            value={formData.phone}
            onInput={(e) => handleInputChange('phone', e.detail.value)}
          />
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>档期设置</Text>
        <View className={styles.formItem} onClick={handleSelectTeam}>
          <Text className={styles.label}>策划团队</Text>
          <Text className={formData.teamId ? styles.input : styles.placeholder}>
            {formData.teamName}
          </Text>
          <Text className={styles.selectArrow}>›</Text>
        </View>

        <View className={styles.switchItem}>
          <Text className={styles.switchLabel}>连订多日</Text>
          <Switch
            checked={formData.isMultiDay}
            onChange={(e) => handleInputChange('isMultiDay', e.detail.value)}
            color="#D4383C"
          />
        </View>

        {formData.isMultiDay ? (
          <View className={styles.formItem}>
            <Text className={styles.label}>档期范围</Text>
            <View className={styles.rangeInput}>
              <View className={styles.dateBox} onClick={() => handleDateSelect('date')}>
                {formData.date || '开始日期'}
              </View>
              <Text className={styles.connector}>至</Text>
              <View className={styles.dateBox} onClick={() => handleDateSelect('endDate')}>
                {formData.endDate || '结束日期'}
              </View>
            </View>
          </View>
        ) : (
          <View className={styles.formItem} onClick={() => handleDateSelect('date')}>
            <Text className={styles.label}>档期日期</Text>
            <Text className={styles.input}>{formData.date}</Text>
            <Text className={styles.selectArrow}>›</Text>
          </View>
        )}

        <View className={styles.formItem}>
          <Text className={styles.label}>服务时间</Text>
          <Text className={styles.input}>
            {formData.startTime} - {formData.endTime}
          </Text>
          <Text className={styles.selectArrow}>›</Text>
        </View>
      </View>

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>费用信息</Text>
        <View className={styles.formItem}>
          <Text className={styles.label}>总金额</Text>
          <Input
            className={styles.input}
            type="digit"
            placeholder="请输入总金额"
            value={formData.amount}
            onInput={(e) => handleInputChange('amount', e.detail.value)}
          />
          <Text className={styles.label}>元</Text>
        </View>
        <View className={styles.formItem}>
          <Text className={styles.label}>定金</Text>
          <Input
            className={styles.input}
            type="digit"
            placeholder="请输入定金金额"
            value={formData.deposit}
            onInput={(e) => handleInputChange('deposit', e.detail.value)}
          />
          <Text className={styles.label}>元</Text>
        </View>
        <View className={styles.formItem}>
          <Text className={styles.label}>备注</Text>
          <Input
            className={styles.input}
            placeholder="选填"
            value={formData.remark}
            onInput={(e) => handleInputChange('remark', e.detail.value)}
          />
        </View>
      </View>

      <View style={{ height: 40 }} />

      <View className={styles.actionBar + ' safe-area-bottom'}>
        <View className={[styles.btn, styles.btnSecondary].join(' ')} onClick={handleReset}>
          重置
        </View>
        <View className={[styles.btn, styles.btnPrimary].join(' ')} onClick={handleSubmit}>
          创建档期
        </View>
      </View>
    </ScrollView>
  );
};

export default ScheduleCreatePage;
