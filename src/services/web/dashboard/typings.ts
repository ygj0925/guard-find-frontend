export interface DashboardNoticeResp {
  id: number;
  title: string;
  type: number;
  isTop: boolean;
}

export interface DashboardAccessTrendResp {
  date: string;
  pvCount: number;
  ipCount: number;
}

export interface DashboardChartCommonResp {
  name: string;
  value: number;
}

export interface DashboardOverviewCommonResp {
  total: number;
  today: number;
  growth: number;
  dataList: DashboardChartCommonResp[];
}
