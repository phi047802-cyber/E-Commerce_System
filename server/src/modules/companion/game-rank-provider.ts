export interface RankVerificationResult {
  verified: boolean;
  provider_status: 'VERIFIED_MOCK' | 'MISMATCH' | 'PROVIDER_UNAVAILABLE';
  declared_tier_id: string;
  actual_tier_id?: string;
  provider_name: string;
  is_simulated: boolean;
  note: string;
  verified_at: string;
}

export interface GameRankProvider {
  verifyRank(gameAccountId: string, gameId: string, declaredTierId: string): Promise<RankVerificationResult>;
}

export class MockGameRankProvider implements GameRankProvider {
  private simulateUnavailable = false;

  setSimulateUnavailable(value: boolean) {
    this.simulateUnavailable = value;
  }

  isSimulateUnavailable(): boolean {
    return this.simulateUnavailable;
  }

  async verifyRank(gameAccountId: string, gameId: string, declaredTierId: string): Promise<RankVerificationResult> {
    const verifiedAt = new Date().toISOString();

    // UC02 Luồng ngoại lệ 2: Game API không phản hồi / lỗi nhà cung cấp bên ngoài
    if (
      this.simulateUnavailable ||
      gameAccountId?.toLowerCase().includes('error') ||
      gameAccountId?.toLowerCase().includes('timeout') ||
      gameAccountId?.toLowerCase().includes('unavailable')
    ) {
      return {
        verified: false,
        provider_status: 'PROVIDER_UNAVAILABLE',
        declared_tier_id: declaredTierId,
        provider_name: 'MockGameRankProvider (External Game API)',
        is_simulated: true,
        note: 'Hệ thống đối chiếu rank bên thứ ba không phản hồi. Hiển thị mức xếp hạng theo khai báo của Companion.',
        verified_at: verifiedAt,
      };
    }

    if (gameAccountId?.toLowerCase().includes('mismatch')) {
      return {
        verified: false,
        provider_status: 'MISMATCH',
        declared_tier_id: declaredTierId,
        actual_tier_id: 'TIER_UNMATCHED',
        provider_name: 'MockGameRankProvider (External Game API)',
        is_simulated: true,
        note: 'Mức xếp hạng thực tế không khớp với khai báo của Companion.',
        verified_at: verifiedAt,
      };
    }

    // Luồng chuẩn: Đã đối chiếu (mô phỏng)
    return {
      verified: true,
      provider_status: 'VERIFIED_MOCK',
      declared_tier_id: declaredTierId,
      actual_tier_id: declaredTierId,
      provider_name: 'MockGameRankProvider (External Game API)',
      is_simulated: true,
      note: 'Đã đối chiếu (mô phỏng)',
      verified_at: verifiedAt,
    };
  }
}

export const mockGameRankProvider = new MockGameRankProvider();
