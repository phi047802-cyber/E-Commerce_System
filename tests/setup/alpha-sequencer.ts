import { BaseSequencer, type TestSpecification } from 'vitest/node';

/**
 * Thứ tự file cố định theo tên (unit → integration theo alphabet). Một số test cũ phụ thuộc trạng thái seed
 * (ví dụ số dư Renter 1 = 500.000 đ) nên thứ tự thay đổi giữa các lần chạy làm kết quả không tái lập (D41).
 */
export default class AlphaSequencer extends BaseSequencer {
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    return [...files].sort((a, b) => a.moduleId.localeCompare(b.moduleId));
  }
}
