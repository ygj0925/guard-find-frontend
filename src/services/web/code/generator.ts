import type { PageResult, QueryParam, R } from '@/typings';
import { request } from 'umi';
import type {
  CodePreviewVo,
  GeneratorFieldDto,
  GeneratorFieldVo,
  GeneratorTableDto,
  GeneratorTableVo,
} from './typings';

export async function queryTables(body: QueryParam<{ tableName?: string }>) {
  return request<R<PageResult<GeneratorTableVo>>>('code/generator', {
    method: 'GET',
    params: body,
  });
}

export async function getTableConfig(tableName: string) {
  return request<R<GeneratorTableDto>>(`code/generator/${tableName}/config`, {
    method: 'GET',
  });
}

export async function saveTableConfig(tableName: string, data: GeneratorTableDto) {
  return request<R<any>>(`code/generator/${tableName}/config`, {
    method: 'POST',
    data,
  });
}

export async function getFieldConfig(tableName: string) {
  return request<R<GeneratorFieldVo[]>>(`code/generator/${tableName}/field`, {
    method: 'GET',
  });
}

export async function saveFieldConfig(tableName: string, data: GeneratorFieldDto[]) {
  return request<R<any>>(`code/generator/${tableName}/field`, {
    method: 'PUT',
    data,
  });
}

export async function previewCode(tableName: string) {
  return request<R<CodePreviewVo[]>>(`code/generator/${tableName}/preview`, {
    method: 'GET',
  });
}

export async function downloadCode(tableName: string) {
  return request(`code/generator/${tableName}/download`, {
    method: 'GET',
    responseType: 'blob',
  });
}

export async function batchGenerate(data: string[]) {
  return request('code/generator/batch', {
    method: 'POST',
    data,
    responseType: 'blob',
  });
}
