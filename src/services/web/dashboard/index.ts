import { request } from 'umi';
import type { R } from '@/typings';
import type {
  DashboardAccessTrendResp,
  DashboardChartCommonResp,
  DashboardNoticeResp,
  DashboardOverviewCommonResp,
} from './typings';

export async function listDashboardNotice() {
  return request<R<DashboardNoticeResp[]>>('dashboard/notice', {
    method: 'GET',
  });
}

export async function getDashboardOverviewPv() {
  return request<R<DashboardOverviewCommonResp>>(
    'dashboard/analysis/overview/pv',
    { method: 'GET' },
  );
}

export async function getDashboardOverviewIp() {
  return request<R<DashboardOverviewCommonResp>>(
    'dashboard/analysis/overview/ip',
    { method: 'GET' },
  );
}

export async function getAnalysisGeo() {
  return request<R<DashboardChartCommonResp[]>>('dashboard/analysis/geo', {
    method: 'GET',
  });
}

export async function getDashboardAccessTrend(days: number) {
  return request<R<DashboardAccessTrendResp[]>>(
    `dashboard/access/trend/${days}`,
    { method: 'GET' },
  );
}

export async function getAnalysisTimeslot() {
  return request<R<DashboardChartCommonResp[]>>(
    'dashboard/analysis/timeslot',
    { method: 'GET' },
  );
}

export async function getAnalysisModule() {
  return request<R<DashboardChartCommonResp[]>>('dashboard/analysis/module', {
    method: 'GET',
  });
}

export async function getAnalysisOs() {
  return request<R<DashboardChartCommonResp[]>>('dashboard/analysis/os', {
    method: 'GET',
  });
}

export async function getAnalysisBrowser() {
  return request<R<DashboardChartCommonResp[]>>('dashboard/analysis/browser', {
    method: 'GET',
  });
}
