import { Team } from '@/types';

export const mockTeams: Team[] = [
  {
    id: 'team001',
    name: '良缘婚礼策划',
    leader: '张经理',
    phone: '13800138001',
    commissionRate: 70,
    description: '专注高端婚礼策划10年，服务过1000+新人',
    status: 'active',
    createdAt: '2024-01-15'
  },
  {
    id: 'team002',
    name: '浪漫满屋婚礼',
    leader: '李总监',
    phone: '13800138002',
    commissionRate: 65,
    description: '创意婚礼设计，个性化定制服务',
    status: 'active',
    createdAt: '2024-02-20'
  },
  {
    id: 'team003',
    name: '永恒之恋婚礼',
    leader: '王主管',
    phone: '13800138003',
    commissionRate: 75,
    description: '一站式婚礼服务，省心省力',
    status: 'active',
    createdAt: '2024-03-10'
  },
  {
    id: 'team004',
    name: '花嫁喜事策划',
    leader: '赵老师',
    phone: '13800138004',
    commissionRate: 60,
    description: '传统与现代结合，打造难忘婚礼',
    status: 'inactive',
    createdAt: '2024-04-05'
  },
  {
    id: 'team005',
    name: '喜结良缘工作室',
    leader: '陈策划',
    phone: '13800138005',
    commissionRate: 68,
    description: '小而美精品工作室，用心服务每一对新人',
    status: 'active',
    createdAt: '2024-05-18'
  }
];
