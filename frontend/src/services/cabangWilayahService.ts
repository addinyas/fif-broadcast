import api from './api';

export interface WilayahItem {
  kabupaten_kota: string;
  kecamatan: string;
  kelurahan: string | null;
}

export interface CabangWithWilayah {
  cabang_id: string;
  cabang_name: string;
  kios: { kios_id: string; kios_name: string; cabang_id: string }[];
  wilayah: (WilayahItem & {
    id: number;
    cabang_id: string;
    created_at: string;
    updated_at: string;
  })[];
}

export const cabangWilayahService = {
  async getAll(): Promise<{ data: CabangWithWilayah[] }> {
    const { data } = await api.get('/cabang-wilayah');
    return data;
  },

  async update(cabangId: string, payload: { wilayah: WilayahItem[]; replace?: boolean }): Promise<{ message: string; data: WilayahItem[] }> {
    const { data } = await api.put(`/cabang-wilayah/${cabangId}`, payload);
    return data;
  },
};
